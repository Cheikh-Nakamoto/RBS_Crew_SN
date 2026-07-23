package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

// invitationExpiry laisse à l'artiste le temps de relever ses mails, là où une
// réinitialisation de mot de passe classique expire en une heure.
const invitationExpiry = 7 * 24 * time.Hour

// ArtistAccountsService gère le rattachement d'un compte utilisateur à une fiche
// artiste et l'édition de cette fiche par l'artiste lui-même.
//
// Service distinct d'ArtistsService : celui-ci ne connaît ni l'authentification
// ni l'envoi d'e-mails, et il est déjà volumineux.
type ArtistAccountsService struct {
	artistsRepo *repository.ArtistsRepository
	authRepo    *repository.AuthRepository
	mailService *mail.MailService
	artistsSvc  *ArtistsService
	notifier    *NotificationsService
}

func NewArtistAccountsService(
	artistsRepo *repository.ArtistsRepository,
	authRepo *repository.AuthRepository,
	mailService *mail.MailService,
	artistsSvc *ArtistsService,
) *ArtistAccountsService {
	return &ArtistAccountsService{
		artistsRepo: artistsRepo,
		authRepo:    authRepo,
		mailService: mailService,
		artistsSvc:  artistsSvc,
	}
}

func (s *ArtistAccountsService) WithNotifier(n *NotificationsService) *ArtistAccountsService {
	s.notifier = n
	return s
}

// ── Invitation (admin) ───────────────────────────────────────────────────────

// Invite rattache un compte à une fiche artiste et envoie le lien d'activation.
//
// L'état d'invitation n'est pas stocké : il se déduit de Artist.userId et de
// User.emailVerified (aucun compte / invité / actif).
func (s *ArtistAccountsService) Invite(ctx context.Context, artistID, email string) (emailSent bool, appErr *types.AppError) {
	artist, err := s.artistsRepo.GetByID(ctx, artistID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, types.NotFound("Artiste introuvable")
		}
		return false, types.InternalError("Erreur base de données")
	}

	user, err := s.authRepo.GetUserByEmail(ctx, email)
	switch {
	case err == nil:
		// Compte existant : on le rattache. Un client qui devient artiste est un
		// cas normal ; en revanche on ne dégrade jamais un compte privilégié.
		if user.Role == db.UserRoleADMIN || user.Role == db.UserRoleEDITOR {
			return false, types.BadRequest("Ce compte est un compte d'administration — utilisez une autre adresse")
		}
		if user.Role != db.UserRoleARTIST {
			if _, err := s.authRepo.UpdateRole(ctx, user.ID, db.UserRoleARTIST); err != nil {
				slog.Error("artist-accounts: promote to ARTIST failed", "error", err)
				return false, types.InternalError("Impossible de mettre à jour le rôle")
			}
		}
	case errors.Is(err, pgx.ErrNoRows):
		// Mot de passe aléatoire jamais communiqué : le compte reste inutilisable
		// tant que l'invitation n'a pas été acceptée, mais passwordHash est NOT NULL.
		randomPwd := uuid.New().String() + uuid.New().String()
		hash, hErr := bcrypt.GenerateFromPassword([]byte(randomPwd), bcryptCost)
		if hErr != nil {
			return false, types.InternalError("Impossible de provisionner le compte")
		}
		role := db.UserRoleARTIST
		created, cErr := s.authRepo.CreateUserWithRole(ctx, db.CreateUserWithRoleParams{
			ID:           uuid.New().String(),
			Email:        email,
			PasswordHash: string(hash),
			Column7:      role,
		})
		if cErr != nil {
			slog.Error("artist-accounts: create user failed", "error", cErr)
			return false, types.InternalError("Impossible de créer le compte")
		}
		user = created
	default:
		return false, types.InternalError("Erreur base de données")
	}

	if artist.UserId != nil && *artist.UserId != user.ID {
		return false, types.Conflict("Un autre compte est déjà rattaché à cet artiste")
	}
	if _, err := s.artistsRepo.LinkUser(ctx, artistID, user.ID); err != nil {
		slog.Error("artist-accounts: link user failed", "error", err)
		return false, types.InternalError("Impossible de rattacher le compte")
	}

	token := uuid.New().String()
	exp := pgtype.Timestamp{Time: time.Now().Add(invitationExpiry), Valid: true}
	if err := s.authRepo.SetPasswordResetToken(ctx, email, &token, exp); err != nil {
		return false, types.InternalError("Erreur base de données")
	}

	name := artist.Slug
	if translations, tErr := s.artistsRepo.GetTranslations(ctx, artistID); tErr == nil {
		for _, t := range translations {
			if t.Name != "" {
				name = t.Name
				break
			}
		}
	}

	// Le compte est déjà provisionné et rattaché à ce stade : un échec d'envoi
	// ne doit pas se présenter comme un échec total, sinon l'administrateur croit
	// que rien n'a été fait alors que le compte existe. On le remonte comme un
	// succès partiel, à charge pour l'UI de proposer un renvoi.
	if err := s.mailService.SendArtistInvitation(email, token, name); err != nil {
		slog.Error("artist-accounts: invitation email failed", "error", err, "to", email)
		return false, nil
	}
	return true, nil
}

// ── Self-service (artiste) ───────────────────────────────────────────────────

func (s *ArtistAccountsService) resolve(ctx context.Context, userID string) (*db.Artist, *types.AppError) {
	artist, err := s.artistsRepo.GetByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Aucune fiche artiste n'est rattachée à ce compte")
		}
		return nil, types.InternalError("Erreur base de données")
	}
	return artist, nil
}

func (s *ArtistAccountsService) buildResponse(ctx context.Context, artist *db.Artist) (*model.ArtistSelfResponse, *types.AppError) {
	resp := &model.ArtistSelfResponse{
		ID:               artist.ID,
		Slug:             artist.Slug,
		IsPublished:      artist.Status == db.ProductStatusPUBLISHED,
		City:             artist.City,
		Country:          artist.Country,
		Genre:            artist.Genre,
		Nationality:      artist.Nationality,
		AvatarURL:        artist.AvatarUrl,
		FeaturedImageURL: artist.FeaturedImageUrl,
		InstagramUrl:     artist.InstagramUrl,
		FacebookUrl:      artist.FacebookUrl,
		TwitterUrl:       artist.TwitterUrl,
		YoutubeUrl:       artist.YoutubeUrl,
		TiktokUrl:        artist.TiktokUrl,
		WebsiteUrl:       artist.WebsiteUrl,
		SpotifyUrl:       artist.SpotifyUrl,
		SoundcloudUrl:    artist.SoundcloudUrl,
		VideoUrl:         artist.VideoUrl,
		Gallery:          []string{},
		Translations:     []model.ArtistSelfTranslation{},
	}

	if artworks, err := s.artistsRepo.GetArtworks(ctx, artist.ID); err == nil {
		for _, a := range artworks {
			resp.Gallery = append(resp.Gallery, a.ImageUrl)
		}
	}
	if translations, err := s.artistsRepo.GetTranslations(ctx, artist.ID); err == nil {
		for _, t := range translations {
			resp.Translations = append(resp.Translations, model.ArtistSelfTranslation{
				Locale: string(t.Locale),
				Name:   t.Name,
				Bio:    t.Bio,
			})
		}
	}
	return resp, nil
}

func (s *ArtistAccountsService) GetSelf(ctx context.Context, userID string) (*model.ArtistSelfResponse, *types.AppError) {
	artist, appErr := s.resolve(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}
	return s.buildResponse(ctx, artist)
}

// UpdateSelf applique les champs autorisés à la fiche de l'artiste courant.
func (s *ArtistAccountsService) UpdateSelf(ctx context.Context, userID string, in model.ArtistSelfUpdateInput) (*model.ArtistSelfResponse, *types.AppError) {
	artist, appErr := s.resolve(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	// Slug et Status sont explicitement laissés à nil : la requête UpdateArtist
	// les protège par COALESCE(sqlc.narg(...), colonne). C'est la seconde ligne
	// de défense — un champ réservé qui fuiterait dans le DTO resterait sans effet.
	updated, err := s.artistsRepo.Update(ctx, db.UpdateArtistParams{
		ID:               artist.ID,
		Slug:             nil,
		Status:           nil,
		City:             in.City,
		Country:          in.Country,
		Genre:            in.Genre,
		Nationality:      in.Nationality,
		AvatarUrl:        in.AvatarURL,
		FeaturedImageUrl: in.FeaturedImageURL,
		InstagramUrl:     in.InstagramUrl,
		FacebookUrl:      in.FacebookUrl,
		TwitterUrl:       in.TwitterUrl,
		YoutubeUrl:       in.YoutubeUrl,
		TiktokUrl:        in.TiktokUrl,
		WebsiteUrl:       in.WebsiteUrl,
		SpotifyUrl:       in.SpotifyUrl,
		SoundcloudUrl:    in.SoundcloudUrl,
		VideoUrl:         in.VideoUrl,
	})
	if err != nil {
		slog.Error("artist-accounts: update failed", "error", err, "artistId", artist.ID)
		return nil, types.InternalError("Impossible de mettre à jour la fiche")
	}

	for _, t := range in.Translations {
		if err := s.artistsRepo.UpsertTranslation(ctx, db.UpsertArtistTranslationParams{
			ID:       uuid.New().String(),
			ArtistId: artist.ID,
			Locale:   db.Locale(t.Locale),
			Name:     t.Name,
			Bio:      t.Bio,
		}); err != nil {
			slog.Error("artist-accounts: upsert translation failed", "error", err, "locale", t.Locale)
			return nil, types.InternalError("Impossible d'enregistrer la traduction")
		}
	}

	s.invalidateCache(ctx)
	return s.buildResponse(ctx, updated)
}

func (s *ArtistAccountsService) AddArtwork(ctx context.Context, userID string, in model.ArtistArtworkInput) (*model.ArtistSelfResponse, *types.AppError) {
	artist, appErr := s.resolve(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	position := int32(0)
	if in.Position != nil {
		position = *in.Position
	} else if existing, err := s.artistsRepo.GetArtworks(ctx, artist.ID); err == nil {
		position = int32(len(existing))
	}

	if err := s.artistsRepo.AddArtwork(ctx, db.AddArtistArtworkParams{
		ID:       uuid.New().String(),
		ArtistId: artist.ID,
		ImageUrl: in.ImageURL,
		Position: position,
	}); err != nil {
		slog.Error("artist-accounts: add artwork failed", "error", err)
		return nil, types.InternalError("Impossible d'ajouter l'œuvre")
	}

	s.invalidateCache(ctx)
	return s.buildResponse(ctx, artist)
}

// ReplaceArtworks remplace tout le portfolio (utilisé pour le réordonnancement).
func (s *ArtistAccountsService) ReplaceArtworks(ctx context.Context, userID string, urls []string) (*model.ArtistSelfResponse, *types.AppError) {
	artist, appErr := s.resolve(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	if err := s.artistsRepo.ClearArtworks(ctx, artist.ID); err != nil {
		return nil, types.InternalError("Impossible de réinitialiser le portfolio")
	}
	for i, url := range urls {
		if err := s.artistsRepo.AddArtwork(ctx, db.AddArtistArtworkParams{
			ID:       uuid.New().String(),
			ArtistId: artist.ID,
			ImageUrl: url,
			Position: int32(i),
		}); err != nil {
			return nil, types.InternalError("Impossible d'enregistrer le portfolio")
		}
	}

	s.invalidateCache(ctx)
	return s.buildResponse(ctx, artist)
}

func (s *ArtistAccountsService) DeleteArtwork(ctx context.Context, userID, artworkID string) *types.AppError {
	artist, appErr := s.resolve(ctx, userID)
	if appErr != nil {
		return appErr
	}

	// Le prédicat d'appartenance est dans la requête SQL : 0 ligne supprimée
	// signifie que l'œuvre n'existe pas ou appartient à un autre artiste — dans
	// les deux cas la réponse est la même, pour ne rien divulguer.
	rows, err := s.artistsRepo.DeleteArtworkOwned(ctx, artworkID, artist.ID)
	if err != nil {
		return types.InternalError("Impossible de supprimer l'œuvre")
	}
	if rows == 0 {
		return types.NotFound("Œuvre introuvable")
	}

	s.invalidateCache(ctx)
	return nil
}

// invalidateCache purge le cache Redis des artistes : sans cela la page publique
// /crew resterait périmée jusqu'à expiration du TTL.
func (s *ArtistAccountsService) invalidateCache(ctx context.Context) {
	if s.artistsSvc != nil {
		s.artistsSvc.ClearCache(ctx)
	}
}

// ── Demandes « je suis un artiste RBS » ──────────────────────────────────────

// SubmitClaim enregistre l'auto-déclaration d'un client. Elle n'accorde aucun
// privilège : seul un administrateur peut la valider, en rattachant une fiche.
func (s *ArtistAccountsService) SubmitClaim(ctx context.Context, userID string, note *string) *types.AppError {
	if _, err := s.authRepo.SubmitArtistClaim(ctx, userID, note); err != nil {
		slog.Error("artist-claims: submit failed", "error", err, "userId", userID)
		return types.InternalError("Impossible d'enregistrer votre demande")
	}
	return nil
}

// ListClaims renvoie les demandes d'un statut donné (PENDING par défaut).
func (s *ArtistAccountsService) ListClaims(ctx context.Context, status string) ([]model.ArtistClaimResponse, *types.AppError) {
	if status == "" {
		status = "PENDING"
	}
	rows, err := s.authRepo.ListArtistClaims(ctx, db.ArtistClaimStatus(status))
	if err != nil {
		slog.Error("artist-claims: list failed", "error", err)
		return nil, types.InternalError("Erreur base de données")
	}

	out := make([]model.ArtistClaimResponse, 0, len(rows))
	for _, r := range rows {
		claim := model.ArtistClaimResponse{
			UserID:         r.ID,
			Email:          r.Email,
			FirstName:      r.FirstName,
			LastName:       r.LastName,
			Phone:          r.Phone,
			Role:           string(r.Role),
			Status:         string(r.ArtistClaimStatus),
			Note:           r.ArtistClaimNote,
			LinkedArtistID: r.LinkedArtistId,
		}
		if r.ArtistClaimAt.Valid {
			t := r.ArtistClaimAt.Time
			claim.RequestedAt = &t
		}
		out = append(out, claim)
	}
	return out, nil
}

// ApproveClaim valide une demande : rôle ARTIST + rattachement à la fiche
// choisie par l'administrateur. Les deux vont toujours ensemble — un rôle sans
// fiche donnerait un espace artiste vide.
func (s *ArtistAccountsService) ApproveClaim(ctx context.Context, userID, artistID string) *types.AppError {
	artist, err := s.artistsRepo.GetByID(ctx, artistID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return types.NotFound("Fiche artiste introuvable")
		}
		return types.InternalError("Erreur base de données")
	}
	if artist.UserId != nil && *artist.UserId != userID {
		return types.Conflict("Un autre compte est déjà rattaché à cette fiche")
	}

	user, err := s.authRepo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return types.NotFound("Utilisateur introuvable")
		}
		return types.InternalError("Erreur base de données")
	}
	// Ne jamais rétrograder un compte d'administration en ARTIST.
	if user.Role == db.UserRoleADMIN || user.Role == db.UserRoleEDITOR {
		return types.BadRequest("Ce compte est un compte d'administration")
	}

	if _, err := s.authRepo.UpdateRole(ctx, userID, db.UserRoleARTIST); err != nil {
		slog.Error("artist-claims: role update failed", "error", err, "userId", userID)
		return types.InternalError("Impossible d'attribuer le rôle")
	}
	if _, err := s.artistsRepo.LinkUser(ctx, artistID, userID); err != nil {
		slog.Error("artist-claims: link failed", "error", err, "userId", userID)
		return types.InternalError("Impossible de rattacher la fiche")
	}
	if _, err := s.authRepo.SetArtistClaimStatus(ctx, userID, db.ArtistClaimStatus("APPROVED")); err != nil {
		slog.Error("artist-claims: status update failed", "error", err, "userId", userID)
		return types.InternalError("Impossible de clôturer la demande")
	}

	// Volontairement PAS de révocation de sessions ici : contrairement à une
	// rétrogradation (cf. UsersService.UpdateRole), accorder un droit n'a rien
	// d'urgent du point de vue de la sécurité. Le rôle est relu en base à chaque
	// rotation du refresh token, donc l'accès s'ouvre seul en moins de 15 min, et
	// immédiatement si l'artiste rafraîchit sa session depuis son profil.
	// Révoquer le déconnecterait au moment précis où on lui ouvre l'accès.
	s.invalidateCache(ctx)
	if s.notifier != nil {
		s.notifier.Notify(userID, NotificationArtistClaim,
			"Votre demande d'artiste a été approuvée",
			"Votre compte est désormais rattaché à votre fiche. Rendez-vous dans votre espace artiste.",
			"/espace-artiste")
	}
	return nil
}

// RejectClaim refuse une demande sans toucher au rôle ni aux fiches.
func (s *ArtistAccountsService) RejectClaim(ctx context.Context, userID string) *types.AppError {
	if _, err := s.authRepo.SetArtistClaimStatus(ctx, userID, db.ArtistClaimStatus("REJECTED")); err != nil {
		slog.Error("artist-claims: reject failed", "error", err, "userId", userID)
		return types.InternalError("Impossible de refuser la demande")
	}
	if s.notifier != nil {
		s.notifier.Notify(userID, NotificationArtistClaim,
			"Votre demande d'artiste n'a pas été retenue",
			"Contactez l'équipe RBS si vous pensez qu'il s'agit d'une erreur.",
			"/profile")
	}
	return nil
}

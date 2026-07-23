package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

const (
	bcryptCost    = 12
	accessExpiry  = 15 * time.Minute
	refreshExpiry = 7 * 24 * time.Hour
	resetExpiry   = 1 * time.Hour

	// refreshGrace est la fenêtre pendant laquelle un refresh token déjà consommé
	// reste rejouable. Sans elle, deux requêtes concurrentes présentant le même
	// token — cas courant côté Next.js, où un seul rendu déclenche plusieurs
	// appels auth() — se déconnecteraient mutuellement. 30 s est le défaut retenu
	// par les serveurs d'autorisation qui exposent ce réglage (plage usuelle
	// 0–60 s) : assez pour absorber la concurrence et un réseau lent, assez court
	// pour ne pas élargir la fenêtre d'exploitation d'un token volé.
	refreshGrace = 30 * time.Second

	// absoluteSession borne la durée de vie totale d'une session, quelle que soit
	// l'activité. `expiresAt` étant repoussé à chaque rotation, c'est la seule
	// chose qui garantit une ré-authentification périodique.
	absoluteSession = 30 * 24 * time.Hour

	// Préfixes des clés Redis de la rotation.
	//
	// rotatedKeyPrefix mémorise le couple ÉMIS en échange d'un jti donné, pour
	// pouvoir le rejouer à l'identique pendant la fenêtre de grâce. Rejouer le
	// même couple (plutôt que d'en émettre un nouveau) évite de créer une session
	// par requête concurrente.
	//
	// consumedKeyPrefix marque un jti comme consommé pour toute la durée de vie
	// du refresh token. Un jti présenté APRÈS la fenêtre de grâce signe une
	// réutilisation : rotation sans détection de réutilisation n'apporte
	// quasiment rien, c'est ce marqueur qui donne sa valeur au dispositif.
	rotatedKeyPrefix  = "auth:rot:"
	consumedKeyPrefix = "auth:used:"

	// Message unique pour tous les refus de refresh. Ne jamais préciser la cause
	// au client : distinguer « session inconnue » de « token réutilisé »
	// renseignerait un attaquant sur l'état du serveur.
	errSessionRevoked = "Session expired or revoked"
)

type AuthService struct {
	repo             *repository.AuthRepository
	mailService      *mail.MailService
	redis            *redis.Client
	jwtSecret        string
	jwtRefreshSecret string
	googleClientID   string
	notifier         *NotificationsService
}

func NewAuthService(repo *repository.AuthRepository, mailService *mail.MailService, redisClient *redis.Client, jwtSecret, jwtRefreshSecret, googleClientID string) *AuthService {
	return &AuthService{
		repo:             repo,
		mailService:      mailService,
		redis:            redisClient,
		jwtSecret:        jwtSecret,
		jwtRefreshSecret: jwtRefreshSecret,
		googleClientID:   googleClientID,
	}
}

func (s *AuthService) WithNotifier(n *NotificationsService) *AuthService {
	s.notifier = n
	return s
}

// ── Register ─────────────────────────────────────────────────────────────────

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, *types.AppError) {
	_, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err == nil {
		return nil, types.Conflict("Email already in use")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		slog.Error("auth: GetUserByEmail failed", "error", err)
		return nil, types.InternalError("Database error")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, types.InternalError("Failed to hash password")
	}

	params := db.CreateUserParams{
		ID:           uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hash),
	}
	if req.FirstName != nil {
		params.FirstName = req.FirstName
	}
	if req.LastName != nil {
		params.LastName = req.LastName
	}
	if req.Phone != nil {
		params.Phone = req.Phone
	}

	user, err := s.repo.CreateUser(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to create user")
	}

	// Case « es-tu un artiste de RBS ? » : on enregistre une simple demande.
	// Le compte reste un compte client tant qu'un administrateur ne l'a pas
	// validée en le rattachant à une fiche artiste. Un échec ici ne doit pas
	// faire échouer l'inscription : l'utilisateur pourra redemander depuis son
	// profil.
	if req.IsArtist {
		if _, claimErr := s.repo.SubmitArtistClaim(ctx, user.ID, nil); claimErr != nil {
			slog.Warn("auth: artist claim at registration failed", "error", claimErr, "userId", user.ID)
		}
	}

	// Send email verification asynchronously — do not block registration on mail failure
	verificationToken := uuid.New().String()
	exp := pgtype.Timestamp{Time: time.Now().Add(24 * time.Hour), Valid: true}
	if err := s.repo.SetEmailVerificationToken(ctx, user.ID, &verificationToken, exp); err == nil {
		_ = s.mailService.SendEmailVerification(user.Email, verificationToken)
	}

	tokens, appErr := s.issueTokens(ctx, user.ID, user.Email, string(user.Role), time.Now())
	if appErr != nil {
		return nil, appErr
	}

	return &model.AuthResponse{
		User:         *toUserResponse(user),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	}, nil
}

// ── Login ─────────────────────────────────────────────────────────────────────

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (*model.TokenPair, *types.AppError) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, types.Unauthorized("Invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, types.Unauthorized("Invalid credentials")
	}

	return s.issueTokens(ctx, user.ID, user.Email, string(user.Role), time.Now())
}

// ── Refresh ───────────────────────────────────────────────────────────────────

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*model.TokenPair, *types.AppError) {
	claims := &types.JWTClaims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(s.jwtRefreshSecret), nil
	},
		jwt.WithIssuer(types.JWTIssuer),
		jwt.WithAudience(types.JWTAudience),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return nil, types.Unauthorized("Invalid refresh token")
	}

	jti := claims.ID
	if jti == "" {
		// Token émis avant l'introduction du jti : plus rejouable de façon sûre.
		return nil, types.Unauthorized(errSessionRevoked)
	}

	// ── 1. Rejeu à l'intérieur de la fenêtre de grâce ────────────────────────
	// Une rotation déjà effectuée pour ce jti : on renvoie le couple ÉMIS à ce
	// moment-là, à l'identique. Les requêtes concurrentes convergent ainsi sur
	// les mêmes tokens au lieu d'en créer chacune un jeu — et donc une session.
	if cached, err := s.redis.Get(ctx, rotatedKeyPrefix+jti); err == nil && cached != "" {
		var pair model.TokenPair
		if json.Unmarshal([]byte(cached), &pair) == nil {
			return &pair, nil
		}
	}

	// ── 2. Détection de réutilisation ────────────────────────────────────────
	// Le marqueur survit à la fenêtre de grâce, pour toute la durée de vie du
	// refresh token. S'il est déjà posé alors que l'étape 1 n'a rien trouvé,
	// c'est que ce jti a été consommé il y a plus de `refreshGrace` : rejeu
	// tardif, donc token compromis. On révoque toute la famille — c'est ce qui
	// distingue une vraie rotation d'un simple renouvellement.
	fresh, err := s.redis.SetNX(ctx, consumedKeyPrefix+jti, "1", refreshExpiry)
	if err != nil {
		return nil, types.InternalError("Session store unavailable")
	}
	if !fresh {
		slog.Warn("auth: refresh token reuse detected, revoking all sessions",
			"userId", claims.Subject, "jti", jti)
		if dErr := s.repo.DeleteUserSessions(ctx, claims.Subject); dErr != nil {
			slog.Error("auth: failed to revoke sessions after reuse", "error", dErr, "userId", claims.Subject)
		}
		return nil, types.Unauthorized(errSessionRevoked)
	}

	// ── 3. Délai d'expiration absolu ─────────────────────────────────────────
	// Contrôlé AVANT la recherche de la session : `expiresAt` est lui-même
	// plafonné à cette limite, donc la ligne aura déjà disparu au moment où le
	// délai est dépassé. Trancher ici sur les seules claims du token permet de
	// répondre « ré-authentifiez-vous » plutôt que le message générique de
	// session révoquée — l'utilisateur n'a rien fait de mal.
	authTime := time.Unix(claims.AuthTime, 0)
	if claims.AuthTime != 0 && time.Since(authTime) > absoluteSession {
		return nil, types.UnauthorizedWithCode("Session expired, please sign in again", "session_max_age")
	}

	// ── 4. La session doit exister et ne pas avoir été révoquée ──────────────
	session, err := s.repo.GetSessionByTokenHash(ctx, hashRefreshToken(refreshToken))
	if err != nil {
		return nil, types.Unauthorized(errSessionRevoked)
	}

	if claims.AuthTime == 0 {
		// Token émis avant l'introduction de auth_time : la création de la
		// session sert d'origine, plutôt que de rejeter des sessions valides au
		// moment du déploiement.
		authTime = session.CreatedAt.Time
		if time.Since(authTime) > absoluteSession {
			_ = s.repo.DeleteSession(ctx, session.ID)
			return nil, types.UnauthorizedWithCode("Session expired, please sign in again", "session_max_age")
		}
	}

	// ── 5. Rôle et identité relus en base ────────────────────────────────────
	// Les claims du token portent le rôle tel qu'il était à l'émission. Les
	// recopier ferait vivre une promotion — ou une rétrogradation ignorée —
	// indéfiniment, de rotation en rotation.
	user, err := s.repo.GetUserByID(ctx, claims.Subject)
	if err != nil {
		return nil, types.Unauthorized(errSessionRevoked)
	}

	pair, appErr := s.issueTokens(ctx, user.ID, user.Email, string(user.Role), authTime)
	if appErr != nil {
		return nil, appErr
	}

	// L'ancienne session disparaît : le couple qui vient d'être émis la remplace.
	// La fenêtre de grâce repose désormais sur le seul cache Redis.
	if dErr := s.repo.DeleteSession(ctx, session.ID); dErr != nil {
		slog.Warn("auth: failed to delete rotated session", "error", dErr, "sessionId", session.ID)
	}

	if encoded, mErr := json.Marshal(pair); mErr == nil {
		if sErr := s.redis.Set(ctx, rotatedKeyPrefix+jti, string(encoded), refreshGrace); sErr != nil {
			slog.Warn("auth: failed to cache rotated token pair", "error", sErr, "jti", jti)
		}
	}

	return pair, nil
}

// ── Logout ────────────────────────────────────────────────────────────────────

func (s *AuthService) Logout(ctx context.Context, userID string) (map[string]string, *types.AppError) {
	if err := s.repo.DeleteUserSessions(ctx, userID); err != nil {
		return nil, types.InternalError("Failed to logout")
	}
	return map[string]string{"message": "Logged out"}, nil
}

// ── Me ────────────────────────────────────────────────────────────────────────

func (s *AuthService) Me(ctx context.Context, userID string) (*model.UserResponse, *types.AppError) {
	row, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Database error")
	}
	return &model.UserResponse{
		ID:              row.ID,
		Email:           row.Email,
		FirstName:       row.FirstName,
		LastName:        row.LastName,
		Role:            string(row.Role),
		PreferredLocale: string(row.PreferredLocale),
		CreatedAt:       row.CreatedAt.Time,
	}, nil
}

// ── Password Reset & Verification ─────────────────────────────────────────────

func (s *AuthService) ForgotPassword(ctx context.Context, email string) *types.AppError {
	_, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		// Do not reveal if user exists to prevent email enumeration
		return nil
	}

	token := uuid.New().String()
	exp := pgtype.Timestamp{Time: time.Now().Add(resetExpiry), Valid: true}

	if err := s.repo.SetPasswordResetToken(ctx, email, &token, exp); err != nil {
		return types.InternalError("Database error")
	}

	if err := s.mailService.SendPasswordReset(email, token); err != nil {
		// Log error, but return success to user
		return nil
	}
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) *types.AppError {
	user, err := s.repo.GetUserByResetToken(ctx, &token)
	if err != nil {
		return types.BadRequest("Invalid or expired reset token")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return types.InternalError("Failed to hash password")
	}

	if err := s.repo.ClearResetToken(ctx, user.ID, string(hash)); err != nil {
		return types.InternalError("Failed to update password")
	}
	_ = s.repo.DeleteUserSessions(ctx, user.ID)

	return nil
}

// GoogleOAuth échange un id_token Google contre un JWT applicatif.
//
// Sans cet échange, une session next-auth ouverte via Google ne porte aucun
// accessToken : tous les appels authentifiés (panier, commandes, profil)
// échouent en 401. La vérification s'appuie sur idtoken.Validate, qui contrôle
// la signature RS256 via le JWKS de Google ainsi que l'émetteur, l'expiration
// et l'audience (notre client ID).
func (s *AuthService) GoogleOAuth(ctx context.Context, idToken string) (*model.TokenPair, *types.AppError) {
	if s.googleClientID == "" {
		return nil, types.InternalError("Google sign-in is not configured")
	}

	payload, err := idtoken.Validate(ctx, idToken, s.googleClientID)
	if err != nil {
		slog.Debug("auth: google id_token validation failed", "error", err)
		return nil, types.Unauthorized("Invalid Google token")
	}

	email, _ := payload.Claims["email"].(string)
	emailVerified, _ := payload.Claims["email_verified"].(bool)
	if email == "" || !emailVerified {
		// Sans adresse vérifiée par Google, accepter la connexion permettrait de
		// prendre le contrôle d'un compte existant en déclarant son adresse.
		return nil, types.Unauthorized("Google account email is not verified")
	}

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			slog.Error("auth: GetUserByEmail failed", "error", err)
			return nil, types.InternalError("Database error")
		}

		// Premier passage : on provisionne le compte. Le mot de passe aléatoire
		// n'est jamais communiqué (passwordHash est NOT NULL) ; l'utilisateur se
		// connectera toujours via Google, ou passera par « mot de passe oublié ».
		randomPwd := uuid.New().String() + uuid.New().String()
		hash, hErr := bcrypt.GenerateFromPassword([]byte(randomPwd), bcryptCost)
		if hErr != nil {
			return nil, types.InternalError("Failed to provision account")
		}

		params := db.CreateUserParams{
			ID:           uuid.New().String(),
			Email:        email,
			PasswordHash: string(hash),
		}
		if v, ok := payload.Claims["given_name"].(string); ok && v != "" {
			params.FirstName = &v
		}
		if v, ok := payload.Claims["family_name"].(string); ok && v != "" {
			params.LastName = &v
		}

		created, cErr := s.repo.CreateUser(ctx, params)
		if cErr != nil {
			slog.Error("auth: create google user failed", "error", cErr)
			return nil, types.InternalError("Failed to create user")
		}
		// Google a déjà vérifié l'adresse.
		if vErr := s.repo.SetEmailVerified(ctx, created.ID); vErr != nil {
			slog.Warn("auth: failed to mark google email as verified", "error", vErr)
		}
		user = created
	}

	return s.issueTokens(ctx, user.ID, user.Email, string(user.Role), time.Now())
}

// AcceptInvitation finalise l'activation d'un compte artiste : l'invitation
// réutilise le jeton de réinitialisation de mot de passe, donc les quatre étapes
// (lecture du jeton, mise à jour du mot de passe, validation de l'e-mail,
// émission des tokens) s'appuient sur l'existant.
//
// L'e-mail est marqué vérifié : cliquer sur le lien reçu prouve que l'artiste
// contrôle bien l'adresse.
// Renvoie aussi l'e-mail du compte : le front en a besoin pour ouvrir la
// session next-auth juste après l'activation.
// AcceptInvitation active un compte invité et renvoie son adresse e-mail.
// Aucune session n'est ouverte ici : voir le commentaire en fin de fonction.
func (s *AuthService) AcceptInvitation(ctx context.Context, token, password string) (string, *types.AppError) {
	user, err := s.repo.GetUserByResetToken(ctx, &token)
	if err != nil {
		return "", types.BadRequest("Lien d'invitation invalide ou expiré")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", types.InternalError("Failed to hash password")
	}
	if err := s.repo.ClearResetToken(ctx, user.ID, string(hash)); err != nil {
		return "", types.InternalError("Failed to update password")
	}
	if !user.EmailVerified {
		if err := s.repo.SetEmailVerified(ctx, user.ID); err != nil {
			slog.Warn("auth: failed to mark invited email as verified", "error", err, "userId", user.ID)
		}
	}

	// Volontairement aucune émission de tokens ici. Le client enchaîne sur un
	// login avec le mot de passe qu'il vient de choisir : une session émise à
	// cet endroit ne serait jamais utilisée, tout en restant valide plusieurs
	// jours. On se contente de confirmer l'adresse à utiliser pour ce login.
	return user.Email, nil
}

// ResendVerification réémet un lien de vérification pour le compte courant.
// Le token d'inscription expire en 24 h : sans ce chemin, un client qui a laissé
// passer le délai serait définitivement incapable de commander.
func (s *AuthService) ResendVerification(ctx context.Context, userID string) *types.AppError {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return types.NotFound("Utilisateur introuvable")
	}
	// Réponse volontairement identique si l'adresse est déjà vérifiée : rien à
	// renvoyer, et aucune raison de le signaler différemment.
	if user.EmailVerified {
		return nil
	}

	token := uuid.New().String()
	exp := pgtype.Timestamp{Time: time.Now().Add(24 * time.Hour), Valid: true}
	if err := s.repo.SetEmailVerificationToken(ctx, user.ID, &token, exp); err != nil {
		return types.InternalError("Erreur base de données")
	}
	// Un échec d'envoi ne doit pas remonter en 500 : le token est déjà posé en
	// base et le client peut relancer (rate limit 3/min). On s'aligne sur Register
	// et ForgotPassword, qui avalent délibérément l'erreur SMTP — une panne
	// transitoire du relais mail ne doit pas casser le parcours utilisateur.
	if err := s.mailService.SendEmailVerification(user.Email, token); err != nil {
		slog.Error("auth: resend verification failed", "error", err, "userId", userID)
	}
	return nil
}

func (s *AuthService) VerifyEmail(ctx context.Context, token string) *types.AppError {
	user, err := s.repo.GetUserByEmailVerificationToken(ctx, &token)
	if err != nil {
		return types.BadRequest("Invalid or expired verification token")
	}
	if user.EmailVerified {
		return nil // idempotent
	}
	if err := s.repo.SetEmailVerified(ctx, user.ID); err != nil {
		return types.InternalError("Failed to verify email")
	}
	// Émis dans la seule branche non-idempotente : ouvrir un lien déjà validé ne
	// doit pas générer une nouvelle notification à chaque clic.
	if s.notifier != nil {
		s.notifier.Notify(user.ID, NotificationEmailVerified,
			"Votre adresse e-mail est confirmée",
			"Vous pouvez désormais passer commande.", "/profile")
	}
	return nil
}

// ── private ───────────────────────────────────────────────────────────────────

// hashRefreshToken produit l'empreinte stockée en base pour un refresh token.
func hashRefreshToken(refreshToken string) string {
	sum := sha256.Sum256([]byte(refreshToken))
	return hex.EncodeToString(sum[:])
}

// issueTokens émet un couple access/refresh et crée la session correspondante.
//
// `authTime` est l'instant de la dernière authentification RÉELLE : à la
// connexion c'est `time.Now()`, lors d'une rotation c'est la valeur reprise du
// token précédent. C'est ce report qui rend le délai d'expiration absolu
// effectif — le recalculer à chaque rotation le viderait de son sens.
func (s *AuthService) issueTokens(ctx context.Context, userID, email, role string, authTime time.Time) (*model.TokenPair, *types.AppError) {
	now := time.Now()

	// Chaque émission porte un jti unique : sans lui, deux tokens signés dans la
	// même seconde pour le même utilisateur seraient des chaînes identiques, ce
	// qui rendrait la rotation du refresh token purement cosmétique.

	accessClaims := types.JWTClaims{
		Email:    email,
		Role:     role,
		AuthTime: authTime.Unix(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    types.JWTIssuer,
			Audience:  jwt.ClaimStrings{types.JWTAudience},
			Subject:   userID,
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessExpiry)),
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, types.InternalError("Failed to sign access token")
	}

	refreshClaims := types.JWTClaims{
		Email:    email,
		Role:     role,
		AuthTime: authTime.Unix(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    types.JWTIssuer,
			Audience:  jwt.ClaimStrings{types.JWTAudience},
			Subject:   userID,
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(refreshExpiry)),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(s.jwtRefreshSecret))
	if err != nil {
		return nil, types.InternalError("Failed to sign refresh token")
	}

	// Empreinte SHA-256 déterministe : elle permet un lookup indexé en O(1)
	// (index unique "UserSession_tokenHash_key"). bcrypt protégerait un secret
	// devinable ; un JWT signé HMAC n'en est pas un, et son coût imposait de
	// comparer séquentiellement toutes les sessions actives.
	tokenHash := hashRefreshToken(refreshToken)

	// La session ne peut pas survivre à la limite absolue : sans ce plafond,
	// chaque rotation repousserait l'échéance et la session deviendrait
	// éternelle.
	sessionExpiry := now.Add(refreshExpiry)
	if deadline := authTime.Add(absoluteSession); sessionExpiry.After(deadline) {
		sessionExpiry = deadline
	}

	sessionParams := db.CreateSessionParams{
		ID:        uuid.New().String(),
		UserId:    userID,
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamp{Time: sessionExpiry, Valid: true},
	}
	if _, err := s.repo.CreateSession(ctx, sessionParams); err != nil {
		return nil, types.InternalError("Failed to create session")
	}

	return &model.TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func toUserResponse(u *db.User) *model.UserResponse {
	return &model.UserResponse{
		ID:              u.ID,
		Email:           u.Email,
		FirstName:       u.FirstName,
		LastName:        u.LastName,
		Role:            string(u.Role),
		PreferredLocale: string(u.PreferredLocale),
		CreatedAt:       u.CreatedAt.Time,
	}
}

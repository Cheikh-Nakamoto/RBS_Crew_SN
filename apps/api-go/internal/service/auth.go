package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
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
)

type AuthService struct {
	repo             *repository.AuthRepository
	mailService      *mail.MailService
	jwtSecret        string
	jwtRefreshSecret string
	googleClientID   string
}

func NewAuthService(repo *repository.AuthRepository, mailService *mail.MailService, jwtSecret, jwtRefreshSecret, googleClientID string) *AuthService {
	return &AuthService{
		repo:             repo,
		mailService:      mailService,
		jwtSecret:        jwtSecret,
		jwtRefreshSecret: jwtRefreshSecret,
		googleClientID:   googleClientID,
	}
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

	// Send email verification asynchronously — do not block registration on mail failure
	verificationToken := uuid.New().String()
	exp := pgtype.Timestamp{Time: time.Now().Add(24 * time.Hour), Valid: true}
	if err := s.repo.SetEmailVerificationToken(ctx, user.ID, &verificationToken, exp); err == nil {
		_ = s.mailService.SendEmailVerification(user.Email, verificationToken)
	}

	tokens, appErr := s.issueTokens(ctx, user.ID, user.Email, string(user.Role))
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

	// Nettoyage : lors d'une reconnexion (saisie manuelle des identifiants),
	// on purge toutes les sessions de cet utilisateur pour éviter l'accumulation
	// (ce qui cause des ralentissements majeurs sur la boucle de Refresh)
	_ = s.repo.DeleteUserSessions(ctx, user.ID)

	return s.issueTokens(ctx, user.ID, user.Email, string(user.Role))
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

	sessions, err := s.repo.GetActiveSessionsByUser(ctx, claims.Subject)
	if err != nil {
		return nil, types.InternalError("Database error")
	}

	// Check if this refresh token matches any stored hash (same as NestJS Promise.any)
	matched := false
	matchedSessionID := ""
	for _, session := range sessions {
		hash := sha256.Sum256([]byte(refreshToken))
		hexHash := hex.EncodeToString(hash[:])
		if bcrypt.CompareHashAndPassword([]byte(session.TokenHash), []byte(hexHash)) == nil {
			matched = true
			matchedSessionID = session.ID
			break
		}
	}
	if !matched {
		return nil, types.Unauthorized("Session expired or revoked")
	}

	// Supprimer l'ancienne session pour ne pas laisser de sessions orphelines (qui causent le lag)
	if matchedSessionID != "" {
		_ = s.repo.DeleteSession(ctx, matchedSessionID)
	}

	return s.issueTokens(ctx, claims.Subject, claims.Email, claims.Role)
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

	return s.issueTokens(ctx, user.ID, user.Email, string(user.Role))
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
func (s *AuthService) AcceptInvitation(ctx context.Context, token, password string) (*model.TokenPair, string, *types.AppError) {
	user, err := s.repo.GetUserByResetToken(ctx, &token)
	if err != nil {
		return nil, "", types.BadRequest("Lien d'invitation invalide ou expiré")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return nil, "", types.InternalError("Failed to hash password")
	}
	if err := s.repo.ClearResetToken(ctx, user.ID, string(hash)); err != nil {
		return nil, "", types.InternalError("Failed to update password")
	}
	if !user.EmailVerified {
		if err := s.repo.SetEmailVerified(ctx, user.ID); err != nil {
			slog.Warn("auth: failed to mark invited email as verified", "error", err, "userId", user.ID)
		}
	}

	tokens, appErr := s.issueTokens(ctx, user.ID, user.Email, string(user.Role))
	if appErr != nil {
		return nil, "", appErr
	}
	return tokens, user.Email, nil
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
	return nil
}

// ── private ───────────────────────────────────────────────────────────────────

func (s *AuthService) issueTokens(ctx context.Context, userID, email, role string) (*model.TokenPair, *types.AppError) {
	now := time.Now()

	// Chaque émission porte un jti unique : sans lui, deux tokens signés dans la
	// même seconde pour le même utilisateur seraient des chaînes identiques, ce
	// qui rendrait la rotation du refresh token purement cosmétique.

	accessClaims := types.JWTClaims{
		Email: email,
		Role:  role,
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
		Email: email,
		Role:  role,
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

	hash := sha256.Sum256([]byte(refreshToken))
	hexHash := hex.EncodeToString(hash[:])
	tokenHash, err := bcrypt.GenerateFromPassword([]byte(hexHash), bcryptCost)
	if err != nil {
		slog.Error("auth: failed to hash refresh token", "error", err)
		return nil, types.InternalError("Failed to hash refresh token")
	}

	sessionParams := db.CreateSessionParams{
		ID:        uuid.New().String(),
		UserId:    userID,
		TokenHash: string(tokenHash),
		ExpiresAt: pgtype.Timestamp{Time: now.Add(refreshExpiry), Valid: true},
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

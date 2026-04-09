package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

const (
	bcryptCost     = 12
	accessExpiry   = 15 * time.Minute
	refreshExpiry  = 7 * 24 * time.Hour
	resetExpiry    = 1 * time.Hour
)

type AuthService struct {
	repo             *repository.AuthRepository
	mailService      *mail.MailService
	jwtSecret        string
	jwtRefreshSecret string
}

func NewAuthService(repo *repository.AuthRepository, mailService *mail.MailService, jwtSecret, jwtRefreshSecret string) *AuthService {
	return &AuthService{
		repo:             repo,
		mailService:      mailService,
		jwtSecret:        jwtSecret,
		jwtRefreshSecret: jwtRefreshSecret,
	}
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email     string  `json:"email"     validate:"required,email"`
	Password  string  `json:"password"  validate:"required,password_strength"`
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
	Phone     *string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type UserResponse struct {
	ID              string    `json:"id"`
	Email           string    `json:"email"`
	FirstName       *string   `json:"firstName"`
	LastName        *string   `json:"lastName"`
	Role            string    `json:"role"`
	PreferredLocale string    `json:"preferredLocale"`
	CreatedAt       time.Time `json:"createdAt"`
}

// ── Register ─────────────────────────────────────────────────────────────────

func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*UserResponse, *types.AppError) {
	_, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err == nil {
		return nil, types.Conflict("Email already in use")
	}
	if !errors.Is(err, pgx.ErrNoRows) {
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

	return toUserResponse(user), nil
}

// ── Login ─────────────────────────────────────────────────────────────────────

func (s *AuthService) Login(ctx context.Context, req LoginRequest) (*TokenPair, *types.AppError) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, types.Unauthorized("Invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, types.Unauthorized("Invalid credentials")
	}

	return s.issueTokens(ctx, user.ID, user.Email, string(user.Role))
}

// ── Refresh ───────────────────────────────────────────────────────────────────

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*TokenPair, *types.AppError) {
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
	for _, session := range sessions {
		if bcrypt.CompareHashAndPassword([]byte(session.TokenHash), []byte(refreshToken)) == nil {
			matched = true
			break
		}
	}
	if !matched {
		return nil, types.Unauthorized("Session expired or revoked")
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

func (s *AuthService) Me(ctx context.Context, userID string) (*UserResponse, *types.AppError) {
	row, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("User not found")
		}
		return nil, types.InternalError("Database error")
	}
	return &UserResponse{
		ID:              row.ID,
		Email:           row.Email,
		FirstName:       row.FirstName,
		LastName:       row.LastName,
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

// ── CheckSession — vérifie le JWT depuis le header Authorization ───────────────

func (s *AuthService) CheckSession(_ context.Context, tokenStr string) map[string]interface{} {
	if tokenStr == "" {
		return map[string]interface{}{"valid": false, "user": nil}
	}
	claims := &types.JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	},
		jwt.WithIssuer(types.JWTIssuer),
		jwt.WithAudience(types.JWTAudience),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return map[string]interface{}{"valid": false, "user": nil}
	}
	return map[string]interface{}{
		"valid": true,
		"user": map[string]string{
			"id":    claims.Subject,
			"email": claims.Email,
			"role":  claims.Role,
		},
	}
}

// ── private ───────────────────────────────────────────────────────────────────

func (s *AuthService) issueTokens(ctx context.Context, userID, email, role string) (*TokenPair, *types.AppError) {
	now := time.Now()

	accessClaims := types.JWTClaims{
		Email: email,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    types.JWTIssuer,
			Audience:  jwt.ClaimStrings{types.JWTAudience},
			Subject:   userID,
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
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(refreshExpiry)),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(s.jwtRefreshSecret))
	if err != nil {
		return nil, types.InternalError("Failed to sign refresh token")
	}

	tokenHash, err := bcrypt.GenerateFromPassword([]byte(refreshToken), bcryptCost)
	if err != nil {
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

	return &TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func toUserResponse(u *db.User) *UserResponse {
	return &UserResponse{
		ID:              u.ID,
		Email:           u.Email,
		FirstName:       u.FirstName,
		LastName:        u.LastName,
		Role:            string(u.Role),
		PreferredLocale: string(u.PreferredLocale),
		CreatedAt:       u.CreatedAt.Time,
	}
}

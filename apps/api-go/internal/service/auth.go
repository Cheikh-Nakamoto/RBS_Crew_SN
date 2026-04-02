package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
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
)

type AuthService struct {
	repo             *repository.AuthRepository
	jwtSecret        string
	jwtRefreshSecret string
}

func NewAuthService(repo *repository.AuthRepository, jwtSecret, jwtRefreshSecret string) *AuthService {
	return &AuthService{repo: repo, jwtSecret: jwtSecret, jwtRefreshSecret: jwtRefreshSecret}
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email     string  `json:"email"     validate:"required,email"`
	Password  string  `json:"password"  validate:"required,min=8"`
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
	})
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
		LastName:        row.LastName,
		Role:            string(row.Role),
		PreferredLocale: string(row.PreferredLocale),
		CreatedAt:       row.CreatedAt.Time,
	}, nil
}

// ── CheckSession stub (same as NestJS) ───────────────────────────────────────

func (s *AuthService) CheckSession(_ context.Context) map[string]interface{} {
	return map[string]interface{}{"valid": false, "user": nil}
}

// ── private ───────────────────────────────────────────────────────────────────

func (s *AuthService) issueTokens(ctx context.Context, userID, email, role string) (*TokenPair, *types.AppError) {
	now := time.Now()

	accessClaims := types.JWTClaims{
		Email: email,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
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

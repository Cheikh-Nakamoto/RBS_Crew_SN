package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func newAuthService(t *testing.T) *AuthService {
	t.Helper()
	pool := getTestPool(t)
	truncateAll(t, pool)
	repo := repository.NewAuthRepository(pool)
	return NewAuthService(repo, mailStub(), "access-secret-for-tests", "refresh-secret-for-tests", "")
}

func mkRegisterReq(email string) model.RegisterRequest {
	return model.RegisterRequest{
		Email:    email,
		Password: "S3cure!Pass",
	}
}

func TestAuthService_Register_CreatesUser_HashesPassword_ReturnsTokens(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	resp, appErr := svc.Register(ctx, mkRegisterReq("hello@rbs.sn"))
	if appErr != nil {
		t.Fatalf("Register failed: %+v", appErr)
	}
	if resp.AccessToken == "" || resp.RefreshToken == "" {
		t.Fatalf("tokens missing: %+v", resp)
	}
	if resp.User.Email != "hello@rbs.sn" {
		t.Fatalf("user email = %q", resp.User.Email)
	}

	// Verify password hash: bcrypt cost 12 stored in DB
	pool := getTestPool(t)
	var hash string
	if err := pool.QueryRow(ctx, `SELECT "passwordHash" FROM "User" WHERE email=$1`, "hello@rbs.sn").
		Scan(&hash); err != nil {
		t.Fatalf("could not fetch hash: %v", err)
	}
	if !strings.HasPrefix(hash, "$2a$12$") && !strings.HasPrefix(hash, "$2b$12$") {
		t.Fatalf("expected bcrypt cost 12 prefix, got %q", hash[:min(len(hash), 8)])
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte("S3cure!Pass")); err != nil {
		t.Fatalf("bcrypt.Compare failed: %v", err)
	}

	// Access token should carry ~15 min expiry
	assertTokenExpiry(t, resp.AccessToken, "access-secret-for-tests", 15*time.Minute)
	// Refresh token should carry ~7 day expiry
	assertTokenExpiry(t, resp.RefreshToken, "refresh-secret-for-tests", 7*24*time.Hour)
}

func TestAuthService_Register_DuplicateEmail_Returns409(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	if _, appErr := svc.Register(ctx, mkRegisterReq("dup@rbs.sn")); appErr != nil {
		t.Fatalf("first register: %+v", appErr)
	}
	_, appErr := svc.Register(ctx, mkRegisterReq("dup@rbs.sn"))
	if appErr == nil {
		t.Fatal("expected conflict, got nil")
	}
	if appErr.StatusCode != 409 {
		t.Fatalf("want 409 Conflict, got %d", appErr.StatusCode)
	}
}

func TestAuthService_Login(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	if _, appErr := svc.Register(ctx, mkRegisterReq("login@rbs.sn")); appErr != nil {
		t.Fatalf("register: %+v", appErr)
	}

	t.Run("correct password", func(t *testing.T) {
		tokens, appErr := svc.Login(ctx, model.LoginRequest{Email: "login@rbs.sn", Password: "S3cure!Pass"})
		if appErr != nil {
			t.Fatalf("login: %+v", appErr)
		}
		if tokens.AccessToken == "" || tokens.RefreshToken == "" {
			t.Fatalf("empty tokens")
		}
	})

	t.Run("wrong password -> 401 Invalid credentials", func(t *testing.T) {
		_, appErr := svc.Login(ctx, model.LoginRequest{Email: "login@rbs.sn", Password: "wrong"})
		if appErr == nil {
			t.Fatal("expected error")
		}
		if appErr.StatusCode != 401 {
			t.Fatalf("want 401, got %d", appErr.StatusCode)
		}
		if !strings.Contains(strings.ToLower(appErr.Message), "invalid credentials") {
			t.Fatalf("message should be generic 'Invalid credentials', got %q", appErr.Message)
		}
	})

	t.Run("unknown email -> same 401 to avoid enumeration", func(t *testing.T) {
		_, appErr := svc.Login(ctx, model.LoginRequest{Email: "ghost@rbs.sn", Password: "whatever"})
		if appErr == nil {
			t.Fatal("expected error")
		}
		if appErr.StatusCode != 401 {
			t.Fatalf("want 401, got %d", appErr.StatusCode)
		}
		if !strings.Contains(strings.ToLower(appErr.Message), "invalid credentials") {
			t.Fatalf("unknown-email response leaks info: %q", appErr.Message)
		}
	})
}

func TestAuthService_Refresh_RotatesToken_InvalidatesOldSession(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	reg, appErr := svc.Register(ctx, mkRegisterReq("refresh@rbs.sn"))
	if appErr != nil {
		t.Fatalf("register: %+v", appErr)
	}
	pool := getTestPool(t)

	// Count sessions before refresh
	var before int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM "UserSession" WHERE "userId"=$1`, reg.User.ID).
		Scan(&before); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if before != 1 {
		t.Fatalf("expected 1 session after register, got %d", before)
	}

	// Perform refresh
	newTokens, appErr := svc.Refresh(ctx, reg.RefreshToken)
	if appErr != nil {
		t.Fatalf("refresh: %+v", appErr)
	}
	if newTokens.RefreshToken == reg.RefreshToken {
		t.Fatalf("refresh token was NOT rotated")
	}

	// Old refresh token should now fail
	if _, appErr := svc.Refresh(ctx, reg.RefreshToken); appErr == nil {
		t.Fatal("expected old refresh token to be rejected after rotation, got success")
	}

	// New refresh token should work once
	if _, appErr := svc.Refresh(ctx, newTokens.RefreshToken); appErr != nil {
		t.Fatalf("second refresh: %+v", appErr)
	}
}

func TestAuthService_Refresh_InvalidToken_Rejected(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	_, appErr := svc.Refresh(ctx, "definitely.not.a.jwt")
	if appErr == nil || appErr.StatusCode != 401 {
		t.Fatalf("want 401 for bogus token, got %+v", appErr)
	}
}

// assertTokenExpiry parses `tokenStr` with `secret` and checks that its exp claim
// is within a small tolerance (30 s) of now + wanted.
func assertTokenExpiry(t *testing.T, tokenStr, secret string, want time.Duration) {
	t.Helper()
	claims := &types.JWTClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(*jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	},
		jwt.WithIssuer(types.JWTIssuer),
		jwt.WithAudience(types.JWTAudience),
	)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if claims.ExpiresAt == nil {
		t.Fatal("no exp claim")
	}
	delta := time.Until(claims.ExpiresAt.Time) - want
	if delta > 30*time.Second || delta < -30*time.Second {
		t.Fatalf("expiry off by %v (token exp=%v, want=%v)", delta, claims.ExpiresAt.Time, want)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

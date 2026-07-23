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
	// La rotation du refresh token s'appuie sur Redis (fenêtre de grâce et
	// détection de réutilisation) : un vrai conteneur est nécessaire.
	return NewAuthService(repo, mailStub(), getTestRedis(t), "access-secret-for-tests", "refresh-secret-for-tests", "")
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

	// Passée la fenêtre de grâce, l'ancien token n'est plus rejouable.
	expireGraceWindow(t, svc, reg.RefreshToken)
	if _, appErr := svc.Refresh(ctx, reg.RefreshToken); appErr == nil {
		t.Fatal("expected old refresh token to be rejected after the grace window, got success")
	}
}

// expireGraceWindow simule l'écoulement de la fenêtre de grâce en supprimant
// l'entrée de rejeu associée au token, sans attendre 30 s réelles.
func expireGraceWindow(t *testing.T, svc *AuthService, refreshToken string) {
	t.Helper()
	claims := &types.JWTClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(refreshToken, claims); err != nil {
		t.Fatalf("parse refresh token: %v", err)
	}
	if err := svc.redis.Delete(context.Background(), rotatedKeyPrefix+claims.ID); err != nil {
		t.Fatalf("clear rotation cache: %v", err)
	}
}

func countSessions(t *testing.T, userID string) int {
	t.Helper()
	var n int
	if err := getTestPool(t).QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "UserSession" WHERE "userId"=$1`, userID).Scan(&n); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	return n
}

// Un seul rendu Next.js déclenche plusieurs appels concurrents avec le MÊME
// refresh token. Ils doivent tous recevoir le même couple, et ne créer qu'une
// session : sinon chaque affichage de page laisserait derrière lui autant de
// refresh tokens valides que de requêtes parallèles.
func TestAuthService_Refresh_WithinGraceWindow_ReplaysSamePair(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	reg, appErr := svc.Register(ctx, mkRegisterReq("grace@rbs.sn"))
	if appErr != nil {
		t.Fatalf("register: %+v", appErr)
	}

	first, appErr := svc.Refresh(ctx, reg.RefreshToken)
	if appErr != nil {
		t.Fatalf("first refresh: %+v", appErr)
	}
	second, appErr := svc.Refresh(ctx, reg.RefreshToken)
	if appErr != nil {
		t.Fatalf("replay within grace window was rejected: %+v", appErr)
	}

	if second.RefreshToken != first.RefreshToken || second.AccessToken != first.AccessToken {
		t.Fatal("replay within the grace window returned a different token pair")
	}
	if n := countSessions(t, reg.User.ID); n != 1 {
		t.Fatalf("expected exactly 1 session after a replayed rotation, got %d", n)
	}
}

// Un token rejoué APRÈS la fenêtre de grâce signe un vol : la rotation seule ne
// protège de rien si la réutilisation n'est pas détectée.
func TestAuthService_Refresh_ReuseAfterGrace_RevokesEverySession(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	reg, appErr := svc.Register(ctx, mkRegisterReq("reuse@rbs.sn"))
	if appErr != nil {
		t.Fatalf("register: %+v", appErr)
	}

	if _, appErr := svc.Refresh(ctx, reg.RefreshToken); appErr != nil {
		t.Fatalf("first refresh: %+v", appErr)
	}
	expireGraceWindow(t, svc, reg.RefreshToken)

	if _, appErr := svc.Refresh(ctx, reg.RefreshToken); appErr == nil || appErr.StatusCode != 401 {
		t.Fatalf("want 401 on late reuse, got %+v", appErr)
	}
	if n := countSessions(t, reg.User.ID); n != 0 {
		t.Fatalf("reuse detection must revoke the whole family, %d session(s) left", n)
	}
}

// Le rôle voyage dans le token : le recopier de rotation en rotation ferait
// survivre indéfiniment les droits d'un compte rétrogradé.
func TestAuthService_Refresh_ReadsRoleFromDatabase(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	reg, appErr := svc.Register(ctx, mkRegisterReq("promoted@rbs.sn"))
	if appErr != nil {
		t.Fatalf("register: %+v", appErr)
	}

	if _, err := getTestPool(t).Exec(ctx,
		`UPDATE "User" SET role='ADMIN'::"UserRole" WHERE id=$1`, reg.User.ID); err != nil {
		t.Fatalf("update role: %v", err)
	}

	tokens, appErr := svc.Refresh(ctx, reg.RefreshToken)
	if appErr != nil {
		t.Fatalf("refresh: %+v", appErr)
	}

	claims := &types.JWTClaims{}
	if _, _, err := jwt.NewParser().ParseUnverified(tokens.AccessToken, claims); err != nil {
		t.Fatalf("parse access token: %v", err)
	}
	if claims.Role != "ADMIN" {
		t.Fatalf("role was copied from the old token instead of the database: got %q", claims.Role)
	}
}

// Sans limite absolue, une session restée active se renouvelle éternellement.
func TestAuthService_Refresh_BeyondAbsoluteLifetime_Rejected(t *testing.T) {
	svc := newAuthService(t)
	ctx := context.Background()

	reg, appErr := svc.Register(ctx, mkRegisterReq("old@rbs.sn"))
	if appErr != nil {
		t.Fatalf("register: %+v", appErr)
	}

	// Session dont l'authentification initiale remonte au-delà de la limite.
	stale, appErr := svc.issueTokens(ctx, reg.User.ID, "old@rbs.sn", "CUSTOMER",
		time.Now().Add(-absoluteSession-time.Hour))
	if appErr != nil {
		t.Fatalf("issueTokens: %+v", appErr)
	}

	_, appErr = svc.Refresh(ctx, stale.RefreshToken)
	if appErr == nil || appErr.StatusCode != 401 {
		t.Fatalf("want 401 past the absolute lifetime, got %+v", appErr)
	}
	if appErr.Code != "session_max_age" {
		t.Fatalf("want code session_max_age so the client can explain why, got %q", appErr.Code)
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

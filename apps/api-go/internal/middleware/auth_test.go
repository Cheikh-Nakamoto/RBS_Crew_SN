package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/golang-jwt/jwt/v5"
)

func withRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, types.CtxUserRole, role)
}

const testJWTSecret = "unit-test-secret-do-not-use-in-prod"

// signToken helper — builds an HS256 JWT that RequireAuth will accept if not tampered with.
func signToken(t *testing.T, secret, sub, email, role string, exp time.Duration) string {
	t.Helper()
	now := time.Now()
	claims := types.JWTClaims{
		Email: email,
		Role:  role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    types.JWTIssuer,
			Audience:  jwt.ClaimStrings{types.JWTAudience},
			Subject:   sub,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(exp)),
		},
	}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return tok
}

// stubHandler returns 204 so we can distinguish "middleware allowed through" from any other outcome.
func stubHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
}

func TestRequireAuth(t *testing.T) {
	tests := []struct {
		name       string
		authHeader string
		wantStatus int
	}{
		{"missing header", "", http.StatusUnauthorized},
		{"malformed header (no Bearer)", "abc", http.StatusUnauthorized},
		{"Bearer with garbage token", "Bearer notajwt", http.StatusUnauthorized},
		{
			"valid token signed with wrong secret",
			"Bearer " + signToken(t, "wrong-secret", "u1", "a@b.c", "CUSTOMER", time.Hour),
			http.StatusUnauthorized,
		},
		{
			"expired token",
			"Bearer " + signToken(t, testJWTSecret, "u1", "a@b.c", "CUSTOMER", -time.Minute),
			http.StatusUnauthorized,
		},
		{
			"valid token",
			"Bearer " + signToken(t, testJWTSecret, "u1", "a@b.c", "CUSTOMER", 15*time.Minute),
			http.StatusNoContent,
		},
	}
	mw := RequireAuth(testJWTSecret)

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/admin/orders", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rec := httptest.NewRecorder()
			mw(stubHandler()).ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d, body=%s", rec.Code, tc.wantStatus, rec.Body.String())
			}
		})
	}
}

func TestRequireAuth_InjectsClaimsIntoContext(t *testing.T) {
	captured := struct {
		userID, email, role string
	}{}
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured.userID, _ = r.Context().Value(types.CtxUserID).(string)
		captured.email, _ = r.Context().Value(types.CtxUserEmail).(string)
		captured.role, _ = r.Context().Value(types.CtxUserRole).(string)
		w.WriteHeader(http.StatusOK)
	})

	mw := RequireAuth(testJWTSecret)
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer "+signToken(t, testJWTSecret, "user-42", "boss@rbs.sn", "ADMIN", 15*time.Minute))
	rec := httptest.NewRecorder()
	mw(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if captured.userID != "user-42" || captured.email != "boss@rbs.sn" || captured.role != "ADMIN" {
		t.Fatalf("claims not injected correctly: %+v", captured)
	}
}

func TestRequireRoles(t *testing.T) {
	tests := []struct {
		name          string
		allowedRoles  []string
		ctxRole       string
		injectRole    bool
		wantStatus    int
	}{
		{"admin only + ADMIN in ctx", []string{"ADMIN"}, "ADMIN", true, http.StatusNoContent},
		{"admin only + CUSTOMER in ctx", []string{"ADMIN"}, "CUSTOMER", true, http.StatusForbidden},
		{"admin or editor + EDITOR in ctx", []string{"ADMIN", "EDITOR"}, "EDITOR", true, http.StatusNoContent},
		{"admin or editor + ADMIN in ctx", []string{"ADMIN", "EDITOR"}, "ADMIN", true, http.StatusNoContent},
		{"admin or editor + CUSTOMER in ctx", []string{"ADMIN", "EDITOR"}, "CUSTOMER", true, http.StatusForbidden},
		{"no role in ctx", []string{"ADMIN"}, "", false, http.StatusForbidden},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/admin/orders", nil)
			if tc.injectRole {
				ctx := req.Context()
				ctx = withRole(ctx, tc.ctxRole)
				req = req.WithContext(ctx)
			}
			rec := httptest.NewRecorder()
			RequireRoles(tc.allowedRoles...)(stubHandler()).ServeHTTP(rec, req)
			if rec.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d, body=%s", rec.Code, tc.wantStatus, rec.Body.String())
			}
		})
	}
}

// TestRequireAuth_Then_RequireRoles composes both middlewares as they're used on /admin/*.
// Ensures a valid non-admin JWT gets 403 (not 401), and an admin JWT is allowed through.
func TestRequireAuth_Then_RequireRoles(t *testing.T) {
	chain := RequireAuth(testJWTSecret)(RequireRoles("ADMIN", "EDITOR")(stubHandler()))

	t.Run("missing JWT -> 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/orders", nil)
		rec := httptest.NewRecorder()
		chain.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("want 401, got %d", rec.Code)
		}
	})

	t.Run("CUSTOMER JWT -> 403", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/orders", nil)
		req.Header.Set("Authorization", "Bearer "+signToken(t, testJWTSecret, "u", "c@x.y", "CUSTOMER", time.Hour))
		rec := httptest.NewRecorder()
		chain.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("want 403, got %d", rec.Code)
		}
	})

	t.Run("ADMIN JWT -> 204", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/orders", nil)
		req.Header.Set("Authorization", "Bearer "+signToken(t, testJWTSecret, "u", "a@x.y", "ADMIN", time.Hour))
		rec := httptest.NewRecorder()
		chain.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("want 204, got %d body=%s", rec.Code, rec.Body.String())
		}
	})

	t.Run("EDITOR JWT -> 204", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/orders", nil)
		req.Header.Set("Authorization", "Bearer "+signToken(t, testJWTSecret, "u", "e@x.y", "EDITOR", time.Hour))
		rec := httptest.NewRecorder()
		chain.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("want 204, got %d body=%s", rec.Code, rec.Body.String())
		}
	})
}

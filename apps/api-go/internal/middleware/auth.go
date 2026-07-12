package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/golang-jwt/jwt/v5"
)

func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				slog.Debug("auth: missing or malformed Authorization header")
				types.WriteError(w, types.Unauthorized("Missing or invalid token"))
				return
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")

			claims := &types.JWTClaims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return []byte(jwtSecret), nil
			},
				jwt.WithIssuer(types.JWTIssuer),
				jwt.WithAudience(types.JWTAudience),
				jwt.WithExpirationRequired(),
			)
			if err != nil || !token.Valid {
				slog.Debug("auth: token validation failed", "error", err)
				types.WriteError(w, types.Unauthorized("Invalid or expired token"))
				return
			}

			// Inject claims into context — mirrors JwtStrategy.validate()
			ctx := context.WithValue(r.Context(), types.CtxUserID, claims.Subject)
			ctx = context.WithValue(ctx, types.CtxUserEmail, claims.Email)
			ctx = context.WithValue(ctx, types.CtxUserRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, _ := r.Context().Value(types.CtxUserRole).(string)
			if !allowed[role] {
				types.WriteError(w, types.Forbidden("Insufficient permissions"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

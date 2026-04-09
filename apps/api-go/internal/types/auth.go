package types

import "github.com/golang-jwt/jwt/v5"

type ContextKey string

const (
	CtxUserID    ContextKey = "userID"
	CtxUserEmail ContextKey = "userEmail"
	CtxUserRole  ContextKey = "userRole"
	CtxLocale    ContextKey = "locale"

	JWTIssuer   = "rbs-api"
	JWTAudience = "rbs-web"
)

type JWTClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

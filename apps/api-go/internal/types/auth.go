package types

import (
	"context"

	"github.com/golang-jwt/jwt/v5"
)

type ContextKey string

const (
	CtxUserID    ContextKey = "userID"
	CtxUserEmail ContextKey = "userEmail"
	CtxUserRole  ContextKey = "userRole"
	CtxLocale    ContextKey = "locale"
	CtxGuestID   ContextKey = "guestID"
	CtxCartOwner ContextKey = "cartOwner"

	JWTIssuer   = "rbs-api"
	JWTAudience = "rbs-web"
)

// CartOwnerKind distingue un panier rattaché à un compte d'un panier anonyme.
type CartOwnerKind string

const (
	OwnerUser  CartOwnerKind = "user"
	OwnerGuest CartOwnerKind = "guest"
)

// CartOwner identifie le propriétaire d'un panier. La distinction user/guest est
// conservée (plutôt qu'un simple identifiant opaque) parce que la fusion à la
// connexion doit manipuler les deux identités simultanément. Le service ne
// réinterprète jamais l'ID : il ne s'en sert que pour construire la clé Redis.
type CartOwner struct {
	Kind CartOwnerKind
	ID   string
}

func (o CartOwner) Valid() bool { return o.ID != "" }

// CartOwnerFrom extrait le propriétaire du panier posé par le middleware CartSession.
func CartOwnerFrom(ctx context.Context) (CartOwner, bool) {
	owner, ok := ctx.Value(CtxCartOwner).(CartOwner)
	return owner, ok && owner.Valid()
}

type JWTClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

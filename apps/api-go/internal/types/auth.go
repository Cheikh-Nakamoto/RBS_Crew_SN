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

// roleRank ordonne les rôles par étendue d'accès. Sert uniquement à décider si
// un changement de rôle RETIRE des droits : une perte doit prendre effet
// immédiatement (révocation des sessions), alors qu'un gain peut attendre la
// prochaine rotation du token — obtenir un droit avec quelques minutes de
// retard n'est pas une faille, le conserver après l'avoir perdu en est une.
var roleRank = map[string]int{
	"CUSTOMER": 0,
	"ARTIST":   1,
	"EDITOR":   2,
	"ADMIN":    3,
}

// RoleLosesPrivileges indique si passer de `from` à `to` réduit les droits.
// Un rôle inconnu est traité comme le moins privilégié, de sorte qu'un passage
// vers un rôle non reconnu soit considéré comme une perte — le choix prudent.
func RoleLosesPrivileges(from, to string) bool {
	return roleRank[to] < roleRank[from]
}

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
	// AuthTime est l'instant de la dernière authentification RÉELLE (login,
	// OAuth, activation d'invitation). Contrairement à IssuedAt, il n'est pas
	// remis à zéro par une rotation de refresh token : c'est lui qui permet
	// d'imposer un délai d'expiration absolu, sans quoi une session resterait
	// renouvelable indéfiniment. Exprimé en secondes Unix.
	AuthTime int64 `json:"auth_time,omitempty"`
	jwt.RegisteredClaims
}

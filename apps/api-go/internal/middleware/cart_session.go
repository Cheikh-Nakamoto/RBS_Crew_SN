package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
)

const (
	// GuestCartCookie identifie un panier anonyme. Le nom est volontairement
	// court et sans information personnelle.
	GuestCartCookie = "rbs_gid"

	// GuestCartCookieSecure est le nom utilisé dès que le site est servi en
	// HTTPS. Le préfixe `__Host-` interdit l'attribut Domain et impose Path=/ et
	// Secure : un sous-domaine compromis ne peut plus poser ni écraser ce
	// cookie. Les navigateurs rejettent un cookie `__Host-` non-Secure, d'où le
	// nom nu conservé en développement.
	GuestCartCookieSecure = "__Host-rbs_gid"

	// guestCookieMaxAge est aligné sur le TTL Redis des paniers invités.
	guestCookieMaxAge = 7 * 24 * 3600

	// guestKeyDomain sépare cryptographiquement la clé dérivée du JWT_SECRET de
	// tout autre usage de ce secret.
	guestKeyDomain = "|rbs-guest-cart-v1"
)

// deriveGuestKey dérive la clé HMAC du cookie invité depuis le secret JWT.
// On évite ainsi d'introduire une variable d'environnement obligatoire
// supplémentaire (qui casserait les déploiements existants) sans réutiliser le
// secret tel quel.
func deriveGuestKey(jwtSecret string) []byte {
	sum := sha256.Sum256([]byte(jwtSecret + guestKeyDomain))
	return sum[:]
}

func signGuestID(key []byte, id string) string {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(id))
	return id + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// parseGuestCookie renvoie l'identifiant invité si la signature est valide.
// Un cookie absent, malformé ou falsifié est traité comme une absence de
// cookie — jamais comme une erreur.
func parseGuestCookie(key []byte, raw string) (string, bool) {
	id, sig, found := strings.Cut(raw, ".")
	if !found || id == "" || sig == "" {
		return "", false
	}
	expected := signGuestID(key, id)
	if !hmac.Equal([]byte(raw), []byte(expected)) {
		return "", false
	}
	return id, true
}

// guestCookieName choisit le nom selon que l'on peut poser le flag Secure.
func guestCookieName(secure bool) string {
	if secure {
		return GuestCartCookieSecure
	}
	return GuestCartCookie
}

// NewGuestCartCookie construit le cookie de session invité.
func NewGuestCartCookie(value string, secure bool) *http.Cookie {
	return &http.Cookie{
		Name:     guestCookieName(secure),
		Value:    value,
		Path:     "/",
		MaxAge:   guestCookieMaxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}
}

// ClearGuestCartCookie construit le cookie d'effacement, posé après la fusion
// du panier invité dans celui d'un compte.
func ClearGuestCartCookie(secure bool) *http.Cookie {
	return &http.Cookie{
		Name:     guestCookieName(secure),
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}
}

// ClearGuestCartCookies efface le cookie invité sous ses deux noms possibles.
// En HTTPS, un visiteur peut encore porter l'ancien nom non préfixé : ne pas
// l'effacer laisserait un cookie orphelin qui redéclenche une tentative de
// fusion à chaque requête.
func ClearGuestCartCookies(secure bool) []*http.Cookie {
	cookies := []*http.Cookie{ClearGuestCartCookie(secure)}
	if secure {
		legacy := *cookies[0]
		legacy.Name = GuestCartCookie
		cookies = append(cookies, &legacy)
	}
	return cookies
}

// CartSession résout le propriétaire du panier sans jamais rejeter la requête :
// utilisateur authentifié (Bearer JWT) ou visiteur identifié par cookie signé.
//
// Le cookie n'est émis que sur les requêtes mutantes : le panier est chargé sur
// toutes les pages du site, poser un cookie sur chaque GET reviendrait à en
// donner un à chaque visiteur et chaque crawler — sans qu'aucun panier
// n'existe. Un identifiant est malgré tout calculé pour les GET afin que le
// handler dispose toujours d'un propriétaire.
func CartSession(jwtSecret string, secure bool) func(http.Handler) http.Handler {
	key := deriveGuestKey(jwtSecret)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			// Les deux noms sont acceptés en lecture : au passage du site en
			// HTTPS, les visiteurs portent encore l'ancien cookie non préfixé et
			// perdraient leur panier si on l'ignorait.
			var guestID string
			for _, name := range []string{guestCookieName(secure), GuestCartCookie} {
				c, err := r.Cookie(name)
				if err != nil {
					continue
				}
				if id, ok := parseGuestCookie(key, c.Value); ok {
					guestID = id
					ctx = context.WithValue(ctx, types.CtxGuestID, guestID)
					break
				}
			}

			var owner types.CartOwner
			if claims, err := parseBearer(r, jwtSecret); err == nil && claims.Subject != "" {
				ctx = context.WithValue(ctx, types.CtxUserID, claims.Subject)
				ctx = context.WithValue(ctx, types.CtxUserEmail, claims.Email)
				ctx = context.WithValue(ctx, types.CtxUserRole, claims.Role)
				owner = types.CartOwner{Kind: types.OwnerUser, ID: claims.Subject}
			} else {
				if guestID == "" {
					guestID = uuid.New().String()
					if r.Method != http.MethodGet && r.Method != http.MethodHead {
						http.SetCookie(w, NewGuestCartCookie(signGuestID(key, guestID), secure))
					}
					ctx = context.WithValue(ctx, types.CtxGuestID, guestID)
				}
				owner = types.CartOwner{Kind: types.OwnerGuest, ID: guestID}
			}

			ctx = context.WithValue(ctx, types.CtxCartOwner, owner)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

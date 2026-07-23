package middleware

import (
	"log/slog"
	"net/http"
	"strings"
)

const corsAllowedHeaders = "Accept, Authorization, Content-Type, X-CSRF-Token, Accept-Language, stripe-signature"
const corsAllowedMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"

// CORS applique la politique d'origines croisées.
//
// `devMode` autorise le joker : renvoyer l'origine reçue AVEC
// `Access-Control-Allow-Credentials: true` revient à faire confiance à
// n'importe quel site, qui peut alors lire le panier d'un visiteur avec son
// cookie. Commode en développement, inacceptable ailleurs — d'où le repli
// silencieux sur la liste explicite hors développement.
func CORS(originList string, devMode bool) func(http.Handler) http.Handler {
	origins := strings.Split(originList, ",")
	allowedOrigins := make(map[string]bool)
	for _, o := range origins {
		allowedOrigins[strings.TrimSpace(o)] = true
	}

	wildcard := allowedOrigins["*"]
	if wildcard && !devMode {
		slog.Warn("cors: CORS_ORIGIN='*' ignoré hors développement — utilisez une liste explicite d'origines")
		wildcard = false
		delete(allowedOrigins, "*")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			switch {
			case wildcard:
				// Joker de développement : on renvoie l'origine exacte pour que
				// les requêtes avec credentials soient acceptées.
				allowOrigin := origin
				if allowOrigin == "" {
					allowOrigin = "*"
				}
				w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
				w.Header().Set("Access-Control-Allow-Methods", corsAllowedMethods)
				w.Header().Set("Access-Control-Allow-Headers", corsAllowedHeaders)
				if allowOrigin != "*" {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}

			case allowedOrigins[origin]:
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", corsAllowedMethods)
				w.Header().Set("Access-Control-Allow-Headers", corsAllowedHeaders)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

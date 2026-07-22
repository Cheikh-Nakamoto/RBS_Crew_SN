package middleware

import (
	"log/slog"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

// EmailNotVerifiedCode identifie précisément ce refus dans la réponse, pour que
// le front distingue « adresse non vérifiée » d'un 403 de permission et propose
// le renvoi du lien plutôt qu'un message générique.
const EmailNotVerifiedCode = "email_not_verified"

// RequireVerifiedEmail refuse la requête tant que l'adresse du compte n'est pas
// vérifiée. À monter uniquement sur les routes qui engagent une transaction
// (création de commande) : le panier, le profil et le renvoi du lien doivent
// rester accessibles, sinon l'utilisateur n'a aucun moyen de se débloquer.
//
// La vérification se fait en base à chaque appel : le JWT ne porte pas cette
// information, et un token émis avant la vérification resterait sinon bloquant
// jusqu'à sa péremption.
//
// À placer APRÈS RequireAuth, dont il consomme types.CtxUserID.
func RequireVerifiedEmail(repo *repository.AuthRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(types.CtxUserID).(string)
			if !ok || userID == "" {
				types.WriteError(w, types.Unauthorized("non authentifié"))
				return
			}

			user, err := repo.GetUserByID(r.Context(), userID)
			if err != nil {
				slog.Error("verified-email: user lookup failed", "error", err, "userId", userID)
				types.WriteError(w, types.InternalError("Erreur base de données"))
				return
			}
			if !user.EmailVerified {
				types.WriteError(w, types.ForbiddenWithCode(
					"Vérifiez votre adresse e-mail avant de passer commande.",
					EmailNotVerifiedCode,
				))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

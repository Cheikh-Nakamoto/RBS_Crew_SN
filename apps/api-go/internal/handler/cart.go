package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/middleware"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type CartHandler struct {
	svc *service.CartService
	// secureCookies reflète l'environnement : le flag Secure ne peut pas être
	// déduit de r.TLS puisque l'API tourne derrière nginx en clair.
	secureCookies bool
}

func NewCartHandler(svc *service.CartService, secureCookies bool) *CartHandler {
	return &CartHandler{svc: svc, secureCookies: secureCookies}
}

// owner résout le propriétaire du panier posé par middleware.CartSession.
//
// Quand la requête porte à la fois un JWT valide et un cookie invité, c'est le
// moment de la fusion : le panier anonyme est versé dans celui du compte, la
// clé invité supprimée et le cookie effacé. C'est le seul déclencheur possible —
// next-auth appelle /auth/login depuis le serveur Next.js, où le cookie du
// navigateur n'est pas attaché.
func (h *CartHandler) owner(w http.ResponseWriter, r *http.Request) (types.CartOwner, bool) {
	o, ok := types.CartOwnerFrom(r.Context())
	if !ok {
		types.WriteError(w, types.InternalError("propriétaire du panier non résolu"))
		return types.CartOwner{}, false
	}

	if o.Kind == types.OwnerUser {
		if guestID, has := r.Context().Value(types.CtxGuestID).(string); has && guestID != "" {
			if _, appErr := h.svc.MergeGuestIntoUser(r.Context(), guestID, o.ID); appErr != nil {
				slog.Warn("cart: guest merge failed", "error", appErr.Message, "userId", o.ID)
			}
			for _, c := range middleware.ClearGuestCartCookies(h.secureCookies) {
				http.SetCookie(w, c)
			}
		}
	}
	return o, true
}

// GET /cart
func (h *CartHandler) Get(w http.ResponseWriter, r *http.Request) {
	o, ok := h.owner(w, r)
	if !ok {
		return
	}
	result, appErr := h.svc.Get(r.Context(), o)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// POST /cart/items
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	o, ok := h.owner(w, r)
	if !ok {
		return
	}
	var dto model.UpsertCartItemDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	result, appErr := h.svc.AddOrUpdateItem(r.Context(), o, dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// PATCH /cart/items/{productId}
func (h *CartHandler) UpdateQuantity(w http.ResponseWriter, r *http.Request) {
	o, ok := h.owner(w, r)
	if !ok {
		return
	}
	productID := chi.URLParam(r, "productId")
	var dto model.UpdateQuantityDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	result, appErr := h.svc.UpdateQuantity(r.Context(), o, productID, dto.Quantity)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// DELETE /cart/items/{productId}
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	o, ok := h.owner(w, r)
	if !ok {
		return
	}
	productID := chi.URLParam(r, "productId")
	result, appErr := h.svc.RemoveItem(r.Context(), o, productID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// DELETE /cart
func (h *CartHandler) Clear(w http.ResponseWriter, r *http.Request) {
	o, ok := h.owner(w, r)
	if !ok {
		return
	}
	if appErr := h.svc.Clear(r.Context(), o); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

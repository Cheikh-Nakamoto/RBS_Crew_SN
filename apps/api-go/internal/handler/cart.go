package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type CartHandler struct{ svc *service.CartService }

func NewCartHandler(svc *service.CartService) *CartHandler { return &CartHandler{svc: svc} }

func (h *CartHandler) userID(r *http.Request) (string, bool) {
	uid, ok := r.Context().Value(types.CtxUserID).(string)
	return uid, ok && uid != ""
}

// GET /cart
func (h *CartHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	result, appErr := h.svc.Get(r.Context(), uid)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// POST /cart/items
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		types.WriteError(w, types.Unauthorized("non authentifié"))
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
	result, appErr := h.svc.AddOrUpdateItem(r.Context(), uid, dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// PATCH /cart/items/{productId}
func (h *CartHandler) UpdateQuantity(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	productID := chi.URLParam(r, "productId")
	var dto model.UpdateQuantityDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	result, appErr := h.svc.UpdateQuantity(r.Context(), uid, productID, dto.Quantity)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// DELETE /cart/items/{productId}
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	productID := chi.URLParam(r, "productId")
	result, appErr := h.svc.RemoveItem(r.Context(), uid, productID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// DELETE /cart
func (h *CartHandler) Clear(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	if appErr := h.svc.Clear(r.Context(), uid); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /cart/sync — merge guest localStorage cart on login
func (h *CartHandler) Sync(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(r)
	if !ok {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	var dto model.SyncCartDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	result, appErr := h.svc.Sync(r.Context(), uid, dto.Items)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

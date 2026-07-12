package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type OrdersHandler struct{ svc *service.OrdersService }

func NewOrdersHandler(svc *service.OrdersService) *OrdersHandler { return &OrdersHandler{svc: svc} }

func (h *OrdersHandler) Create(w http.ResponseWriter, r *http.Request) {
	var dto model.CreateOrderDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		slog.Debug("orders: invalid payload", "error", err)
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		slog.Debug("orders: validation failed", "error", err)
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}

	var userID *string
	if uid, ok := r.Context().Value(types.CtxUserID).(string); ok && uid != "" {
		userID = &uid
	}

	result, appErr := h.svc.Create(r.Context(), dto, userID)
	if appErr != nil {
		slog.Error("orders: create failed", "error", appErr)
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *OrdersHandler) FindAll(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.FindAll(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *OrdersHandler) FindMy(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	q := types.ParsePagination(r)
	result, err := h.svc.FindMy(r.Context(), userID, q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *OrdersHandler) FindOne(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	role, _ := r.Context().Value(types.CtxUserRole).(string)
	result, err := h.svc.FindOne(r.Context(), id, userID, role)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *OrdersHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *OrdersHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status" validate:"required,oneof=PENDING PROCESSING COMPLETED CANCELLED REFUNDED FAILED"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid status: must be one of PENDING, PROCESSING, COMPLETED, CANCELLED, REFUNDED, FAILED"))
		return
	}
	result, err := h.svc.UpdateStatus(r.Context(), id, body.Status)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────
type QuotesHandler struct{ svc *service.QuotesService }

func NewQuotesHandler(svc *service.QuotesService) *QuotesHandler { return &QuotesHandler{svc: svc} }

func (h *QuotesHandler) Create(w http.ResponseWriter, r *http.Request) {
	var dto model.CreateQuoteDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	result, appErr := h.svc.Create(r.Context(), dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *QuotesHandler) FindAll(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.FindAll(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *QuotesHandler) FindOne(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.FindOne(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *QuotesHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status" validate:"required,oneof=NEW IN_REVIEW ANSWERED"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid status: must be one of NEW, IN_REVIEW, ANSWERED"))
		return
	}
	result, appErr := h.svc.UpdateStatus(r.Context(), id, body.Status)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// UpdateShipping sets carrier, tracking number, and shippingMethodId on an order.
// Available to ADMIN and EDITOR (tracking is operational, not money-sensitive).
func (h *OrdersHandler) UpdateShipping(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Carrier          string  `json:"carrier"`
		TrackingNumber   string  `json:"trackingNumber"`
		ShippingMethodID *string `json:"shippingMethodId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	result, appErr := h.svc.UpdateShipping(r.Context(), id, body.Carrier, body.TrackingNumber, body.ShippingMethodID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *QuotesHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.Delete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

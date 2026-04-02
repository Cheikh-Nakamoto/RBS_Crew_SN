package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type OrdersHandler struct{ svc *service.OrdersService }

func NewOrdersHandler(svc *service.OrdersService) *OrdersHandler { return &OrdersHandler{svc: svc} }

func (h *OrdersHandler) Create(w http.ResponseWriter, r *http.Request) {
	var dto service.CreateOrderDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}

	var userID *string
	if uid, ok := r.Context().Value(types.CtxUserID).(string); ok && uid != "" {
		userID = &uid
	}

	result, appErr := h.svc.Create(r.Context(), dto, userID)
	if appErr != nil {
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

func (h *OrdersHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status" validate:"required"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
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
	var dto service.CreateQuoteDTO
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

package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type RefundsHandler struct{ svc *service.RefundsService }

func NewRefundsHandler(svc *service.RefundsService) *RefundsHandler {
	return &RefundsHandler{svc: svc}
}

type createRefundBody struct {
	Amount          float64 `json:"amount" validate:"required,gt=0"`
	Reason          string  `json:"reason" validate:"required,min=3"`
	IdempotencyKey  string  `json:"idempotencyKey" validate:"required"`
}

func (h *RefundsHandler) Create(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	adminID, _ := r.Context().Value(types.CtxUserID).(string)

	var body createRefundBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}

	resp, appErr := h.svc.RequestRefund(r.Context(), orderID, adminID, body.Amount, body.Reason, body.IdempotencyKey)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusAccepted, resp)
}

func (h *RefundsHandler) List(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "id")
	resp, appErr := h.svc.ListByOrderID(r.Context(), orderID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, resp)
}

type markManualBody struct {
	ManualReference  string  `json:"manualReference" validate:"required"`
	JustificationURL *string `json:"justificationUrl"`
}

func (h *RefundsHandler) MarkManualCompleted(w http.ResponseWriter, r *http.Request) {
	refundID := chi.URLParam(r, "refundId")
	adminID, _ := r.Context().Value(types.CtxUserID).(string)

	var body markManualBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}

	resp, appErr := h.svc.MarkManualCompleted(r.Context(), refundID, adminID, body.ManualReference, body.JustificationURL)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, resp)
}

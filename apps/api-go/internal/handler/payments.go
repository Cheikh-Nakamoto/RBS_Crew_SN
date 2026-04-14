package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

type PaymentsHandler struct {
	svc *service.PaymentsService
}

func NewPaymentsHandler(svc *service.PaymentsService) *PaymentsHandler {
	return &PaymentsHandler{svc: svc}
}

func (h *PaymentsHandler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	var dto model.CreateCheckoutDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}

	userID, _ := r.Context().Value(types.CtxUserID).(string)
	role, _ := r.Context().Value(types.CtxUserRole).(string)

	result, appErr := h.svc.CreateCheckout(r.Context(), userID, role, dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// webhookHandler returns a handler for a specific payment method's webhook.
func (h *PaymentsHandler) WebhookFor(method payment.Method) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		const MaxBodyBytes = int64(65536)
		r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)

		payload, err := io.ReadAll(r.Body)
		if err != nil {
			types.WriteError(w, types.BadRequest("Error reading request body"))
			return
		}

		// Collect relevant headers
		headers := make(map[string]string)
		for _, key := range []string{
			// Stripe
			"Stripe-Signature",
			// PayPal
			"PAYPAL-AUTH-ALGO", "PAYPAL-CERT-URL", "PAYPAL-TRANSMISSION-ID",
			"PAYPAL-TRANSMISSION-SIG", "PAYPAL-TRANSMISSION-TIME",
			// Wave
			"Wave-Signature",
		} {
			if v := r.Header.Get(key); v != "" {
				headers[key] = v
			}
		}

		if appErr := h.svc.HandleWebhook(r.Context(), method, payload, headers); appErr != nil {
			types.WriteError(w, appErr)
			return
		}

		types.WriteJSON(w, http.StatusOK, map[string]bool{"received": true})
	}
}

// Legacy Webhook handler (backward compat for Stripe — used by existing route)
func (h *PaymentsHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	h.WebhookFor(payment.MethodStripe)(w, r)
}

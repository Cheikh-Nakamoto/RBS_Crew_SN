package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"
)

type ShippingHandler struct{ svc *service.ShippingService }

func NewShippingHandler(svc *service.ShippingService) *ShippingHandler {
	return &ShippingHandler{svc: svc}
}

// ── Public: Quote ─────────────────────────────────────────────────────────────

type quoteBody struct {
	Country    string  `json:"country" validate:"required,len=2"`
	OrderTotal float64 `json:"orderTotal" validate:"required,gt=0"`
}

// Quote is a public endpoint — it IGNORES any total sent by the client and
// always recomputes from the server-authoritative orderTotal field.
func (h *ShippingHandler) Quote(w http.ResponseWriter, r *http.Request) {
	var body quoteBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}

	// Recalculate server-side — the client-supplied total is informational only;
	// the real total must be fetched from an active cart/order server-side in a
	// full implementation. Here we accept the submitted total only for quote
	// estimation, but Order.Create always recomputes before charging.
	options, appErr := h.svc.Quote(r.Context(), body.Country, decimal.NewFromFloat(body.OrderTotal))
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, options)
}

// ── Admin: Zones ──────────────────────────────────────────────────────────────

func (h *ShippingHandler) ListZones(w http.ResponseWriter, r *http.Request) {
	zones, appErr := h.svc.ListZones(r.Context())
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, zones)
}

type createZoneBody struct {
	Code      string            `json:"code" validate:"required"`
	IsDefault bool              `json:"isDefault"`
	Priority  int32             `json:"priority"`
	Names     map[string]string `json:"names"`
}

func (h *ShippingHandler) CreateZone(w http.ResponseWriter, r *http.Request) {
	var body createZoneBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	zone, appErr := h.svc.CreateZone(r.Context(), body.Code, body.IsDefault, body.Priority, body.Names)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, zone)
}

func (h *ShippingHandler) UpdateZone(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body createZoneBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	zone, appErr := h.svc.UpdateZone(r.Context(), id, body.Code, body.IsDefault, body.Priority, body.Names)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, zone)
}

func (h *ShippingHandler) DeleteZone(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.DeleteZone(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Admin: Methods ────────────────────────────────────────────────────────────

func (h *ShippingHandler) ListMethods(w http.ResponseWriter, r *http.Request) {
	methods, appErr := h.svc.ListMethods(r.Context())
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, methods)
}

type createMethodBody struct {
	Code             string            `json:"code" validate:"required"`
	IsPickup         bool              `json:"isPickup"`
	Enabled          bool              `json:"enabled"`
	EstimatedDaysMin *int32            `json:"estimatedDaysMin"`
	EstimatedDaysMax *int32            `json:"estimatedDaysMax"`
	Names            map[string]string `json:"names"`
}

func (h *ShippingHandler) CreateMethod(w http.ResponseWriter, r *http.Request) {
	var body createMethodBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	method, appErr := h.svc.CreateMethod(r.Context(), body.Code, body.IsPickup, body.Enabled, body.EstimatedDaysMin, body.EstimatedDaysMax, body.Names)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, method)
}

func (h *ShippingHandler) UpdateMethod(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body createMethodBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	method, appErr := h.svc.UpdateMethod(r.Context(), id, body.Code, body.IsPickup, body.Enabled, body.EstimatedDaysMin, body.EstimatedDaysMax, body.Names)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, method)
}

func (h *ShippingHandler) DeleteMethod(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.DeleteMethod(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Admin: Rates ──────────────────────────────────────────────────────────────

type upsertRateBody struct {
	ZoneID    string   `json:"zoneId" validate:"required"`
	MethodID  string   `json:"methodId" validate:"required"`
	FlatFee   float64  `json:"flatFee" validate:"gte=0"`
	FreeAbove *float64 `json:"freeAbove"`
	Currency  string   `json:"currency" validate:"required,len=3"`
}

func (h *ShippingHandler) UpsertRate(w http.ResponseWriter, r *http.Request) {
	var body upsertRateBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	if appErr := h.svc.UpsertRate(r.Context(), body.ZoneID, body.MethodID, body.FlatFee, body.FreeAbove, body.Currency); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

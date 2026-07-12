package handler_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/handler"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/middleware"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/go-chi/chi/v5"
)

// newShippingHandlerNoSvc creates a ShippingHandler backed by a nil-service.
// Only safe for test cases where the service is never reached (body validation failures).
func newShippingHandlerNoSvc() *handler.ShippingHandler {
	return handler.NewShippingHandler(service.NewShippingService(nil))
}

// TestShippingQuote_InvalidJSON verifies the Quote handler returns 400 for malformed JSON.
func TestShippingQuote_InvalidJSON(t *testing.T) {
	h := newShippingHandlerNoSvc()

	req := httptest.NewRequest(http.MethodPost, "/shipping/quote",
		bytes.NewBufferString("not-json"))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Quote(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid JSON, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// TestShippingQuote_MissingCountry verifies the Quote handler returns 400 when country
// is absent.
func TestShippingQuote_MissingCountry(t *testing.T) {
	h := newShippingHandlerNoSvc()

	req := httptest.NewRequest(http.MethodPost, "/shipping/quote",
		bytes.NewBufferString(`{"orderTotal":5000}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Quote(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when country missing, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// TestShippingQuote_CountryTooLong verifies the Quote handler returns 400 when country
// is not exactly 2 characters (validate:"len=2").
func TestShippingQuote_CountryTooLong(t *testing.T) {
	h := newShippingHandlerNoSvc()

	req := httptest.NewRequest(http.MethodPost, "/shipping/quote",
		bytes.NewBufferString(`{"country":"SENEGAL","orderTotal":5000}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Quote(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when country len != 2, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// TestShippingQuote_MissingTotal verifies the Quote handler returns 400 when orderTotal
// is missing or zero (validate:"required,gt=0").
func TestShippingQuote_MissingTotal(t *testing.T) {
	h := newShippingHandlerNoSvc()

	req := httptest.NewRequest(http.MethodPost, "/shipping/quote",
		bytes.NewBufferString(`{"country":"SN"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Quote(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when orderTotal missing, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// ── Admin shipping routes RBAC ────────────────────────────────────────────────

// TestShippingAdmin_EditorForbiddenOnCreate verifies that EDITOR cannot create zones
// (ADMIN-only write routes).
func TestShippingAdmin_EditorForbiddenOnCreate(t *testing.T) {
	h := newShippingHandlerNoSvc()

	r := chi.NewRouter()
	r.With(middleware.RequireRoles("ADMIN")).Post("/admin/shipping/zones", h.CreateZone)

	req := httptest.NewRequest(http.MethodPost, "/admin/shipping/zones",
		bytes.NewBufferString(`{"code":"SN_DAKAR","names":{"fr":"Dakar"}}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(withRoleCtx(req.Context(), "EDITOR"))

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for EDITOR on zone create, got %d", rec.Code)
	}
}

// TestShippingAdmin_AdminForbiddenOnReadWithoutRole verifies that absence of role
// denies access to admin read routes.
func TestShippingAdmin_NoRoleForbiddenOnRead(t *testing.T) {
	h := newShippingHandlerNoSvc()

	r := chi.NewRouter()
	r.With(middleware.RequireRoles("ADMIN", "EDITOR")).Get("/admin/shipping/zones", h.ListZones)

	req := httptest.NewRequest(http.MethodGet, "/admin/shipping/zones", nil)
	// No role in context — should be 403.

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 with no role, got %d", rec.Code)
	}
}

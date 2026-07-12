package handler_test

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/handler"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/middleware"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

// newRefundsHandlerNoSvc creates a RefundsHandler backed by a nil-service.
// Only safe for test cases where the service is never reached (RBAC / validation failures).
func newRefundsHandlerNoSvc() *handler.RefundsHandler {
	return handler.NewRefundsHandler(service.NewRefundsService(nil, nil, nil, nil))
}

func withRoleCtx(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, types.CtxUserRole, role)
}

func withUserIDCtx(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, types.CtxUserID, userID)
}

// TestRefundCreate_EditorForbidden verifies that an EDITOR role is rejected with 403
// on the ADMIN-only refund creation endpoint.
func TestRefundCreate_EditorForbidden(t *testing.T) {
	h := newRefundsHandlerNoSvc()

	r := chi.NewRouter()
	r.With(middleware.RequireRoles("ADMIN")).Post("/admin/orders/{id}/refund", h.Create)

	body := `{"amount":1000,"reason":"test refund","idempotencyKey":"key-editor-1"}`
	req := httptest.NewRequest(http.MethodPost, "/admin/orders/order-123/refund", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(withRoleCtx(req.Context(), "EDITOR"))

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for EDITOR, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// TestRefundCreate_CustomerForbidden verifies that a CUSTOMER role is rejected with 403.
func TestRefundCreate_CustomerForbidden(t *testing.T) {
	h := newRefundsHandlerNoSvc()

	r := chi.NewRouter()
	r.With(middleware.RequireRoles("ADMIN")).Post("/admin/orders/{id}/refund", h.Create)

	req := httptest.NewRequest(http.MethodPost, "/admin/orders/order-123/refund",
		strings.NewReader(`{"amount":1000,"reason":"test","idempotencyKey":"k"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(withRoleCtx(req.Context(), "CUSTOMER"))

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for CUSTOMER, got %d", rec.Code)
	}
}

// TestRefundCreate_NoRole verifies that absence of role in context is rejected with 403.
func TestRefundCreate_NoRole(t *testing.T) {
	h := newRefundsHandlerNoSvc()

	r := chi.NewRouter()
	r.With(middleware.RequireRoles("ADMIN")).Post("/admin/orders/{id}/refund", h.Create)

	req := httptest.NewRequest(http.MethodPost, "/admin/orders/order-123/refund",
		strings.NewReader(`{"amount":1000,"reason":"test","idempotencyKey":"k"}`))
	req.Header.Set("Content-Type", "application/json")
	// No role injected into context.

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 when no role, got %d", rec.Code)
	}
}

// TestRefundCreate_InvalidJSON verifies the handler returns 400 for malformed JSON.
// The service is not called; only the body-decode path is exercised.
func TestRefundCreate_InvalidJSON(t *testing.T) {
	h := newRefundsHandlerNoSvc()

	// Inject ADMIN + userID directly into context so the handler reaches body parsing.
	ctx := withRoleCtx(context.Background(), "ADMIN")
	ctx = withUserIDCtx(ctx, "admin-uuid-1")

	// Build a chi context so chi.URLParam("id") resolves.
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "order-123")
	ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)

	req := httptest.NewRequest(http.MethodPost, "/admin/orders/order-123/refund",
		bytes.NewBufferString("not-json{{"))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	h.Create(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid JSON, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// TestRefundCreate_ValidationFailure verifies the handler returns 400 when required fields
// are missing (amount=0, reason missing, idempotencyKey missing).
func TestRefundCreate_ValidationFailure(t *testing.T) {
	h := newRefundsHandlerNoSvc()

	ctx := withRoleCtx(context.Background(), "ADMIN")
	ctx = withUserIDCtx(ctx, "admin-uuid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "order-123")
	ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)

	// Empty object — amount=0 fails gt=0, reason is missing min=3, idempotencyKey missing.
	req := httptest.NewRequest(http.MethodPost, "/admin/orders/order-123/refund",
		bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	h.Create(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing fields, got %d body=%s", rec.Code, rec.Body.String())
	}
}

// TestMarkManualCompleted_InvalidJSON verifies the MarkManualCompleted handler returns 400.
func TestMarkManualCompleted_InvalidJSON(t *testing.T) {
	h := newRefundsHandlerNoSvc()

	ctx := withRoleCtx(context.Background(), "ADMIN")
	ctx = withUserIDCtx(ctx, "admin-uuid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("refundId", "refund-uuid-1")
	ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)

	req := httptest.NewRequest(http.MethodPost, "/admin/refunds/refund-uuid-1/mark-completed",
		bytes.NewBufferString("bad"))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	h.MarkManualCompleted(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

package service

import (
	"context"
	"testing"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// newOrdersServiceWithShipping builds an OrdersService wired to a ShippingService,
// both sharing the same testcontainer pool.
func newOrdersServiceWithShipping(t *testing.T) (*OrdersService, string /* methodID */) {
	t.Helper()
	pool := getTestPool(t)
	truncateAll(t, pool)
	truncateShipping(t, pool)

	ordersRepo := repository.NewOrdersRepository(pool)
	productsRepo := repository.NewProductsRepository(pool)
	shippingRepo := repository.NewShippingRepository(pool)
	shippingSvc := NewShippingService(shippingRepo)

	// Seed: zone for SN + method + rate (flatFee=2500, freeAbove=50000)
	freeAbove := "50000"
	_, methodID := seedCountryZone(t, pool, "SN", "2500", &freeAbove)

	svc := NewOrdersService(ordersRepo, productsRepo, shippingSvc)
	return svc, methodID
}

// TestOrdersService_Create_ShippingFeeAppliedServerSide verifies that when an order
// is created with a shippingMethodId, the server-computed flatFee (2500 XOF) is applied
// and reflected in the OrderResponse.ShippingAmount — regardless of what the client
// might have sent.
func TestOrdersService_Create_ShippingFeeAppliedServerSide(t *testing.T) {
	svc, methodID := newOrdersServiceWithShipping(t)
	pool := getTestPool(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 10, "5000")
	uid := seedUser(t, pool)

	dto := model.CreateOrderDTO{
		Items:            []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 2}},
		ShippingMethodID: &methodID,
		ShippingCountry:  "SN",
	}
	resp, appErr := svc.Create(ctx, dto, &uid)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}

	// Subtotal = 2 × 5000 = 10000 < freeAbove(50000) → fee = 2500
	expectedSubtotal := decimal.NewFromInt(10000)
	expectedShipping := decimal.NewFromInt(2500)

	if !resp.Subtotal.Equal(expectedSubtotal) {
		t.Errorf("subtotal = %s want %s", resp.Subtotal, expectedSubtotal)
	}
	if !resp.ShippingAmount.Equal(expectedShipping) {
		t.Errorf("shippingAmount = %s want %s (server-computed)", resp.ShippingAmount, expectedShipping)
	}
	t.Logf("✓ server-side shipping applied: subtotal=%s shipping=%s total=%s",
		resp.Subtotal, resp.ShippingAmount, resp.Total)
}

// TestOrdersService_Create_ShippingFreeAbove verifies that when the order subtotal
// meets the freeAbove threshold (50000), the shipping fee is 0.
func TestOrdersService_Create_ShippingFreeAbove(t *testing.T) {
	svc, methodID := newOrdersServiceWithShipping(t)
	pool := getTestPool(t)
	ctx := context.Background()

	// 10 × 5000 = 50000 which equals freeAbove threshold
	pid := seedProduct(t, pool, 20, "5000")
	uid := seedUser(t, pool)

	dto := model.CreateOrderDTO{
		Items:            []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 10}},
		ShippingMethodID: &methodID,
		ShippingCountry:  "SN",
	}
	resp, appErr := svc.Create(ctx, dto, &uid)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}

	if !resp.ShippingAmount.Equal(decimal.Zero) {
		t.Errorf("shippingAmount = %s want 0 (free above threshold)", resp.ShippingAmount)
	}
	t.Logf("✓ free shipping at threshold: subtotal=%s shipping=%s", resp.Subtotal, resp.ShippingAmount)
}

// TestOrdersService_Create_NoShippingMethod verifies that an order without a
// shippingMethodId has shippingAmount = 0 (no fee applied).
func TestOrdersService_Create_NoShippingMethod(t *testing.T) {
	svc, _ := newOrdersServiceWithShipping(t)
	pool := getTestPool(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 5, "3000")
	uid := seedUser(t, pool)

	dto := model.CreateOrderDTO{
		Items: []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 1}},
		// No ShippingMethodID — no shipping fee
	}
	resp, appErr := svc.Create(ctx, dto, &uid)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}
	if !resp.ShippingAmount.Equal(decimal.Zero) {
		t.Errorf("expected 0 shipping without method, got %s", resp.ShippingAmount)
	}
	t.Log("✓ no shipping fee when no method selected")
}

// TestOrdersService_UpdateShipping_SetsCarrierAndTracking verifies the full
// tracking round-trip: create order → admin sets carrier+trackingNumber →
// OrderResponse exposes them alongside shippedAt.
func TestOrdersService_UpdateShipping_SetsCarrierAndTracking(t *testing.T) {
	svc, methodID := newOrdersServiceWithShipping(t)
	pool := getTestPool(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 5, "2000")
	uid := seedUser(t, pool)

	// Create order first
	dto := model.CreateOrderDTO{
		Items:            []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 1}},
		ShippingMethodID: &methodID,
		ShippingCountry:  "SN",
	}
	order, appErr := svc.Create(ctx, dto, &uid)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}

	// Admin sets tracking info
	updated, appErr := svc.UpdateShipping(ctx, order.ID, "DHL", "1Z9999W99999999999", &methodID)
	if appErr != nil {
		t.Fatalf("UpdateShipping: %+v", appErr)
	}

	if updated.ShippingCarrier == nil || *updated.ShippingCarrier != "DHL" {
		t.Errorf("shippingCarrier = %v want DHL", updated.ShippingCarrier)
	}
	if updated.TrackingNumber == nil || *updated.TrackingNumber != "1Z9999W99999999999" {
		t.Errorf("trackingNumber = %v want 1Z9999W99999999999", updated.TrackingNumber)
	}
	if updated.ShippedAt == nil {
		t.Error("shippedAt must be set when trackingNumber is provided")
	}
	if updated.ID != order.ID {
		t.Errorf("id mismatch: got %s want %s", updated.ID, order.ID)
	}
	t.Logf("✓ tracking round-trip: carrier=%s tracking=%s shippedAt=%v",
		*updated.ShippingCarrier, *updated.TrackingNumber, updated.ShippedAt)
}

// TestOrdersService_UpdateShipping_TrackingFieldsInDB verifies that tracking fields
// persisted to DB match what was returned in the response (guards against mapper bugs).
func TestOrdersService_UpdateShipping_TrackingFieldsInDB(t *testing.T) {
	svc, methodID := newOrdersServiceWithShipping(t)
	pool := getTestPool(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 3, "1500")
	uid := seedUser(t, pool)

	order, appErr := svc.Create(ctx, model.CreateOrderDTO{
		Items:            []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 1}},
		ShippingMethodID: &methodID,
		ShippingCountry:  "SN",
	}, &uid)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}

	trackingNum := "TRACK-" + uuid.NewString()[:8]
	_, appErr = svc.UpdateShipping(ctx, order.ID, "Chronopost", trackingNum, nil)
	if appErr != nil {
		t.Fatalf("UpdateShipping: %+v", appErr)
	}

	// Read directly from DB
	var carrier, tracking *string
	var shippedAt *string // scan as string to avoid pgtype complexity in test
	err := pool.QueryRow(ctx,
		`SELECT "shippingCarrier","trackingNumber",to_char("shippedAt",'YYYY-MM-DD') FROM "Order" WHERE id=$1`,
		order.ID,
	).Scan(&carrier, &tracking, &shippedAt)
	if err != nil {
		t.Fatalf("DB query: %v", err)
	}

	if carrier == nil || *carrier != "Chronopost" {
		t.Errorf("DB shippingCarrier = %v want Chronopost", carrier)
	}
	if tracking == nil || *tracking != trackingNum {
		t.Errorf("DB trackingNumber = %v want %s", tracking, trackingNum)
	}
	if shippedAt == nil {
		t.Error("DB shippedAt must be set")
	}
	t.Logf("✓ tracking fields persisted to DB: carrier=%s tracking=%s shippedAt=%s",
		*carrier, *tracking, *shippedAt)
}

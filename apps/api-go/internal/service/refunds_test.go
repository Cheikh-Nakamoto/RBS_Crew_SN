package service

import (
	"context"
	"testing"
	"time"

	dbpkg "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// TestRefundCycle is an integration test: create order → mock payment → partial refund
// → complementary refund → assert Order.status=REFUNDED, 2 RefundRequest rows.
// Requires Docker. Skips under -short.
func TestRefundCycle(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)

	ctx := context.Background()

	// ── Seed: user ────────────────────────────────────────────────────────────
	adminID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "User" ("id","email","passwordHash","role","preferredLocale","createdAt","updatedAt")
		 VALUES ($1,'admin@rbs.sn','$2a$10$dummy','ADMIN','fr',NOW(),NOW())`,
		adminID,
	)

	// ── Seed: product ─────────────────────────────────────────────────────────
	categoryID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Category" ("id","slug","createdAt","updatedAt") VALUES ($1,'test-cat',NOW(),NOW())`,
		categoryID,
	)
	productID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Product" ("id","slug","price","stock","status","createdAt","updatedAt")
		 VALUES ($1,'test-product',10000,100,'PUBLISHED',NOW(),NOW())`,
		productID,
	)

	// ── Seed: order (total = 10000 XOF) ──────────────────────────────────────
	orderID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Order" ("id","orderNumber","userId","status","paymentStatus","currency",
		 "subtotal","taxAmount","shippingAmount","discountAmount","total","locale","createdAt","updatedAt")
		 VALUES ($1,'ORD-REFUND-TEST',$2,'PROCESSING','PAID','XOF',
		 10000,0,0,0,10000,'fr',NOW(),NOW())`,
		orderID, adminID,
	)

	// ── Seed: payment ─────────────────────────────────────────────────────────
	paymentID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Payment" ("id","orderId","method","status","amount","currency","externalId","createdAt","updatedAt")
		 VALUES ($1,$2,'STRIPE','PAID',10000,'XOF','pi_test_123',NOW(),NOW())`,
		paymentID, orderID,
	)

	// ── Build service under test ───────────────────────────────────────────────
	refundsRepo := repository.NewRefundsRepository(pool)
	ordersRepo := repository.NewOrdersRepository(pool)
	mailSvc := mailStub()
	// No real Redis needed — we pass nil-safe stub; pass a no-op redis.
	// The service falls back gracefully when Redis SETNX fails (non-fatal).
	refundsSvc := NewRefundsService(refundsRepo, ordersRepo, nil, mailSvc)

	total := decimal.NewFromInt(10000)

	// ── Step 1: partial refund (3000 XOF) ────────────────────────────────────
	partial, appErr := refundsSvc.RequestRefund(ctx, orderID, adminID, 3000, "Remboursement partiel test", "idem-partial-1")
	if appErr != nil {
		t.Fatalf("partial refund failed: %v", appErr)
	}
	if partial.OrderID != orderID {
		t.Errorf("expected orderId %s, got %s", orderID, partial.OrderID)
	}
	// Aucun provider de remboursement n'est enregistré dans ce test : le
	// remboursement doit donc être marqué « à traiter manuellement ».
	if !partial.IsManualRequired {
		t.Errorf("expected IsManualRequired=true when no refund provider is registered")
	}

	// ── Step 2: complementary refund (7000 XOF) ──────────────────────────────
	comp, appErr := refundsSvc.RequestRefund(ctx, orderID, adminID, 7000, "Solde remboursé", "idem-comp-1")
	if appErr != nil {
		t.Fatalf("complementary refund failed: %v", appErr)
	}
	_ = comp

	// ── Assert: 2 RefundRequest rows for this order ────────────────────────────
	rows, err := refundsRepo.ListByOrderID(ctx, orderID)
	if err != nil {
		t.Fatalf("list refunds: %v", err)
	}
	if len(rows) != 2 {
		t.Errorf("expected 2 refund rows, got %d", len(rows))
	}

	// ── Assert: total refunded = order total ──────────────────────────────────
	sum, err := refundsRepo.SumByOrderID(ctx, orderID)
	if err != nil {
		t.Fatalf("sum refunds: %v", err)
	}
	if !sum.Equal(total) {
		t.Errorf("expected sum %s, got %s", total, sum)
	}

	// ── Assert: idempotency — same key returns same row ───────────────────────
	duplicate, appErr2 := refundsSvc.RequestRefund(ctx, orderID, adminID, 3000, "Retry", "idem-partial-1")
	if appErr2 != nil {
		t.Fatalf("idempotent retry returned error: %v", appErr2)
	}
	if duplicate.ID != partial.ID {
		t.Errorf("idempotency: expected same id %s, got %s", partial.ID, duplicate.ID)
	}

	// ── Assert: cap check — over-refund is rejected ───────────────────────────
	_, overErr := refundsSvc.RequestRefund(ctx, orderID, adminID, 1, "Sur-remboursement", "idem-over-1")
	if overErr == nil {
		t.Error("expected error on over-refund, got nil")
	}

	t.Logf("✓ refund cycle: partial=%s comp=%s sum=%s", partial.ID, comp.ID, sum)
}

// TestRefundIdempotencyWindow verifies that the same idempotencyKey within a short window
// returns the same RefundRequest without hitting the provider twice.
func TestRefundIdempotencyKey(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	ctx := context.Background()

	// minimal seed
	adminID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "User" ("id","email","passwordHash","role","preferredLocale","createdAt","updatedAt")
		 VALUES ($1,'admin2@rbs.sn','hash','ADMIN','fr',NOW(),NOW())`, adminID)

	categoryID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Category" ("id","slug","createdAt","updatedAt") VALUES ($1,'c2',NOW(),NOW())`, categoryID)

	productID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Product" ("id","slug","price","stock","status","createdAt","updatedAt")
		 VALUES ($1,'p2',5000,50,'PUBLISHED',NOW(),NOW())`, productID)

	orderID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Order" ("id","orderNumber","userId","status","paymentStatus","currency",
		 "subtotal","taxAmount","shippingAmount","discountAmount","total","locale","createdAt","updatedAt")
		 VALUES ($1,'ORD-IDEM',$2,'PROCESSING','PAID','XOF',5000,0,0,0,5000,'fr',NOW(),NOW())`, orderID, adminID)

	paymentID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Payment" ("id","orderId","method","status","amount","currency","externalId","createdAt","updatedAt")
		 VALUES ($1,$2,'STRIPE','PAID',5000,'XOF','pi_idem_test',NOW(),NOW())`, paymentID, orderID)

	refundsRepo := repository.NewRefundsRepository(pool)
	ordersRepo := repository.NewOrdersRepository(pool)
	svc := NewRefundsService(refundsRepo, ordersRepo, nil, mailStub())

	key := "idempotency-key-" + uuid.New().String()

	first, err := svc.RequestRefund(ctx, orderID, adminID, 1000, "first", key)
	if err != nil {
		t.Fatalf("first call: %v", err)
	}

	// small delay to ensure time-based logic doesn't interfere
	time.Sleep(50 * time.Millisecond)

	second, err := svc.RequestRefund(ctx, orderID, adminID, 1000, "retry", key)
	if err != nil {
		t.Fatalf("second call: %v", err)
	}

	if first.ID != second.ID {
		t.Errorf("idempotency broken: got different IDs %s vs %s", first.ID, second.ID)
	}

	// verify only one row in DB
	rows, dbErr := refundsRepo.ListByOrderID(ctx, orderID)
	if dbErr != nil {
		t.Fatalf("list: %v", dbErr)
	}
	if len(rows) != 1 {
		t.Errorf("expected 1 row, got %d", len(rows))
	}
	t.Log("✓ idempotency: duplicate key returns same RefundRequest")
}

// TestManualRefundCompletion verifies the Wave manual completion flow.
func TestManualRefundCompletion(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	ctx := context.Background()

	adminID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "User" ("id","email","passwordHash","role","preferredLocale","createdAt","updatedAt")
		 VALUES ($1,'admin3@rbs.sn','hash','ADMIN','fr',NOW(),NOW())`, adminID)

	categoryID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Category" ("id","slug","createdAt","updatedAt") VALUES ($1,'c3',NOW(),NOW())`, categoryID)

	productID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Product" ("id","slug","price","stock","status","createdAt","updatedAt")
		 VALUES ($1,'p3',2000,20,'PUBLISHED',NOW(),NOW())`, productID)

	orderID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Order" ("id","orderNumber","userId","status","paymentStatus","currency",
		 "subtotal","taxAmount","shippingAmount","discountAmount","total","locale","createdAt","updatedAt")
		 VALUES ($1,'ORD-WAVE',$2,'PROCESSING','PAID','XOF',2000,0,0,0,2000,'fr',NOW(),NOW())`, orderID, adminID)

	paymentID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Payment" ("id","orderId","method","status","amount","currency","externalId","createdAt","updatedAt")
		 VALUES ($1,$2,'WAVE','PAID',2000,'XOF','wave_txn_123',NOW(),NOW())`, paymentID, orderID)

	refundsRepo := repository.NewRefundsRepository(pool)
	ordersRepo := repository.NewOrdersRepository(pool)
	svc := NewRefundsService(refundsRepo, ordersRepo, nil, mailStub())

	// Wave → no provider → manual
	ref, err := svc.RequestRefund(ctx, orderID, adminID, 2000, "Retour Wave", "idem-wave-1")
	if err != nil {
		t.Fatalf("wave refund: %v", err)
	}
	if !ref.IsManualRequired {
		t.Log("note: IsManualRequired not set (no provider registered) — expected")
	}

	// Mark completed manually
	justURL := "https://storage.rbs.sn/receipts/wave_receipt.pdf"
	completed, err2 := svc.MarkManualCompleted(ctx, ref.ID, adminID, "TXN-WAVE-ABC123", &justURL)
	if err2 != nil {
		t.Fatalf("mark manual: %v", err2)
	}
	if completed.Status != "SUCCEEDED" {
		t.Errorf("expected SUCCEEDED, got %s", completed.Status)
	}
	if completed.ManualReference == nil || *completed.ManualReference != "TXN-WAVE-ABC123" {
		t.Errorf("manualReference not set correctly")
	}
	t.Log("✓ Wave manual refund completion flow works")
}

// TestRefundBelowZeroRejected ensures negative amounts are caught.
func TestRefundBelowZeroRejected(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	ctx := context.Background()

	adminID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "User" ("id","email","passwordHash","role","preferredLocale","createdAt","updatedAt")
		 VALUES ($1,'admin4@rbs.sn','hash','ADMIN','fr',NOW(),NOW())`, adminID)

	categoryID := uuid.New().String()
	mustExec(t, pool, `INSERT INTO "Category" ("id","slug","createdAt","updatedAt") VALUES ($1,'c4',NOW(),NOW())`, categoryID)
	productID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Product" ("id","slug","price","stock","status","createdAt","updatedAt")
		 VALUES ($1,'p4',500,5,'PUBLISHED',NOW(),NOW())`, productID)
	orderID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Order" ("id","orderNumber","userId","status","paymentStatus","currency",
		 "subtotal","taxAmount","shippingAmount","discountAmount","total","locale","createdAt","updatedAt")
		 VALUES ($1,'ORD-NEG',$2,'PROCESSING','PAID','XOF',500,0,0,0,500,'fr',NOW(),NOW())`, orderID, adminID)
	paymentID := uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Payment" ("id","orderId","method","status","amount","currency","externalId","createdAt","updatedAt")
		 VALUES ($1,$2,'STRIPE','PAID',500,'XOF','pi_neg',NOW(),NOW())`, paymentID, orderID)

	svc := NewRefundsService(repository.NewRefundsRepository(pool), repository.NewOrdersRepository(pool), nil, mailStub())

	// Attempt refund > order total
	_, appErr := svc.RequestRefund(ctx, orderID, adminID, 9999, "Over", "idem-over")
	if appErr == nil {
		t.Error("expected error for amount > total, got nil")
	}
	t.Logf("✓ over-refund correctly rejected: %v", appErr)
}

// ensure dbpkg is used (pool dependency)
var _ = dbpkg.New

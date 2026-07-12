package service

import (
	"context"
	"errors"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
)

// ── fake payment provider ────────────────────────────────────────────────────

type fakeProvider struct {
	method         payment.Method
	verifyErr      error   // set to simulate invalid-signature webhooks
	event          *payment.WebhookEvent
	verifyCalls    int32   // atomic
}

func (p *fakeProvider) Name() payment.Method { return p.method }

func (p *fakeProvider) CreatePayment(_ context.Context, _ payment.OrderInfo, _ payment.CallbackURLs) (*payment.PaymentResult, error) {
	return &payment.PaymentResult{RedirectURL: "https://pay/fake", ExternalID: "ext-fake"}, nil
}

func (p *fakeProvider) VerifyWebhook(_ context.Context, _ []byte, _ http.Header) (*payment.WebhookEvent, error) {
	atomic.AddInt32(&p.verifyCalls, 1)
	if p.verifyErr != nil {
		return nil, p.verifyErr
	}
	// Return a fresh copy so callers can't mutate our fixture.
	if p.event == nil {
		return nil, nil
	}
	e := *p.event
	return &e, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func seedGuestOrder(t *testing.T, pool *pgxpool.Pool, orderID string) {
	t.Helper()
	mustExec(t, pool, `
		INSERT INTO "Order"
			("id","orderNumber","guestEmail","status","paymentStatus","currency",
			 "subtotal","taxAmount","shippingAmount","discountAmount","total","locale",
			 "createdAt","updatedAt")
		VALUES ($1,$2,'buyer@rbs.sn','PENDING','UNPAID','XOF',
			10000,0,0,0,10000,'fr',NOW(),NOW())`,
		orderID, "RBS-TEST-"+orderID[:6],
	)
}

func seedPaymentRow(t *testing.T, pool *pgxpool.Pool, orderID, externalID string) {
	t.Helper()
	mustExec(t, pool, `
		INSERT INTO "Payment"
			("id","orderId","method","externalId","amount","currency","status","createdAt","updatedAt")
		VALUES ($1,$2,'STRIPE',$3,10000,'XOF','UNPAID',NOW(),NOW())`,
		"pay-"+uuid.NewString(), orderID, externalID,
	)
}

// getTestRedis starts (once) a redis testcontainer and returns a *redis.Client (the wrapper).
var (
	sharedRedis     *redis.Client
	sharedRedisErr  error
	sharedRedisOnce testingOnce
)

type testingOnce struct {
	done atomic.Bool
	mu   chan struct{}
	init chan struct{}
}

func getTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	if testing.Short() {
		t.Skip("skipping integration test in -short mode")
	}

	if !sharedRedisOnce.done.Load() {
		// serialize
		if sharedRedisOnce.mu == nil {
			sharedRedisOnce.mu = make(chan struct{}, 1)
			sharedRedisOnce.init = make(chan struct{})
			sharedRedisOnce.mu <- struct{}{}
		}
		select {
		case <-sharedRedisOnce.mu:
			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()
			container, err := tcredis.Run(ctx, "redis:7-alpine")
			if err != nil {
				sharedRedisErr = err
			} else {
				connStr, err := container.ConnectionString(ctx)
				if err != nil {
					sharedRedisErr = err
				} else {
					c, err := redis.NewClient(ctx, connStr)
					if err != nil {
						sharedRedisErr = err
					} else {
						sharedRedis = c
					}
				}
			}
			sharedRedisOnce.done.Store(true)
			close(sharedRedisOnce.init)
		case <-sharedRedisOnce.init:
			// another goroutine finished setup
		}
	}
	<-func() chan struct{} {
		if sharedRedisOnce.init == nil {
			ch := make(chan struct{})
			close(ch)
			return ch
		}
		return sharedRedisOnce.init
	}()

	if sharedRedisErr != nil {
		t.Skipf("redis container unavailable: %v", sharedRedisErr)
	}
	return sharedRedis
}

// ── tests ────────────────────────────────────────────────────────────────────

func TestPaymentsService_Webhook_ValidSignature_UpdatesOrderOnce(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)

	orderID := "ord-" + uuid.NewString()
	seedGuestOrder(t, pool, orderID)
	seedPaymentRow(t, pool, orderID, "ext-1")

	prov := &fakeProvider{
		method: payment.MethodStripe,
		event:  &payment.WebhookEvent{ExternalID: "ext-1", OrderID: orderID, Status: "PAID"},
	}

	ordersRepo := repository.NewOrdersRepository(pool)
	// no redis → still processes
	svc := NewPaymentsService(ordersRepo, nil, prov)

	if appErr := svc.HandleWebhook(context.Background(), payment.MethodStripe, []byte("{}"), map[string]string{}); appErr != nil {
		t.Fatalf("HandleWebhook: %+v", appErr)
	}

	// Order should be PAID + PROCESSING
	var ps db.PaymentStatus
	var st db.OrderStatus
	if err := pool.QueryRow(context.Background(),
		`SELECT "paymentStatus","status" FROM "Order" WHERE id=$1`, orderID).Scan(&ps, &st); err != nil {
		t.Fatalf("query order: %v", err)
	}
	if ps != db.PaymentStatusPAID {
		t.Fatalf("paymentStatus = %s, want PAID", ps)
	}
	if st != db.OrderStatusPROCESSING {
		t.Fatalf("status = %s, want PROCESSING", st)
	}
}

func TestPaymentsService_Webhook_InvalidSignature_Rejected(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)

	prov := &fakeProvider{
		method:    payment.MethodStripe,
		verifyErr: errors.New("bad signature"),
	}
	svc := NewPaymentsService(repository.NewOrdersRepository(pool), nil, prov)

	appErr := svc.HandleWebhook(context.Background(), payment.MethodStripe, []byte("{}"), map[string]string{})
	if appErr == nil {
		t.Fatal("expected error for bad signature")
	}
	if appErr.StatusCode != 400 {
		t.Fatalf("want 400, got %d", appErr.StatusCode)
	}
}

func TestPaymentsService_Webhook_DuplicateEvent_NoOpSecondTime(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	cache := getTestRedis(t)

	orderID := "ord-" + uuid.NewString()
	seedGuestOrder(t, pool, orderID)
	seedPaymentRow(t, pool, orderID, "ext-dup")

	prov := &fakeProvider{
		method: payment.MethodStripe,
		event:  &payment.WebhookEvent{ExternalID: "ext-dup", OrderID: orderID, Status: "PAID"},
	}
	svc := NewPaymentsService(repository.NewOrdersRepository(pool), cache, prov)

	ctx := context.Background()
	// first delivery — should update the order
	if appErr := svc.HandleWebhook(ctx, payment.MethodStripe, []byte("{}"), map[string]string{}); appErr != nil {
		t.Fatalf("first HandleWebhook: %+v", appErr)
	}
	// mark order as REFUNDED via SQL so we can detect if the second delivery re-writes it
	mustExec(t, pool, `UPDATE "Order" SET "paymentStatus"='REFUNDED', "status"='REFUNDED' WHERE id=$1`, orderID)

	// second delivery of the same event id — should be a no-op
	if appErr := svc.HandleWebhook(ctx, payment.MethodStripe, []byte("{}"), map[string]string{}); appErr != nil {
		t.Fatalf("second HandleWebhook: %+v", appErr)
	}

	var ps db.PaymentStatus
	var st db.OrderStatus
	if err := pool.QueryRow(ctx, `SELECT "paymentStatus","status" FROM "Order" WHERE id=$1`, orderID).
		Scan(&ps, &st); err != nil {
		t.Fatalf("query order: %v", err)
	}
	if ps != db.PaymentStatusREFUNDED || st != db.OrderStatusREFUNDED {
		t.Fatalf("dedupe failed — order was overwritten by duplicate webhook: ps=%s st=%s", ps, st)
	}
}

func TestPaymentsService_Webhook_RedisUnavailable_StillProcesses(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)

	orderID := "ord-" + uuid.NewString()
	seedGuestOrder(t, pool, orderID)
	seedPaymentRow(t, pool, orderID, "ext-noredis")

	prov := &fakeProvider{
		method: payment.MethodStripe,
		event:  &payment.WebhookEvent{ExternalID: "ext-noredis", OrderID: orderID, Status: "PAID"},
	}
	// nil cache: PaymentsService must not crash, must still update the order.
	svc := NewPaymentsService(repository.NewOrdersRepository(pool), nil, prov)

	if appErr := svc.HandleWebhook(context.Background(), payment.MethodStripe, []byte("{}"), map[string]string{}); appErr != nil {
		t.Fatalf("HandleWebhook: %+v", appErr)
	}
	var ps db.PaymentStatus
	if err := pool.QueryRow(context.Background(), `SELECT "paymentStatus" FROM "Order" WHERE id=$1`, orderID).
		Scan(&ps); err != nil {
		t.Fatalf("query: %v", err)
	}
	if ps != db.PaymentStatusPAID {
		t.Fatalf("expected order marked PAID even without redis, got %s", ps)
	}
}

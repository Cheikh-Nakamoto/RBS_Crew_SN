package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

func newOrdersService(t *testing.T) (*OrdersService, *pgxpool.Pool) {
	t.Helper()
	pool := getTestPool(t)
	truncateAll(t, pool)
	ordersRepo := repository.NewOrdersRepository(pool)
	productsRepo := repository.NewProductsRepository(pool)
	return NewOrdersService(ordersRepo, productsRepo), pool
}

// seedProduct inserts a minimal Product row with the given stock. Returns the product id.
func seedProduct(t *testing.T, pool *pgxpool.Pool, stock int32, price string) string {
	t.Helper()
	id := "prod-" + uuid.NewString()
	sku := "SKU-" + id[:8]
	mustExec(t, pool, `
		INSERT INTO "Product"
			("id", "slug", "sku", "price", "stock", "manageStock", "status", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, TRUE, 'PUBLISHED', NOW(), NOW())`,
		id, "slug-"+id[:8], sku, price, stock,
	)
	return id
}

// seedUser creates a User row for authenticated-order tests.
func seedUser(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	id := "user-" + uuid.NewString()
	mustExec(t, pool, `
		INSERT INTO "User"
			("id", "email", "passwordHash", "role", "preferredLocale", "emailVerified", "createdAt", "updatedAt")
		VALUES ($1, $2, 'unused-hash', 'CUSTOMER', 'fr', TRUE, NOW(), NOW())`,
		id, fmt.Sprintf("user-%s@rbs.sn", id[5:13]),
	)
	return id
}

func TestOrdersService_Create_Guest_SuccessWhenStockAvailable(t *testing.T) {
	svc, pool := newOrdersService(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 10, "5000")

	dto := model.CreateOrderDTO{
		GuestEmail: "guest@rbs.sn",
		Items:      []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 3}},
	}
	resp, appErr := svc.Create(ctx, dto, nil)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}
	if resp.Total.String() != "15000" && !resp.Total.Equal(decimal.RequireFromString("15000")) {
		t.Fatalf("total = %s want 15000", resp.Total.String())
	}

	// Verify stock decreased
	var remaining int32
	if err := pool.QueryRow(ctx, `SELECT stock FROM "Product" WHERE id=$1`, pid).Scan(&remaining); err != nil {
		t.Fatalf("stock query: %v", err)
	}
	if remaining != 7 {
		t.Fatalf("stock = %d, want 7", remaining)
	}

	// GuestEmail should be present, UserId null on the DB row
	var guestEmail *string
	var userID *string
	if err := pool.QueryRow(ctx, `SELECT "userId","guestEmail" FROM "Order" WHERE id=$1`, resp.ID).
		Scan(&userID, &guestEmail); err != nil {
		t.Fatalf("order query: %v", err)
	}
	if userID != nil {
		t.Fatalf("userId should be null for guest order, got %v", *userID)
	}
	if guestEmail == nil || *guestEmail != "guest@rbs.sn" {
		t.Fatalf("guestEmail = %v", guestEmail)
	}
}

func TestOrdersService_Create_Authenticated_GuestEmailNil(t *testing.T) {
	svc, pool := newOrdersService(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 10, "5000")
	uid := seedUser(t, pool)

	dto := model.CreateOrderDTO{
		Items: []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 2}},
	}
	resp, appErr := svc.Create(ctx, dto, &uid)
	if appErr != nil {
		t.Fatalf("Create: %+v", appErr)
	}

	var guestEmail *string
	var userID *string
	if err := pool.QueryRow(ctx, `SELECT "userId","guestEmail" FROM "Order" WHERE id=$1`, resp.ID).
		Scan(&userID, &guestEmail); err != nil {
		t.Fatalf("order query: %v", err)
	}
	if guestEmail != nil {
		t.Fatalf("guestEmail must be nil for authenticated orders, got %v", *guestEmail)
	}
	if userID == nil || *userID != uid {
		t.Fatalf("userId mismatch: got %v want %s", userID, uid)
	}
}

func TestOrdersService_Create_RejectWhenStockInsufficient(t *testing.T) {
	svc, pool := newOrdersService(t)
	ctx := context.Background()

	pid := seedProduct(t, pool, 2, "5000")

	t.Run("guest", func(t *testing.T) {
		dto := model.CreateOrderDTO{
			GuestEmail: "greedy@rbs.sn",
			Items:      []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 5}},
		}
		_, appErr := svc.Create(ctx, dto, nil)
		if appErr == nil {
			t.Fatal("expected error, got nil")
		}
		if appErr.StatusCode != 400 {
			t.Fatalf("want 400 BadRequest, got %d", appErr.StatusCode)
		}
	})

	t.Run("authenticated", func(t *testing.T) {
		uid := seedUser(t, pool)
		dto := model.CreateOrderDTO{
			Items: []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 5}},
		}
		_, appErr := svc.Create(ctx, dto, &uid)
		if appErr == nil {
			t.Fatal("expected error, got nil")
		}
		if appErr.StatusCode != 400 {
			t.Fatalf("want 400 BadRequest, got %d", appErr.StatusCode)
		}
	})
}

func TestOrdersService_Create_RejectsGuestWithoutEmail(t *testing.T) {
	svc, _ := newOrdersService(t)
	ctx := context.Background()

	_, appErr := svc.Create(ctx, model.CreateOrderDTO{Items: nil}, nil)
	if appErr == nil || appErr.StatusCode != 400 {
		t.Fatalf("want 400, got %+v", appErr)
	}
}

// TestOrdersService_Concurrent_LastThree_NoOverselling verifies the atomic
// DecrementStock (WHERE stock >= qty) prevents overselling under concurrency.
// 5 goroutines each try to buy 1 unit of a product with stock = 3.
// Exactly 3 should succeed; the other 2 must fail with 400 (BadRequest).
func TestOrdersService_Concurrent_LastThree_NoOverselling(t *testing.T) {
	svc, pool := newOrdersService(t)

	pid := seedProduct(t, pool, 3, "10000")

	const goroutines = 5
	var wg sync.WaitGroup
	var success, fail int32
	start := make(chan struct{})

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			dto := model.CreateOrderDTO{
				GuestEmail: fmt.Sprintf("g%d@rbs.sn", i),
				Items:      []model.CreateOrderItemDTO{{ProductID: pid, Quantity: 1}},
			}
			_, err := svc.Create(ctx, dto, nil)
			if err == nil {
				atomic.AddInt32(&success, 1)
			} else if err.StatusCode == 400 {
				atomic.AddInt32(&fail, 1)
			} else {
				t.Errorf("goroutine %d unexpected error: %+v", i, err)
			}
		}(i)
	}
	close(start)
	wg.Wait()

	if success != 3 {
		t.Fatalf("expected 3 successful orders (available stock), got %d success / %d fail", success, fail)
	}
	if fail != 2 {
		t.Fatalf("expected 2 rejections, got %d", fail)
	}

	// Ensure final DB stock is 0 (no overselling → not negative, no underselling either since qty allowed).
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var remaining int32
	if err := pool.QueryRow(ctx, `SELECT stock FROM "Product" WHERE id=$1`, pid).Scan(&remaining); err != nil {
		t.Fatalf("final stock: %v", err)
	}
	if remaining != 0 {
		t.Fatalf("final stock = %d, want 0 (no overselling and no underselling)", remaining)
	}
}

// smoke test that GetProductForOrder round-trips ManageStock — guards against
// silent schema drift breaking the whole race path.
func TestOrdersService_GetProductForOrder_Shape(t *testing.T) {
	_, pool := newOrdersService(t)
	pid := seedProduct(t, pool, 1, "42")
	prodRepo := repository.NewProductsRepository(pool)
	row, err := prodRepo.GetForOrder(context.Background(), pid)
	if err != nil {
		t.Fatalf("GetForOrder: %v", err)
	}
	if !row.ManageStock || row.Stock != 1 || !row.Price.Equal(decimal.RequireFromString("42")) {
		t.Fatalf("row = %+v", row)
	}
	// silence unused import warning by referencing db explicitly
	_ = db.PaymentStatusUNPAID
}

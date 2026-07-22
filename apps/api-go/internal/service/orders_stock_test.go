package service

import (
	"context"
	"testing"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// stockOf lit le stock courant d'un produit.
func stockOf(t *testing.T, pool *pgxpool.Pool, productID string) int32 {
	t.Helper()
	var stock int32
	if err := pool.QueryRow(context.Background(),
		`SELECT "stock" FROM "Product" WHERE "id"=$1`, productID).Scan(&stock); err != nil {
		t.Fatalf("read stock: %v", err)
	}
	return stock
}

// seedOrderHoldingStock crée un produit et une commande PENDING qui en détient
// `qty` unités, comme le ferait OrdersService.Create.
func seedOrderHoldingStock(t *testing.T, pool *pgxpool.Pool, initialStock, qty int32) (productID, orderID string) {
	t.Helper()

	productID = uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Product" ("id","slug","price","stock","manageStock","status","createdAt","updatedAt")
		 VALUES ($1,$2,10000,$3,true,'PUBLISHED',NOW(),NOW())`,
		productID, "p-"+productID[:8], initialStock)

	orderID = uuid.New().String()
	mustExec(t, pool,
		`INSERT INTO "Order" ("id","orderNumber","status","paymentStatus","currency",
		 "subtotal","taxAmount","shippingAmount","discountAmount","total","locale","createdAt","updatedAt")
		 VALUES ($1,$2,'PENDING','UNPAID','XOF',10000,0,0,0,10000,'fr',NOW(),NOW())`,
		orderID, "ORD-"+orderID[:8])

	mustExec(t, pool,
		`INSERT INTO "OrderItem" ("id","orderId","productId","productName","quantity","unitPrice","totalPrice")
		 VALUES ($1,$2,$3,'Test',$4,10000,10000)`,
		uuid.New().String(), orderID, productID, qty)

	// Reproduit le décrément fait à la création de la commande.
	mustExec(t, pool, `UPDATE "Product" SET "stock" = "stock" - $2 WHERE "id" = $1`, productID, qty)

	return productID, orderID
}

// ordersServiceFor construit le service directement depuis un pool — le helper
// newOrdersService d'orders_test.go a une autre signature.
func ordersServiceFor(pool *pgxpool.Pool) *OrdersService {
	return NewOrdersService(repository.NewOrdersRepository(pool), repository.NewProductsRepository(pool))
}

// La libération rend exactement les unités détenues, et une seule fois — c'est
// la garantie qui empêche le stock de dériver à chaque rejeu de webhook.
func TestReleaseStock_RestoresOnceThenIsIdempotent(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	ctx := context.Background()

	const initial, qty = 10, 3
	productID, orderID := seedOrderHoldingStock(t, pool, initial, qty)

	if got := stockOf(t, pool, productID); got != initial-qty {
		t.Fatalf("stock détenu attendu %d, obtenu %d", initial-qty, got)
	}

	svc := ordersServiceFor(pool)
	unpaid := db.PaymentStatusUNPAID

	released, err := svc.ReleaseStock(ctx, orderID, db.OrderStatusCANCELLED, &unpaid)
	if err != nil {
		t.Fatalf("release: %v", err)
	}
	if !released {
		t.Fatal("la première libération aurait dû agir")
	}
	if got := stockOf(t, pool, productID); got != initial {
		t.Errorf("stock après libération : attendu %d, obtenu %d", initial, got)
	}

	// Rejeu : la garde SQL sur le statut doit neutraliser l'appel.
	released, err = svc.ReleaseStock(ctx, orderID, db.OrderStatusCANCELLED, &unpaid)
	if err != nil {
		t.Fatalf("release (rejeu) : %v", err)
	}
	if released {
		t.Error("le rejeu ne doit pas libérer une seconde fois")
	}
	if got := stockOf(t, pool, productID); got != initial {
		t.Errorf("stock après rejeu : attendu %d, obtenu %d (double restitution)", initial, got)
	}
}

// Une commande déjà livrée ne doit jamais voir son stock recrédité par erreur.
func TestReleaseStock_SkipsAlreadyTerminalOrder(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	ctx := context.Background()

	const initial, qty = 8, 2
	productID, orderID := seedOrderHoldingStock(t, pool, initial, qty)
	mustExec(t, pool, `UPDATE "Order" SET "status"='CANCELLED' WHERE "id"=$1`, orderID)

	svc := ordersServiceFor(pool)
	released, err := svc.ReleaseStock(ctx, orderID, db.OrderStatusCANCELLED, nil)
	if err != nil {
		t.Fatalf("release: %v", err)
	}
	if released {
		t.Error("une commande déjà terminale ne doit pas libérer de stock")
	}
	if got := stockOf(t, pool, productID); got != initial-qty {
		t.Errorf("stock modifié à tort : attendu %d, obtenu %d", initial-qty, got)
	}
}

// Le balayage annule les commandes impayées trop anciennes et rend leur stock,
// sans toucher aux commandes récentes encore en cours de paiement.
func TestExpireUnpaidOrders_ReleasesOldOnly(t *testing.T) {
	pool := getTestPool(t)
	truncateAll(t, pool)
	ctx := context.Background()

	oldProduct, oldOrder := seedOrderHoldingStock(t, pool, 10, 4)
	mustExec(t, pool, `UPDATE "Order" SET "createdAt" = NOW() - INTERVAL '2 hours' WHERE "id"=$1`, oldOrder)

	recentProduct, _ := seedOrderHoldingStock(t, pool, 10, 1)

	svc := ordersServiceFor(pool)
	released, err := svc.ExpireUnpaidOrders(ctx, time.Hour)
	if err != nil {
		t.Fatalf("expire: %v", err)
	}
	if released != 1 {
		t.Fatalf("attendu 1 commande expirée, obtenu %d", released)
	}
	if got := stockOf(t, pool, oldProduct); got != 10 {
		t.Errorf("stock de la commande expirée non rendu : %d", got)
	}
	if got := stockOf(t, pool, recentProduct); got != 9 {
		t.Errorf("une commande récente a été annulée à tort : stock %d", got)
	}
}

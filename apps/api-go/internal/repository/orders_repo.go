package repository

import (
	"context"
	"errors"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type OrdersRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewOrdersRepository(pool *pgxpool.Pool) *OrdersRepository {
	return &OrdersRepository{q: db.New(pool), pool: pool}
}

func (r *OrdersRepository) Pool() *pgxpool.Pool { return r.pool }

// Queries expose les requêtes générées pour les lectures simples hors transaction.
func (r *OrdersRepository) Queries() *db.Queries { return r.q }

func (r *OrdersRepository) WithTx(tx pgx.Tx) *db.Queries {
	return r.q.WithTx(tx)
}

func (r *OrdersRepository) GetOrderByStripeSession(ctx context.Context, stripeID string) (*db.Order, error) {
	row, err := r.q.GetOrderByStripeSession(ctx, &stripeID)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *OrdersRepository) UpdateOrderPaymentStatus(ctx context.Context, id string, paymentStatus db.PaymentStatus, status *db.OrderStatus, stripeID *string) (*db.Order, error) {
	params := db.UpdateOrderPaymentStatusParams{
		ID:      id,
		Column2: paymentStatus,
	}

	if status != nil {
		params.Status = status
	}

	if stripeID != nil {
		params.StripePaymentIntentId = stripeID
	}

	row, err := r.q.UpdateOrderPaymentStatus(ctx, params)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *OrdersRepository) List(ctx context.Context, limit, offset int32) ([]db.ListOrdersRow, error) {
	return r.q.ListOrders(ctx, db.ListOrdersParams{Limit: limit, Offset: offset})
}

func (r *OrdersRepository) ListMy(ctx context.Context, userID string, limit, offset int32) ([]db.ListMyOrdersRow, error) {
	return r.q.ListMyOrders(ctx, db.ListMyOrdersParams{UserId: &userID, Limit: limit, Offset: offset})
}

func (r *OrdersRepository) GetByID(ctx context.Context, id string) (*db.Order, error) {
	o, err := r.q.GetOrderByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrdersRepository) GetItems(ctx context.Context, orderID string) ([]db.OrderItem, error) {
	return r.q.GetOrderItems(ctx, orderID)
}

func (r *OrdersRepository) UpdateStatus(ctx context.Context, id, status string) (*db.Order, error) {
	o, err := r.q.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{ID: id, Status: db.OrderStatus(status)})
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrdersRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM "Order" WHERE "id" = $1`, id)
	return err
}

// ── Payment methods ───────────────────────────────────────────────────────────

func (r *OrdersRepository) CreatePayment(ctx context.Context, params db.CreatePaymentParams) (*db.Payment, error) {
	p, err := r.q.CreatePayment(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *OrdersRepository) GetPaymentsForOrder(ctx context.Context, orderID string) ([]db.Payment, error) {
	return r.q.GetPaymentsByOrderID(ctx, orderID)
}

func (r *OrdersRepository) GetPaymentByExternalID(ctx context.Context, externalID string) (*db.Payment, error) {
	p, err := r.q.GetPaymentByExternalID(ctx, &externalID)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *OrdersRepository) UpdatePaymentStatus(ctx context.Context, id string, status db.PaymentStatus) (*db.Payment, error) {
	p, err := r.q.UpdatePaymentStatus(ctx, db.UpdatePaymentStatusParams{
		ID:      id,
		Column2: status,
	})
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *OrdersRepository) UpdateOrderShipping(ctx context.Context, params db.UpdateOrderShippingParams) (*db.Order, error) {
	o, err := r.q.UpdateOrderShipping(ctx, params)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrdersRepository) UpdateOrderShippingAmount(ctx context.Context, orderID string, amount decimal.Decimal) (*db.Order, error) {
	o, err := r.q.UpdateOrderShippingAmount(ctx, db.UpdateOrderShippingAmountParams{
		ID:             orderID,
		ShippingAmount: amount,
	})
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrdersRepository) UpdateOrderPaymentMethod(ctx context.Context, orderID string, method db.NullPaymentMethod) (*db.Order, error) {
	// La requête exige une valeur : on refuse explicitement plutôt que de
	// déréférencer un pointeur nul.
	if !method.Valid {
		return nil, errors.New("payment method is required")
	}
	o, err := r.q.UpdateOrderPaymentMethodOnly(ctx, db.UpdateOrderPaymentMethodOnlyParams{
		ID:      orderID,
		Column2: method.PaymentMethod,
	})
	if err != nil {
		return nil, err
	}
	return &o, nil
}

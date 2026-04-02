package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrdersRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewOrdersRepository(pool *pgxpool.Pool) *OrdersRepository {
	return &OrdersRepository{q: db.New(pool), pool: pool}
}

func (r *OrdersRepository) Pool() *pgxpool.Pool { return r.pool }

func (r *OrdersRepository) WithTx(tx pgx.Tx) *db.Queries {
	return r.q.WithTx(tx)
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

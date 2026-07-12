package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type RefundsRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewRefundsRepository(pool *pgxpool.Pool) *RefundsRepository {
	return &RefundsRepository{q: db.New(pool), pool: pool}
}

func (r *RefundsRepository) Pool() *pgxpool.Pool { return r.pool }

func (r *RefundsRepository) WithTx(tx pgx.Tx) *db.Queries {
	return r.q.WithTx(tx)
}

func (r *RefundsRepository) Create(ctx context.Context, params db.CreateRefundRequestParams) (*db.RefundRequest, error) {
	row, err := r.q.CreateRefundRequest(ctx, params)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *RefundsRepository) GetByID(ctx context.Context, id string) (*db.RefundRequest, error) {
	row, err := r.q.GetRefundRequestByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *RefundsRepository) GetByIdempotencyKey(ctx context.Context, key string) (*db.RefundRequest, error) {
	row, err := r.q.GetRefundRequestByIdempotencyKey(ctx, key)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *RefundsRepository) ListByOrderID(ctx context.Context, orderID string) ([]db.RefundRequest, error) {
	return r.q.ListRefundsByOrderID(ctx, orderID)
}

func (r *RefundsRepository) UpdateStatus(ctx context.Context, params db.UpdateRefundStatusParams) (*db.RefundRequest, error) {
	row, err := r.q.UpdateRefundStatus(ctx, params)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *RefundsRepository) MarkManualCompleted(ctx context.Context, id, manualRef string, justURL *string) (*db.RefundRequest, error) {
	row, err := r.q.MarkRefundManualCompleted(ctx, db.MarkRefundManualCompletedParams{
		ID:               id,
		ManualReference:  &manualRef,
		JustificationUrl: justURL,
	})
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *RefundsRepository) SumByOrderID(ctx context.Context, orderID string) (decimal.Decimal, error) {
	total, err := r.q.SumRefundsByOrderID(ctx, orderID)
	if err != nil {
		return decimal.Zero, err
	}
	return total, nil
}

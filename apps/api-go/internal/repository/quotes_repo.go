package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type QuotesRepository struct {
	q *db.Queries
}

func NewQuotesRepository(pool *pgxpool.Pool) *QuotesRepository {
	return &QuotesRepository{q: db.New(pool)}
}

func (r *QuotesRepository) List(ctx context.Context, limit, offset int32) ([]db.ListQuotesRow, error) {
	return r.q.ListQuotes(ctx, db.ListQuotesParams{Limit: limit, Offset: offset})
}

func (r *QuotesRepository) GetByID(ctx context.Context, id string) (*db.Quote, error) {
	q, err := r.q.GetQuoteByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *QuotesRepository) Create(ctx context.Context, params db.CreateQuoteParams) (*db.Quote, error) {
	q, err := r.q.CreateQuote(ctx, params)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *QuotesRepository) UpdateStatus(ctx context.Context, id, status string) (*db.Quote, error) {
	q, err := r.q.UpdateQuoteStatus(ctx, db.UpdateQuoteStatusParams{ID: id, Status: status})
	if err != nil {
		return nil, err
	}
	return &q, nil
}

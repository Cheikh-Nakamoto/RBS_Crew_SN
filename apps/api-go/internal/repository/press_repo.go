package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PressRepository struct {
	q *db.Queries
}

func NewPressRepository(pool *pgxpool.Pool) *PressRepository {
	return &PressRepository{q: db.New(pool)}
}

func (r *PressRepository) List(ctx context.Context, limit, offset int32) ([]db.ListPressMentionsRow, error) {
	return r.q.ListPressMentions(ctx, db.ListPressMentionsParams{Limit: limit, Offset: offset})
}

func (r *PressRepository) GetByID(ctx context.Context, id string) (*db.PressMention, error) {
	p, err := r.q.GetPressMentionByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PressRepository) Create(ctx context.Context, params db.CreatePressMentionParams) (*db.PressMention, error) {
	p, err := r.q.CreatePressMention(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PressRepository) Update(ctx context.Context, params db.UpdatePressMentionParams) (*db.PressMention, error) {
	p, err := r.q.UpdatePressMention(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PressRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeletePressMention(ctx, id)
}

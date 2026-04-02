package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PagesRepository struct {
	q *db.Queries
}

func NewPagesRepository(pool *pgxpool.Pool) *PagesRepository {
	return &PagesRepository{q: db.New(pool)}
}

func (r *PagesRepository) List(ctx context.Context, limit, offset int32) ([]db.ListPagesRow, error) {
	return r.q.ListPages(ctx, db.ListPagesParams{Limit: limit, Offset: offset})
}

func (r *PagesRepository) GetBySlug(ctx context.Context, slug string) (*db.Page, error) {
	p, err := r.q.GetPageBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PagesRepository) GetByID(ctx context.Context, id string) (*db.Page, error) {
	p, err := r.q.GetPageByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PagesRepository) GetTranslations(ctx context.Context, id string) ([]db.PageTranslation, error) {
	return r.q.GetPageTranslations(ctx, id)
}

func (r *PagesRepository) Create(ctx context.Context, params db.CreatePageParams) (*db.Page, error) {
	p, err := r.q.CreatePage(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PagesRepository) UpsertTranslation(ctx context.Context, params db.UpsertPageTranslationParams) error {
	_, err := r.q.UpsertPageTranslation(ctx, params)
	return err
}

func (r *PagesRepository) Update(ctx context.Context, params db.UpdatePageParams) (*db.Page, error) {
	p, err := r.q.UpdatePage(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PagesRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeletePage(ctx, id)
}

package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PagesRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewPagesRepository(pool *pgxpool.Pool) *PagesRepository {
	return &PagesRepository{q: db.New(pool), pool: pool}
}

type AdminListPageRow struct {
	db.Page
	TotalCount int64
}

func (r *PagesRepository) AdminList(ctx context.Context, limit, offset int32) ([]AdminListPageRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, slug, template, status, "wpId", "parentId", "menuOrder", "createdAt", "updatedAt", COUNT(*) OVER() AS total_count
		 FROM "Page"
		 ORDER BY "menuOrder" ASC, "createdAt" DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminListPageRow
	for rows.Next() {
		var row AdminListPageRow
		if err := rows.Scan(
			&row.ID, &row.Slug, &row.Template, &row.Status, &row.WpId,
			&row.ParentId, &row.MenuOrder, &row.CreatedAt, &row.UpdatedAt,
			&row.TotalCount,
		); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	return items, rows.Err()
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

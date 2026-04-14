package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ServicesRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewServicesRepository(pool *pgxpool.Pool) *ServicesRepository {
	return &ServicesRepository{q: db.New(pool), pool: pool}
}

type AdminListServiceRow struct {
	db.Service
	TotalCount int64
}

func (r *ServicesRepository) AdminList(ctx context.Context, limit, offset int32) ([]AdminListServiceRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, slug, icon, status, "menuOrder", "createdAt", "updatedAt", COUNT(*) OVER() AS total_count
		 FROM "Service"
		 ORDER BY "menuOrder" ASC, "createdAt" DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminListServiceRow
	for rows.Next() {
		var row AdminListServiceRow
		if err := rows.Scan(
			&row.ID, &row.Slug, &row.Icon, &row.Status,
			&row.MenuOrder, &row.CreatedAt, &row.UpdatedAt,
			&row.TotalCount,
		); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	return items, rows.Err()
}

func (r *ServicesRepository) List(ctx context.Context, limit, offset int32) ([]db.ListServicesRow, error) {
	return r.q.ListServices(ctx, db.ListServicesParams{Limit: limit, Offset: offset})
}

func (r *ServicesRepository) GetBySlug(ctx context.Context, slug string) (*db.Service, error) {
	s, err := r.q.GetServiceBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ServicesRepository) GetByID(ctx context.Context, id string) (*db.Service, error) {
	s, err := r.q.GetServiceByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ServicesRepository) GetTranslations(ctx context.Context, id string) ([]db.ServiceTranslation, error) {
	return r.q.GetServiceTranslations(ctx, id)
}

func (r *ServicesRepository) Create(ctx context.Context, params db.CreateServiceParams) (*db.Service, error) {
	s, err := r.q.CreateService(ctx, params)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ServicesRepository) UpsertTranslation(ctx context.Context, params db.UpsertServiceTranslationParams) error {
	_, err := r.q.UpsertServiceTranslation(ctx, params)
	return err
}

func (r *ServicesRepository) Update(ctx context.Context, params db.UpdateServiceParams) (*db.Service, error) {
	s, err := r.q.UpdateService(ctx, params)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ServicesRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteService(ctx, id)
}

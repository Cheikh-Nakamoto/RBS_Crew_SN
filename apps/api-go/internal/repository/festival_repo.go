package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FestivalRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewFestivalRepository(pool *pgxpool.Pool) *FestivalRepository {
	return &FestivalRepository{q: db.New(pool), pool: pool}
}

func (r *FestivalRepository) List(ctx context.Context, limit, offset int32) ([]db.ListFestivalEditionsRow, error) {
	return r.q.ListFestivalEditions(ctx, db.ListFestivalEditionsParams{Limit: limit, Offset: offset})
}

type AdminListFestivalRow struct {
	db.FestivalEdition
	TotalCount int64
}

func (r *FestivalRepository) AdminList(ctx context.Context, limit, offset int32) ([]AdminListFestivalRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, slug, "editionNumber", year, city, country, status, "wpId", "mainImage", "heroImage", gallery, typography, "createdAt", "updatedAt", COUNT(*) OVER() AS total_count
		 FROM "FestivalEdition"
		 ORDER BY "year" DESC, "editionNumber" DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminListFestivalRow
	for rows.Next() {
		var row AdminListFestivalRow
		if err := rows.Scan(
			&row.ID, &row.Slug, &row.EditionNumber, &row.Year,
			&row.City, &row.Country, &row.Status, &row.WpId,
			&row.MainImage, &row.HeroImage, &row.Gallery, &row.Typography,
			&row.CreatedAt, &row.UpdatedAt,
			&row.TotalCount,
		); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	return items, rows.Err()
}

func (r *FestivalRepository) GetBySlug(ctx context.Context, slug string) (*db.FestivalEdition, error) {
	f, err := r.q.GetFestivalBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *FestivalRepository) GetByID(ctx context.Context, id string) (*db.FestivalEdition, error) {
	f, err := r.q.GetFestivalByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *FestivalRepository) GetTranslations(ctx context.Context, id string) ([]db.FestivalTranslation, error) {
	return r.q.GetFestivalTranslations(ctx, id)
}

func (r *FestivalRepository) Create(ctx context.Context, params db.CreateFestivalEditionParams) (*db.FestivalEdition, error) {
	f, err := r.q.CreateFestivalEdition(ctx, params)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *FestivalRepository) UpsertTranslation(ctx context.Context, params db.UpsertFestivalTranslationParams) error {
	_, err := r.q.UpsertFestivalTranslation(ctx, params)
	return err
}

func (r *FestivalRepository) Update(ctx context.Context, params db.UpdateFestivalEditionParams) (*db.FestivalEdition, error) {
	f, err := r.q.UpdateFestivalEdition(ctx, params)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *FestivalRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteFestivalEdition(ctx, id)
}

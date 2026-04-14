package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ArtistsRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewArtistsRepository(pool *pgxpool.Pool) *ArtistsRepository {
	return &ArtistsRepository{q: db.New(pool), pool: pool}
}

func (r *ArtistsRepository) List(ctx context.Context, limit, offset int32) ([]db.ListArtistsRow, error) {
	return r.q.ListArtists(ctx, db.ListArtistsParams{Limit: limit, Offset: offset})
}

type AdminListArtistRow struct {
	db.Artist
	TotalCount int64
}

func (r *ArtistsRepository) AdminList(ctx context.Context, limit, offset int32) ([]AdminListArtistRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, slug, city, country, status, "wpId", "createdAt", "updatedAt", "avatarUrl", "featuredImageUrl", "instagramUrl", COUNT(*) OVER() AS total_count
		 FROM "Artist"
		 ORDER BY "createdAt" DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []AdminListArtistRow
	for rows.Next() {
		var row AdminListArtistRow
		if err := rows.Scan(
			&row.ID, &row.Slug, &row.City, &row.Country, &row.Status,
			&row.WpId, &row.CreatedAt, &row.UpdatedAt,
			&row.AvatarUrl, &row.FeaturedImageUrl, &row.InstagramUrl,
			&row.TotalCount,
		); err != nil {
			return nil, err
		}
		items = append(items, row)
	}
	return items, rows.Err()
}

func (r *ArtistsRepository) GetBySlug(ctx context.Context, slug string) (*db.Artist, error) {
	a, err := r.q.GetArtistBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArtistsRepository) GetByID(ctx context.Context, id string) (*db.Artist, error) {
	a, err := r.q.GetArtistByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArtistsRepository) GetTranslations(ctx context.Context, artistID string) ([]db.ArtistTranslation, error) {
	return r.q.GetArtistTranslations(ctx, artistID)
}

func (r *ArtistsRepository) GetArtworks(ctx context.Context, artistID string) ([]db.ArtistArtwork, error) {
	return r.q.GetArtistArtworks(ctx, artistID)
}

func (r *ArtistsRepository) Create(ctx context.Context, params db.CreateArtistParams) (*db.Artist, error) {
	a, err := r.q.CreateArtist(ctx, params)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArtistsRepository) UpsertTranslation(ctx context.Context, params db.UpsertArtistTranslationParams) error {
	_, err := r.q.UpsertArtistTranslation(ctx, params)
	return err
}

func (r *ArtistsRepository) Update(ctx context.Context, params db.UpdateArtistParams) (*db.Artist, error) {
	a, err := r.q.UpdateArtist(ctx, params)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArtistsRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteArtist(ctx, id)
}

func (r *ArtistsRepository) AddArtwork(ctx context.Context, params db.AddArtistArtworkParams) error {
	return r.q.AddArtistArtwork(ctx, params)
}

func (r *ArtistsRepository) ClearArtworks(ctx context.Context, artistID string) error {
	return r.q.ClearArtistArtworks(ctx, artistID)
}

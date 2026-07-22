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
	AccountEmail    *string
	AccountVerified *bool
	TotalCount      int64
}

func (r *ArtistsRepository) AdminList(ctx context.Context, limit, offset int32) ([]AdminListArtistRow, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT a.id, a.slug, a.city, a.country, a.status, a."wpId", a."createdAt", a."updatedAt",
		        a."avatarUrl", a."featuredImageUrl", a."instagramUrl",
		        a."genre", a."nationality", a."facebookUrl", a."twitterUrl", a."youtubeUrl",
		        a."tiktokUrl", a."websiteUrl", a."spotifyUrl", a."soundcloudUrl", a."videoUrl",
		        a."userId", u."email", u."emailVerified",
		        COUNT(*) OVER() AS total_count
		 FROM "Artist" a
		 LEFT JOIN "User" u ON u."id" = a."userId"
		 ORDER BY a."createdAt" DESC
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
			&row.Genre, &row.Nationality,
			&row.FacebookUrl, &row.TwitterUrl, &row.YoutubeUrl,
			&row.TiktokUrl, &row.WebsiteUrl, &row.SpotifyUrl, &row.SoundcloudUrl, &row.VideoUrl,
			&row.UserId, &row.AccountEmail, &row.AccountVerified,
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

// GetByUserID résout la fiche artiste rattachée à un compte. C'est le seul point
// d'entrée du self-service : aucun identifiant d'artiste n'est jamais accepté
// depuis la requête, ce qui rend l'accès à la fiche d'autrui structurellement
// impossible.
func (r *ArtistsRepository) GetByUserID(ctx context.Context, userID string) (*db.Artist, error) {
	a, err := r.q.GetArtistByUserID(ctx, &userID)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ArtistsRepository) LinkUser(ctx context.Context, artistID, userID string) (*db.Artist, error) {
	a, err := r.q.LinkArtistUser(ctx, db.LinkArtistUserParams{ID: artistID, UserId: &userID})
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// DeleteArtworkOwned renvoie le nombre de lignes supprimées : 0 signifie que
// l'œuvre n'existe pas ou n'appartient pas à cet artiste.
func (r *ArtistsRepository) DeleteArtworkOwned(ctx context.Context, artworkID, artistID string) (int64, error) {
	return r.q.DeleteArtistArtworkOwned(ctx, db.DeleteArtistArtworkOwnedParams{ID: artworkID, ArtistId: artistID})
}

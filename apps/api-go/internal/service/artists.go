package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/jackc/pgx/v5"
)

type ArtistTranslation struct {
	Locale string  `json:"locale"`
	Name   string  `json:"name"`
	Bio    *string `json:"bio"`
}

type ArtistArtwork struct {
	ID       string `json:"id"`
	ImageURL string `json:"imageUrl"`
	Position int32  `json:"position"`
}

type ArtistResponse struct {
	ID               string              `json:"id"`
	Slug             string              `json:"slug"`
	City             *string             `json:"city"`
	Country          *string             `json:"country"`
	FeaturedImageURL *string             `json:"featuredImageUrl"`
	AvatarURL        *string             `json:"avatarUrl"`
	InstagramURL     *string             `json:"instagramUrl"`
	Status           string              `json:"status"`
	Translations     []ArtistTranslation `json:"translations"`
	Artworks         []ArtistArtwork     `json:"artworks"`
	CreatedAt        time.Time           `json:"createdAt"`
}

type ArtistsService struct {
	repo  *repository.ArtistsRepository
	cache *redis.Client
}

func NewArtistsService(repo *repository.ArtistsRepository, cache *redis.Client) *ArtistsService {
	return &ArtistsService{repo: repo, cache: cache}
}

func (s *ArtistsService) cacheKey(page, limit int) string {
	return fmt.Sprintf("artists:%d:%d", page, limit)
}

func (s *ArtistsService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[ArtistResponse], *types.AppError) {
	key := s.cacheKey(page, limit)
	if cached, err := s.cache.Get(ctx, key); err == nil {
		var result types.PaginatedResponse[ArtistResponse]
		if json.Unmarshal([]byte(cached), &result) == nil {
			return &result, nil
		}
	}

	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch artists")
	}

		var total int
	artists := make([]ArtistResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		aObj := db.Artist{
			ID:               row.ID,
			Slug:             row.Slug,
			City:             row.City,
			Country:          row.Country,
			Status:           row.Status,
			WpId:             row.WpId,
			CreatedAt:        row.CreatedAt,
			UpdatedAt:        row.UpdatedAt,
			AvatarUrl:        row.AvatarUrl,
			FeaturedImageUrl: row.FeaturedImageUrl,
			InstagramUrl:     row.InstagramUrl,
		}
		artists = append(artists, s.assemble(ctx, &aObj))
	}

	result := types.Paginate(artists, total, page, limit)
	if data, jerr := json.Marshal(result); jerr == nil {
		_ = s.cache.Set(ctx, key, string(data), 5*time.Minute)
	}
	return result, nil
}

func (s *ArtistsService) GetBySlug(ctx context.Context, slug string) (*ArtistResponse, *types.AppError) {
	a, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Artist not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.assemble(ctx, a)
	return &res, nil
}

func (s *ArtistsService) ClearCache(ctx context.Context) {
	_ = s.cache.DeletePattern(ctx, "artists:*")
}

func (s *ArtistsService) assemble(ctx context.Context, a *db.Artist) ArtistResponse {
	translations, _ := s.repo.GetTranslations(ctx, a.ID)
	artworks, _ := s.repo.GetArtworks(ctx, a.ID)

	trans := make([]ArtistTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, ArtistTranslation{Locale: string(t.Locale), Name: t.Name, Bio: t.Bio})
	}
	arts := make([]ArtistArtwork, 0, len(artworks))
	for _, aw := range artworks {
		arts = append(arts, ArtistArtwork{ID: aw.ID, ImageURL: aw.ImageUrl, Position: aw.Position})
	}
	return ArtistResponse{
		ID: a.ID, Slug: a.Slug, City: a.City, Country: a.Country,
		FeaturedImageURL: a.FeaturedImageUrl, AvatarURL: a.AvatarUrl,
		InstagramURL: a.InstagramUrl,
		Status: string(a.Status), Translations: trans, Artworks: arts,
		CreatedAt: a.CreatedAt.Time,
	}
}

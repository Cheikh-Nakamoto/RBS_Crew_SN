package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

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

func (s *ArtistsService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.ArtistResponse], *types.AppError) {
	key := s.cacheKey(page, limit)
	if cached, err := s.cache.Get(ctx, key); err == nil {
		var result types.PaginatedResponse[model.ArtistResponse]
		if json.Unmarshal([]byte(cached), &result) == nil {
			return &result, nil
		}
	}

	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch artists")
	}

	var total int
	artists := make([]model.ArtistResponse, 0, len(rows))
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
			Genre:            row.Genre,
			Nationality:      row.Nationality,
			FacebookUrl:      row.FacebookUrl,
			TwitterUrl:       row.TwitterUrl,
			YoutubeUrl:       row.YoutubeUrl,
			TiktokUrl:        row.TiktokUrl,
			WebsiteUrl:       row.WebsiteUrl,
			SpotifyUrl:       row.SpotifyUrl,
			SoundcloudUrl:    row.SoundcloudUrl,
			VideoUrl:         row.VideoUrl,
		}
		artists = append(artists, s.assemble(ctx, &aObj))
	}

	result := types.Paginate(artists, total, page, limit)
	if data, jerr := json.Marshal(result); jerr == nil {
		_ = s.cache.Set(ctx, key, string(data), 5*time.Minute)
	}
	return result, nil
}

func (s *ArtistsService) GetBySlug(ctx context.Context, slug string) (*model.ArtistResponse, *types.AppError) {
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

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *ArtistsService) toAdminArtistResponse(ctx context.Context, a *db.Artist) model.AdminArtistResponse {
	translations, _ := s.repo.GetTranslations(ctx, a.ID)
	trans := make([]model.AdminArtistTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.AdminArtistTranslation{
			Locale: string(t.Locale), Title: t.Name, Slug: a.Slug, Description: t.Bio,
		})
	}
	artworks, _ := s.repo.GetArtworks(ctx, a.ID)
	gallery := make([]string, 0, len(artworks))
	for _, aw := range artworks {
		gallery = append(gallery, aw.ImageUrl)
	}
	return model.AdminArtistResponse{
		ID:               a.ID,
		Slug:             a.Slug,
		City:             a.City,
		Country:          a.Country,
		AvatarURL:        a.AvatarUrl,
		FeaturedImageURL: a.FeaturedImageUrl,
		InstagramUrl:     a.InstagramUrl,
		Genre:            a.Genre,
		Nationality:      a.Nationality,
		FacebookUrl:      a.FacebookUrl,
		TwitterUrl:       a.TwitterUrl,
		YoutubeUrl:       a.YoutubeUrl,
		TiktokUrl:        a.TiktokUrl,
		WebsiteUrl:       a.WebsiteUrl,
		SpotifyUrl:       a.SpotifyUrl,
		SoundcloudUrl:    a.SoundcloudUrl,
		VideoUrl:         a.VideoUrl,
		Gallery:          gallery,
		IsPublished:      a.Status == db.ProductStatusPUBLISHED,
		Translations:     trans,
		CreatedAt:        a.CreatedAt.Time,
	}
}

func (s *ArtistsService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminArtistResponse], *types.AppError) {
	rows, err := s.repo.AdminList(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch artists")
	}
	var total int
	results := make([]model.AdminArtistResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 && row.TotalCount > 0 {
			total = int(row.TotalCount)
		}
		aObj := row.Artist
		results = append(results, s.toAdminArtistResponse(ctx, &aObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *ArtistsService) AdminGetByID(ctx context.Context, id string) (*model.AdminArtistResponse, *types.AppError) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Artist not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminArtistResponse(ctx, a)
	return &res, nil
}

func (s *ArtistsService) AdminCreate(ctx context.Context, input model.AdminArtistInput) (*model.AdminArtistResponse, *types.AppError) {
	slug := ""
	if len(input.Translations) > 0 {
		slug = input.Translations[0].Slug
	}
	if slug == "" {
		return nil, types.BadRequest("Slug is required")
	}
	status := db.ProductStatusDRAFT
	if input.IsPublished {
		status = db.ProductStatusPUBLISHED
	}
	a, err := s.repo.Create(ctx, db.CreateArtistParams{
		ID:               uuid.New().String(),
		Slug:             slug,
		City:             input.City,
		Country:          input.Country,
		AvatarUrl:        input.AvatarURL,
		FeaturedImageUrl: input.FeaturedImageURL,
		Status:           status,
		Genre:            input.Genre,
		Nationality:      input.Nationality,
		FacebookUrl:      input.FacebookUrl,
		TwitterUrl:       input.TwitterUrl,
		YoutubeUrl:       input.YoutubeUrl,
		TiktokUrl:        input.TiktokUrl,
		WebsiteUrl:       input.WebsiteUrl,
		SpotifyUrl:       input.SpotifyUrl,
		SoundcloudUrl:    input.SoundcloudUrl,
		VideoUrl:         input.VideoUrl,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create artist")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertArtistTranslationParams{
			ID:       uuid.New().String(),
			ArtistId: a.ID,
			Locale:   db.Locale(t.Locale),
			Name:     t.Title,
			Bio:      t.Description,
		})
	}
	for i, url := range input.Gallery {
		_ = s.repo.AddArtwork(ctx, db.AddArtistArtworkParams{
			ID:       uuid.New().String(),
			ArtistId: a.ID,
			ImageUrl: url,
			Position: int32(i),
		})
	}
	s.ClearCache(ctx)
	res := s.toAdminArtistResponse(ctx, a)
	return &res, nil
}

func (s *ArtistsService) AdminUpdate(ctx context.Context, id string, input model.AdminArtistInput) (*model.AdminArtistResponse, *types.AppError) {
	status := db.ProductStatusDRAFT
	if input.IsPublished {
		status = db.ProductStatusPUBLISHED
	}
	statusPtr := &status

	var newSlug *string
	for _, t := range input.Translations {
		if t.Slug != "" {
			sl := t.Slug
			newSlug = &sl
			break
		}
	}

	a, err := s.repo.Update(ctx, db.UpdateArtistParams{
		ID:               id,
		Slug:             newSlug,
		City:             input.City,
		Country:          input.Country,
		AvatarUrl:        input.AvatarURL,
		FeaturedImageUrl: input.FeaturedImageURL,
		InstagramUrl:     input.InstagramUrl,
		Genre:            input.Genre,
		Nationality:      input.Nationality,
		FacebookUrl:      input.FacebookUrl,
		TwitterUrl:       input.TwitterUrl,
		YoutubeUrl:       input.YoutubeUrl,
		TiktokUrl:        input.TiktokUrl,
		WebsiteUrl:       input.WebsiteUrl,
		SpotifyUrl:       input.SpotifyUrl,
		SoundcloudUrl:    input.SoundcloudUrl,
		VideoUrl:         input.VideoUrl,
		Status:           statusPtr,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Artist not found")
		}
		return nil, types.InternalError("Failed to update artist")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertArtistTranslationParams{
			ID:       uuid.New().String(),
			ArtistId: a.ID,
			Locale:   db.Locale(t.Locale),
			Name:     t.Title,
			Bio:      t.Description,
		})
	}
	_ = s.repo.ClearArtworks(ctx, a.ID)
	for i, url := range input.Gallery {
		_ = s.repo.AddArtwork(ctx, db.AddArtistArtworkParams{
			ID:       uuid.New().String(),
			ArtistId: a.ID,
			ImageUrl: url,
			Position: int32(i),
		})
	}
	s.ClearCache(ctx)
	res := s.toAdminArtistResponse(ctx, a)
	return &res, nil
}

func (s *ArtistsService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete artist")
	}
	s.ClearCache(ctx)
	return nil
}

func (s *ArtistsService) assemble(ctx context.Context, a *db.Artist) model.ArtistResponse {
	translations, _ := s.repo.GetTranslations(ctx, a.ID)
	artworks, _ := s.repo.GetArtworks(ctx, a.ID)

	trans := make([]model.ArtistTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.ArtistTranslation{Locale: string(t.Locale), Name: t.Name, Bio: t.Bio})
	}
	arts := make([]model.ArtistArtwork, 0, len(artworks))
	for _, aw := range artworks {
		arts = append(arts, model.ArtistArtwork{ID: aw.ID, ImageURL: aw.ImageUrl, Position: aw.Position})
	}
	return model.ArtistResponse{
		ID:               a.ID,
		Slug:             a.Slug,
		City:             a.City,
		Country:          a.Country,
		FeaturedImageURL: a.FeaturedImageUrl,
		AvatarURL:        a.AvatarUrl,
		InstagramURL:     a.InstagramUrl,
		Genre:            a.Genre,
		Nationality:      a.Nationality,
		FacebookUrl:      a.FacebookUrl,
		TwitterUrl:       a.TwitterUrl,
		YoutubeUrl:       a.YoutubeUrl,
		TiktokUrl:        a.TiktokUrl,
		WebsiteUrl:       a.WebsiteUrl,
		SpotifyUrl:       a.SpotifyUrl,
		SoundcloudUrl:    a.SoundcloudUrl,
		VideoUrl:         a.VideoUrl,
		Status:           string(a.Status),
		Translations:     trans,
		Artworks:         arts,
		CreatedAt:        a.CreatedAt.Time,
	}
}

package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type FestivalService struct {
	repo *repository.FestivalRepository
}

func NewFestivalService(repo *repository.FestivalRepository) *FestivalService {
	return &FestivalService{repo: repo}
}

func (s *FestivalService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.FestivalResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch festival editions")
	}
	var total int
	results := make([]model.FestivalResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID)
		feObj := db.FestivalEdition{
			ID:            row.ID,
			Slug:          row.Slug,
			EditionNumber: row.EditionNumber,
			Year:          row.Year,
			City:          row.City,
			Country:       row.Country,
			Status:        row.Status,
			MainImage:     row.MainImage,
			HeroImage:     row.HeroImage,
			Gallery:       row.Gallery,
			Typography:    row.Typography,
			CreatedAt:     row.CreatedAt,
			UpdatedAt:     row.UpdatedAt,
		}
		results = append(results, toFestivalResponse(&feObj, translations))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *FestivalService) GetBySlug(ctx context.Context, slug string) (*model.FestivalResponse, *types.AppError) {
	f, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Festival edition not found")
		}
		return nil, types.InternalError("Database error")
	}
	translations, _ := s.repo.GetTranslations(ctx, f.ID)
	res := toFestivalResponse(f, translations)
	return &res, nil
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *FestivalService) toAdminResponse(ctx context.Context, f *db.FestivalEdition) model.AdminFestivalResponse {
	translations, _ := s.repo.GetTranslations(ctx, f.ID)
	trans := make([]model.AdminFestivalTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.AdminFestivalTranslation{
			Locale: string(t.Locale), Title: t.ThemeName, Slug: f.Slug,
			ThemeName: t.ThemeName, Summary: t.Summary, Content: t.Content,
		})
	}
	var gallery []string
	if len(f.Gallery) > 0 {
		_ = json.Unmarshal(f.Gallery, &gallery)
	}
	return model.AdminFestivalResponse{
		ID: f.ID, Slug: f.Slug, Year: f.Year, Location: f.City,
		IsPublished:      f.Status == db.ProductStatusPUBLISHED,
		FeaturedImageUrl: f.MainImage,
		Gallery:          gallery,
		Translations:     trans,
		CreatedAt:        f.CreatedAt.Time,
	}
}

func (s *FestivalService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminFestivalResponse], *types.AppError) {
	rows, err := s.repo.AdminList(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch festival editions")
	}
	var total int
	results := make([]model.AdminFestivalResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 && row.TotalCount > 0 {
			total = int(row.TotalCount)
		}
		fObj := row.FestivalEdition
		results = append(results, s.toAdminResponse(ctx, &fObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *FestivalService) AdminGetByID(ctx context.Context, id string) (*model.AdminFestivalResponse, *types.AppError) {
	f, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Festival edition not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminResponse(ctx, f)
	return &res, nil
}

func (s *FestivalService) AdminCreate(ctx context.Context, input model.AdminFestivalInput) (*model.AdminFestivalResponse, *types.AppError) {
	slug := ""
	if len(input.Translations) > 0 {
		slug = input.Translations[0].Slug
	}
	if slug == "" {
		return nil, types.BadRequest("Slug is required")
	}
	year := input.Year
	if year == 0 {
		year = int32(time.Now().Year())
	}
	status := db.ProductStatusDRAFT
	if input.IsPublished {
		status = db.ProductStatusPUBLISHED
	}
	galleryJSON, _ := json.Marshal(input.Gallery)
	f, err := s.repo.Create(ctx, db.CreateFestivalEditionParams{
		ID: uuid.New().String(), Slug: slug,
		Year: year, Country: "SN", Status: status,
		City: input.Location, MainImage: input.MainImage,
		Gallery: galleryJSON, Typography: []byte("[]"),
	})
	if err != nil {
		return nil, types.InternalError("Failed to create festival edition")
	}
	for _, t := range input.Translations {
		themeName := t.Title
		_ = s.repo.UpsertTranslation(ctx, db.UpsertFestivalTranslationParams{
			ID: uuid.New().String(), FestivalEditionId: f.ID,
			Locale: db.Locale(t.Locale), ThemeName: themeName,
			Summary: t.Description, Content: t.Content,
		})
	}
	res := s.toAdminResponse(ctx, f)
	return &res, nil
}

func (s *FestivalService) AdminUpdate(ctx context.Context, id string, input model.AdminFestivalInput) (*model.AdminFestivalResponse, *types.AppError) {
	status := db.NullProductStatus{Valid: true, ProductStatus: db.ProductStatusDRAFT}
	if input.IsPublished {
		status.ProductStatus = db.ProductStatusPUBLISHED
	}
	galleryJSON, _ := json.Marshal(input.Gallery)
	f, err := s.repo.Update(ctx, db.UpdateFestivalEditionParams{
		ID: id, City: input.Location, Status: status, MainImage: input.MainImage,
		Gallery: galleryJSON,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Festival edition not found")
		}
		return nil, types.InternalError("Failed to update festival edition")
	}
	for _, t := range input.Translations {
		themeName := t.Title
		_ = s.repo.UpsertTranslation(ctx, db.UpsertFestivalTranslationParams{
			ID: uuid.New().String(), FestivalEditionId: f.ID,
			Locale: db.Locale(t.Locale), ThemeName: themeName,
			Summary: t.Description, Content: t.Content,
		})
	}
	res := s.toAdminResponse(ctx, f)
	return &res, nil
}

func (s *FestivalService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete festival edition")
	}
	return nil
}

func toFestivalResponse(f *db.FestivalEdition, translations []db.FestivalTranslation) model.FestivalResponse {
	trans := make([]model.FestivalTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.FestivalTranslation{
			Locale: string(t.Locale), ThemeName: t.ThemeName,
			Summary: t.Summary, Content: t.Content,
		})
	}

	var gallery []string
	if len(f.Gallery) > 0 {
		_ = json.Unmarshal(f.Gallery, &gallery)
	}
	if gallery == nil {
		gallery = make([]string, 0)
	}

	var typography []string
	if len(f.Typography) > 0 {
		_ = json.Unmarshal(f.Typography, &typography)
	}
	if typography == nil {
		typography = make([]string, 0)
	}

	return model.FestivalResponse{
		ID: f.ID, Slug: f.Slug, EditionNumber: f.EditionNumber,
		Year: f.Year, City: f.City, Country: f.Country,
		Status:    string(f.Status),
		MainImage: f.MainImage, HeroImage: f.HeroImage,
		Gallery: gallery, Typography: typography,
		Translations: trans,
		CreatedAt:    f.CreatedAt.Time,
	}
}

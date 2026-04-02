package service

import (
	"context"
	"errors"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/jackc/pgx/v5"
)

type FestivalTranslation struct {
	Locale    string  `json:"locale"`
	ThemeName string  `json:"themeName"`
	Summary   *string `json:"summary"`
	Content   *string `json:"content"`
}

type FestivalResponse struct {
	ID            string                `json:"id"`
	Slug          string                `json:"slug"`
	EditionNumber int32                 `json:"editionNumber"`
	Year          int32                 `json:"year"`
	City          *string               `json:"city"`
	Country       string                `json:"country"`
	Status        string                `json:"status"`
	Translations  []FestivalTranslation `json:"translations"`
	CreatedAt     time.Time             `json:"createdAt"`
}

type FestivalService struct {
	repo *repository.FestivalRepository
}

func NewFestivalService(repo *repository.FestivalRepository) *FestivalService {
	return &FestivalService{repo: repo}
}

func (s *FestivalService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[FestivalResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch festival editions")
	}
	var total int
	results := make([]FestivalResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID)
		feObj := db.FestivalEdition{
			ID:               row.ID,
			Slug:             row.Slug,
			EditionNumber:    row.EditionNumber,
			Year:             row.Year,
			City:             row.City,
			Country:          row.Country,
			Status:           row.Status,
			CreatedAt:        row.CreatedAt,
			UpdatedAt:        row.UpdatedAt,
		}
		results = append(results, toFestivalResponse(&feObj, translations))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *FestivalService) GetBySlug(ctx context.Context, slug string) (*FestivalResponse, *types.AppError) {
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

func toFestivalResponse(f *db.FestivalEdition, translations []db.FestivalTranslation) FestivalResponse {
	trans := make([]FestivalTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, FestivalTranslation{
			Locale: string(t.Locale), ThemeName: t.ThemeName,
			Summary: t.Summary, Content: t.Content,
		})
	}
	return FestivalResponse{
		ID: f.ID, Slug: f.Slug, EditionNumber: f.EditionNumber,
		Year: f.Year, City: f.City, Country: f.Country,
		Status: string(f.Status), Translations: trans,
		CreatedAt: f.CreatedAt.Time,
	}
}

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

// ── Response types (match packages/types/src/index.ts exactly) ──────────────

type CategoryTranslation struct {
	Locale      string  `json:"locale"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type CategorySummary struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type CategoryResponse struct {
	ID           string                `json:"id"`
	Slug         string                `json:"slug"`
	ParentID     *string               `json:"parentId"`
	Translations []CategoryTranslation `json:"translations"`
	Children     []CategorySummary     `json:"children"`
	CreatedAt    time.Time             `json:"createdAt"`
}

// ── Service ──────────────────────────────────────────────────────────────────

type CategoriesService struct {
	repo *repository.CategoriesRepository
}

func NewCategoriesService(repo *repository.CategoriesRepository) *CategoriesService {
	return &CategoriesService{repo: repo}
}

func (s *CategoriesService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[CategoryResponse], *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	offset := int32((page - 1) * limit)
	rows, err := s.repo.List(ctx, int32(limit), offset)
	if err != nil {
		return nil, types.InternalError("Failed to fetch categories")
	}

	var total int
	results := make([]CategoryResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID, locale)
		children, _ := s.repo.GetChildren(ctx, row.ID)

		catObj := db.Category{
			ID:        row.ID,
			Slug:      row.Slug,
			ParentId:  row.ParentId,
			CreatedAt: row.CreatedAt,
			UpdatedAt: row.UpdatedAt,
		}
		cr := toCategoryResponse(&catObj, translations, children)
		results = append(results, cr)
	}

	return types.Paginate(results, total, page, limit), nil
}

func (s *CategoriesService) GetBySlug(ctx context.Context, slug string) (*CategoryResponse, *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	cat, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Category not found")
		}
		return nil, types.InternalError("Database error")
	}

	translations, _ := s.repo.GetTranslations(ctx, cat.ID, locale)
	children, _ := s.repo.GetChildren(ctx, cat.ID)
	res := toCategoryResponse(cat, translations, children)
	return &res, nil
}

func toCategoryResponse(c *db.Category, translations []db.CategoryTranslation, children []db.Category) CategoryResponse {
	trans := make([]CategoryTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, CategoryTranslation{
			Locale:      string(t.Locale),
			Name:        t.Name,
			Description: t.Description,
		})
	}
	ch := make([]CategorySummary, 0, len(children))
	for _, kid := range children {
		ch = append(ch, CategorySummary{ID: kid.ID, Slug: kid.Slug})
	}
	return CategoryResponse{
		ID:           c.ID,
		Slug:         c.Slug,
		ParentID:     c.ParentId,
		Translations: trans,
		Children:     ch,
		CreatedAt:    c.CreatedAt.Time,
	}
}

package service

import (
	"context"
	"errors"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// ── Service ──────────────────────────────────────────────────────────────────

type CategoriesService struct {
	repo *repository.CategoriesRepository
}

func NewCategoriesService(repo *repository.CategoriesRepository) *CategoriesService {
	return &CategoriesService{repo: repo}
}

func (s *CategoriesService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.CategoryResponse], *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	offset := int32((page - 1) * limit)
	rows, err := s.repo.List(ctx, int32(limit), offset)
	if err != nil {
		return nil, types.InternalError("Failed to fetch categories")
	}

	var total int
	results := make([]model.CategoryResponse, 0, len(rows))
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

func (s *CategoriesService) GetBySlug(ctx context.Context, slug string) (*model.CategoryResponse, *types.AppError) {
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

// ── Admin methods ─────────────────────────────────────────────────────────────

func (s *CategoriesService) toAdminCategoryResponse(ctx context.Context, c *db.Category) model.AdminCategoryResponse {
	translations, _ := s.repo.GetAllTranslations(ctx, c.ID)
	trans := make([]model.AdminCategoryTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.AdminCategoryTranslation{
			Locale: string(t.Locale), Title: t.Name, Slug: c.Slug, Description: t.Description,
		})
	}
	return model.AdminCategoryResponse{
		ID: c.ID, Slug: c.Slug, ParentID: c.ParentId,
		Translations: trans, CreatedAt: c.CreatedAt.Time,
	}
}

func (s *CategoriesService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminCategoryResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch categories")
	}
	var total int
	results := make([]model.AdminCategoryResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		c := db.Category{ID: row.ID, Slug: row.Slug, ParentId: row.ParentId, CreatedAt: row.CreatedAt}
		results = append(results, s.toAdminCategoryResponse(ctx, &c))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *CategoriesService) AdminGetByID(ctx context.Context, id string) (*model.AdminCategoryResponse, *types.AppError) {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Category not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminCategoryResponse(ctx, c)
	return &res, nil
}

func (s *CategoriesService) AdminCreate(ctx context.Context, input model.AdminCategoryInput) (*model.AdminCategoryResponse, *types.AppError) {
	if len(input.Translations) == 0 {
		return nil, types.BadRequest("At least one translation is required")
	}
	slug := input.Translations[0].Slug
	if slug == "" {
		return nil, types.BadRequest("Slug is required")
	}
	c, err := s.repo.Create(ctx, db.CreateCategoryParams{
		ID: uuid.New().String(), Slug: slug, ParentId: input.ParentID,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, types.Conflict("A category with this slug already exists")
		}
		return nil, types.InternalError("Failed to create category")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertCategoryTranslationParams{
			ID: uuid.New().String(), CategoryId: c.ID, Locale: db.Locale(t.Locale),
			Name: t.Title, Description: t.Description,
		})
	}
	res := s.toAdminCategoryResponse(ctx, c)
	return &res, nil
}

func (s *CategoriesService) AdminUpdate(ctx context.Context, id string, input model.AdminCategoryInput) (*model.AdminCategoryResponse, *types.AppError) {
	slug := ""
	if len(input.Translations) > 0 {
		slug = input.Translations[0].Slug
	}
	c, err := s.repo.Update(ctx, db.UpdateCategoryParams{ID: id, Slug: &slug, ParentId: input.ParentID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Category not found")
		}
		return nil, types.InternalError("Failed to update category")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertCategoryTranslationParams{
			ID: uuid.New().String(), CategoryId: id, Locale: db.Locale(t.Locale),
			Name: t.Title, Description: t.Description,
		})
	}
	res := s.toAdminCategoryResponse(ctx, c)
	return &res, nil
}

func (s *CategoriesService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete category")
	}
	return nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func toCategoryResponse(c *db.Category, translations []db.CategoryTranslation, children []db.Category) model.CategoryResponse {
	trans := make([]model.CategoryTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.CategoryTranslation{
			Locale:      string(t.Locale),
			Name:        t.Name,
			Description: t.Description,
		})
	}
	ch := make([]model.CategorySummary, 0, len(children))
	for _, kid := range children {
		ch = append(ch, model.CategorySummary{ID: kid.ID, Slug: kid.Slug})
	}
	return model.CategoryResponse{
		ID:           c.ID,
		Slug:         c.Slug,
		ParentID:     c.ParentId,
		Translations: trans,
		Children:     ch,
		CreatedAt:    c.CreatedAt.Time,
	}
}

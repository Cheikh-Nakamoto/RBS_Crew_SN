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
)

type PagesService struct {
	repo *repository.PagesRepository
}

func NewPagesService(repo *repository.PagesRepository) *PagesService {
	return &PagesService{repo: repo}
}

func (s *PagesService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.PageResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch pages")
	}
	var total int
	results := make([]model.PageResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID)
		pObj := db.Page{
			ID:        row.ID,
			Slug:      row.Slug,
			Template:  row.Template,
			Status:    row.Status,
			WpId:      row.WpId,
			ParentId:  row.ParentId,
			MenuOrder: row.MenuOrder,
			CreatedAt: row.CreatedAt,
			UpdatedAt: row.UpdatedAt,
		}
		results = append(results, toPageResponse(&pObj, translations))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *PagesService) GetBySlug(ctx context.Context, slug string) (*model.PageResponse, *types.AppError) {
	p, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Page not found")
		}
		return nil, types.InternalError("Database error")
	}
	translations, _ := s.repo.GetTranslations(ctx, p.ID)
	res := toPageResponse(p, translations)
	return &res, nil
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *PagesService) toAdminResponse(ctx context.Context, p *db.Page) model.AdminPageResponse {
	translations, _ := s.repo.GetTranslations(ctx, p.ID)
	trans := make([]model.AdminPageTranslation, 0, len(translations))
	for _, t := range translations {
		content := &t.Content
		trans = append(trans, model.AdminPageTranslation{
			Locale: string(t.Locale), Title: t.Title, Slug: t.Slug,
			Content: content, MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	return model.AdminPageResponse{
		ID: p.ID, IsPublished: p.Status == db.ProductStatusPUBLISHED,
		Translations: trans, CreatedAt: p.CreatedAt.Time,
	}
}

func (s *PagesService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminPageResponse], *types.AppError) {
	rows, err := s.repo.AdminList(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch pages")
	}
	var total int
	results := make([]model.AdminPageResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 && row.TotalCount > 0 {
			total = int(row.TotalCount)
		}
		pObj := row.Page
		results = append(results, s.toAdminResponse(ctx, &pObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *PagesService) AdminGetByID(ctx context.Context, id string) (*model.AdminPageResponse, *types.AppError) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Page not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminResponse(ctx, p)
	return &res, nil
}

func (s *PagesService) AdminCreate(ctx context.Context, input model.AdminPageInput) (*model.AdminPageResponse, *types.AppError) {
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
	p, err := s.repo.Create(ctx, db.CreatePageParams{
		ID: uuid.New().String(), Slug: slug, Status: status,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create page")
	}
	for _, t := range input.Translations {
		content := ""
		if t.Content != nil {
			content = *t.Content
		}
		_ = s.repo.UpsertTranslation(ctx, db.UpsertPageTranslationParams{
			ID: uuid.New().String(), PageId: p.ID,
			Locale: db.Locale(t.Locale), Title: t.Title, Slug: t.Slug,
			Content: content, MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	res := s.toAdminResponse(ctx, p)
	return &res, nil
}

func (s *PagesService) AdminUpdate(ctx context.Context, id string, input model.AdminPageInput) (*model.AdminPageResponse, *types.AppError) {
	status := db.ProductStatusDRAFT
	if input.IsPublished {
		status = db.ProductStatusPUBLISHED
	}
	p, err := s.repo.Update(ctx, db.UpdatePageParams{ID: id, Status: &status})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Page not found")
		}
		return nil, types.InternalError("Failed to update page")
	}
	for _, t := range input.Translations {
		content := ""
		if t.Content != nil {
			content = *t.Content
		}
		_ = s.repo.UpsertTranslation(ctx, db.UpsertPageTranslationParams{
			ID: uuid.New().String(), PageId: p.ID,
			Locale: db.Locale(t.Locale), Title: t.Title, Slug: t.Slug,
			Content: content, MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	res := s.toAdminResponse(ctx, p)
	return &res, nil
}

func (s *PagesService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete page")
	}
	return nil
}

func toPageResponse(p *db.Page, translations []db.PageTranslation) model.PageResponse {
	trans := make([]model.PageTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.PageTranslation{
			Locale: string(t.Locale), Title: t.Title, Slug: t.Slug,
			Content: t.Content, Excerpt: t.Excerpt,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	return model.PageResponse{
		ID: p.ID, Slug: p.Slug, Template: p.Template,
		Status: string(p.Status), MenuOrder: p.MenuOrder,
		Translations: trans, CreatedAt: p.CreatedAt.Time,
	}
}

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

// ── Service ──────────────────────────────────────────────────────────────────

type TagsService struct {
	repo *repository.TagsRepository
}

func NewTagsService(repo *repository.TagsRepository) *TagsService {
	return &TagsService{repo: repo}
}

func (s *TagsService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.TagResponse], *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch tags")
	}
	var total int
	results := make([]model.TagResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID, locale)
		trans := make([]model.TagTranslationResponse, 0, len(translations))
		for _, t := range translations {
			trans = append(trans, model.TagTranslationResponse{Locale: string(t.Locale), Name: t.Name})
		}
		results = append(results, model.TagResponse{
			ID: row.ID, Slug: row.Slug, Translations: trans, CreatedAt: row.CreatedAt.Time,
		})
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *TagsService) GetBySlug(ctx context.Context, slug string) (*model.TagResponse, *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	t, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Tag not found")
		}
		return nil, types.InternalError("Database error")
	}
	translations, _ := s.repo.GetTranslations(ctx, t.ID, locale)
	trans := make([]model.TagTranslationResponse, 0, len(translations))
	for _, tr := range translations {
		trans = append(trans, model.TagTranslationResponse{Locale: string(tr.Locale), Name: tr.Name})
	}
	return &model.TagResponse{ID: t.ID, Slug: t.Slug, Translations: trans, CreatedAt: t.CreatedAt.Time}, nil
}

// ── Admin methods ─────────────────────────────────────────────────────────────

func (s *TagsService) toAdminTagResponse(ctx context.Context, t *db.Tag) model.AdminTagResponse {
	translations, _ := s.repo.GetAllTranslations(ctx, t.ID)
	trans := make([]model.AdminTagTranslation, 0, len(translations))
	for _, tr := range translations {
		trans = append(trans, model.AdminTagTranslation{Locale: string(tr.Locale), Title: tr.Name, Slug: t.Slug})
	}
	return model.AdminTagResponse{ID: t.ID, Slug: t.Slug, Translations: trans, CreatedAt: t.CreatedAt.Time}
}

func (s *TagsService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminTagResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch tags")
	}
	var total int
	results := make([]model.AdminTagResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		t := db.Tag{ID: row.ID, Slug: row.Slug, CreatedAt: row.CreatedAt}
		results = append(results, s.toAdminTagResponse(ctx, &t))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *TagsService) AdminGetByID(ctx context.Context, id string) (*model.AdminTagResponse, *types.AppError) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Tag not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminTagResponse(ctx, t)
	return &res, nil
}

func (s *TagsService) AdminCreate(ctx context.Context, input model.AdminTagInput) (*model.AdminTagResponse, *types.AppError) {
	if len(input.Translations) == 0 {
		return nil, types.BadRequest("At least one translation is required")
	}
	slug := input.Translations[0].Slug
	if slug == "" {
		return nil, types.BadRequest("Slug is required")
	}
	t, err := s.repo.Create(ctx, db.CreateTagParams{ID: uuid.New().String(), Slug: slug})
	if err != nil {
		return nil, types.InternalError("Failed to create tag")
	}
	for _, tr := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertTagTranslationParams{
			ID: uuid.New().String(), TagId: t.ID, Locale: db.Locale(tr.Locale), Name: tr.Title,
		})
	}
	res := s.toAdminTagResponse(ctx, t)
	return &res, nil
}

func (s *TagsService) AdminUpdate(ctx context.Context, id string, input model.AdminTagInput) (*model.AdminTagResponse, *types.AppError) {
	slug := ""
	if len(input.Translations) > 0 {
		slug = input.Translations[0].Slug
	}
	t, err := s.repo.Update(ctx, db.UpdateTagParams{ID: id, Slug: slug})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Tag not found")
		}
		return nil, types.InternalError("Failed to update tag")
	}
	for _, tr := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertTagTranslationParams{
			ID: uuid.New().String(), TagId: id, Locale: db.Locale(tr.Locale), Name: tr.Title,
		})
	}
	res := s.toAdminTagResponse(ctx, t)
	return &res, nil
}

func (s *TagsService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete tag")
	}
	return nil
}

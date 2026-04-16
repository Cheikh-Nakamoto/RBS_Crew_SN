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
	"github.com/jackc/pgx/v5/pgtype"
)

type ProjectsService struct {
	repo *repository.ProjectsRepository
}

func NewProjectsService(repo *repository.ProjectsRepository) *ProjectsService {
	return &ProjectsService{repo: repo}
}

func (s *ProjectsService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.ProjectResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch projects")
	}
	var total int
	results := make([]model.ProjectResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID)
		pObj := db.Project{
			ID:               row.ID,
			Slug:             row.Slug,
			CompletedAt:      row.CompletedAt,
			ClientName:       row.ClientName,
			Status:           row.Status,
			CreatedAt:        row.CreatedAt,
			UpdatedAt:        row.UpdatedAt,
			FeaturedImageUrl: row.FeaturedImageUrl,
		}
		results = append(results, toProjectResponse(&pObj, translations))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *ProjectsService) GetBySlug(ctx context.Context, slug string) (*model.ProjectResponse, *types.AppError) {
	p, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Project not found")
		}
		return nil, types.InternalError("Database error")
	}
	translations, _ := s.repo.GetTranslations(ctx, p.ID)
	res := toProjectResponse(p, translations)
	return &res, nil
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *ProjectsService) toAdminResponse(ctx context.Context, p *db.Project) model.AdminProjectResponse {
	translations, _ := s.repo.GetTranslations(ctx, p.ID)
	trans := make([]model.AdminProjectTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.AdminProjectTranslation{
			Locale: string(t.Locale), Title: t.Title, Slug: p.Slug,
			Description: t.Summary, Content: t.Content,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	var gallery []string
	if len(p.Gallery) > 0 {
		_ = json.Unmarshal(p.Gallery, &gallery)
	}
	return model.AdminProjectResponse{
		ID: p.ID, Slug: p.Slug, FeaturedImageURL: p.FeaturedImageUrl,
		Gallery:      gallery,
		IsPublished:  p.Status == db.ProductStatusPUBLISHED,
		Translations: trans, CreatedAt: p.CreatedAt.Time,
	}
}

func (s *ProjectsService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminProjectResponse], *types.AppError) {
	rows, err := s.repo.AdminList(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch projects")
	}
	var total int
	results := make([]model.AdminProjectResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 && row.TotalCount > 0 {
			total = int(row.TotalCount)
		}
		pObj := row.Project
		results = append(results, s.toAdminResponse(ctx, &pObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *ProjectsService) AdminGetByID(ctx context.Context, id string) (*model.AdminProjectResponse, *types.AppError) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Project not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminResponse(ctx, p)
	return &res, nil
}

func (s *ProjectsService) AdminCreate(ctx context.Context, input model.AdminProjectInput) (*model.AdminProjectResponse, *types.AppError) {
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
	galleryJSON, _ := json.Marshal(input.Gallery)
	p, err := s.repo.Create(ctx, db.CreateProjectParams{
		ID: uuid.New().String(), Slug: slug,
		FeaturedImageUrl: input.FeaturedImageURL,
		Gallery:          galleryJSON,
		Status:           status,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create project")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertProjectTranslationParams{
			ID: uuid.New().String(), ProjectId: p.ID,
			Locale: db.Locale(t.Locale), Title: t.Title,
			Summary: t.Description, Content: t.Content,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	res := s.toAdminResponse(ctx, p)
	return &res, nil
}

func (s *ProjectsService) AdminUpdate(ctx context.Context, id string, input model.AdminProjectInput) (*model.AdminProjectResponse, *types.AppError) {
	status := db.NullProductStatus{Valid: true, ProductStatus: db.ProductStatusDRAFT}
	if input.IsPublished {
		status.ProductStatus = db.ProductStatusPUBLISHED
	}
	galleryJSON, _ := json.Marshal(input.Gallery)
	p, err := s.repo.Update(ctx, db.UpdateProjectParams{
		ID: id, FeaturedImageUrl: input.FeaturedImageURL,
		Gallery:     galleryJSON,
		CompletedAt: pgtype.Timestamp{}, Status: status,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Project not found")
		}
		return nil, types.InternalError("Failed to update project")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertProjectTranslationParams{
			ID: uuid.New().String(), ProjectId: p.ID,
			Locale: db.Locale(t.Locale), Title: t.Title,
			Summary: t.Description, Content: t.Content,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	res := s.toAdminResponse(ctx, p)
	return &res, nil
}

func (s *ProjectsService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete project")
	}
	return nil
}

func toProjectResponse(p *db.Project, translations []db.ProjectTranslation) model.ProjectResponse {
	trans := make([]model.ProjectTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.ProjectTranslation{
			Locale: string(t.Locale), Title: t.Title,
			Summary: t.Summary, Content: t.Content,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	var completedAt *time.Time
	if p.CompletedAt.Valid {
		t := p.CompletedAt.Time
		completedAt = &t
	}
	var gallery []string
	if len(p.Gallery) > 0 {
		_ = json.Unmarshal(p.Gallery, &gallery)
	}
	return model.ProjectResponse{
		ID: p.ID, Slug: p.Slug, FeaturedImageURL: p.FeaturedImageUrl,
		Gallery:     gallery,
		CompletedAt: completedAt, ClientName: p.ClientName,
		Status: string(p.Status), Translations: trans,
		CreatedAt: p.CreatedAt.Time,
	}
}

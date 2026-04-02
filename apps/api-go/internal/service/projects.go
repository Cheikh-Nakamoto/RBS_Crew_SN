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

type ProjectTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Summary         *string `json:"summary"`
	Content         *string `json:"content"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type ProjectResponse struct {
	ID               string               `json:"id"`
	Slug             string               `json:"slug"`
	FeaturedImageURL *string              `json:"featuredImageUrl"`
	CompletedAt      *time.Time           `json:"completedAt"`
	ClientName       *string              `json:"clientName"`
	Status           string               `json:"status"`
	Translations     []ProjectTranslation `json:"translations"`
	CreatedAt        time.Time            `json:"createdAt"`
}

type ProjectsService struct {
	repo *repository.ProjectsRepository
}

func NewProjectsService(repo *repository.ProjectsRepository) *ProjectsService {
	return &ProjectsService{repo: repo}
}

func (s *ProjectsService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[ProjectResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch projects")
	}
	var total int
	results := make([]ProjectResponse, 0, len(rows))
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

func (s *ProjectsService) GetBySlug(ctx context.Context, slug string) (*ProjectResponse, *types.AppError) {
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

func toProjectResponse(p *db.Project, translations []db.ProjectTranslation) ProjectResponse {
	trans := make([]ProjectTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, ProjectTranslation{
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
	return ProjectResponse{
		ID: p.ID, Slug: p.Slug, FeaturedImageURL: p.FeaturedImageUrl,
		CompletedAt: completedAt, ClientName: p.ClientName,
		Status: string(p.Status), Translations: trans,
		CreatedAt: p.CreatedAt.Time,
	}
}

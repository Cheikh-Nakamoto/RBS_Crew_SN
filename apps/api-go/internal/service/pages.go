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

type PageTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	Content         string  `json:"content"`
	Excerpt         *string `json:"excerpt"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type PageResponse struct {
	ID           string            `json:"id"`
	Slug         string            `json:"slug"`
	Template     *string           `json:"template"`
	Status       string            `json:"status"`
	MenuOrder    int32             `json:"menuOrder"`
	Translations []PageTranslation `json:"translations"`
	CreatedAt    time.Time         `json:"createdAt"`
}

type PagesService struct {
	repo *repository.PagesRepository
}

func NewPagesService(repo *repository.PagesRepository) *PagesService {
	return &PagesService{repo: repo}
}

func (s *PagesService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[PageResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch pages")
	}
	var total int
	results := make([]PageResponse, 0, len(rows))
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

func (s *PagesService) GetBySlug(ctx context.Context, slug string) (*PageResponse, *types.AppError) {
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

func toPageResponse(p *db.Page, translations []db.PageTranslation) PageResponse {
	trans := make([]PageTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, PageTranslation{
			Locale: string(t.Locale), Title: t.Title, Slug: t.Slug,
			Content: t.Content, Excerpt: t.Excerpt,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	return PageResponse{
		ID: p.ID, Slug: p.Slug, Template: p.Template,
		Status: string(p.Status), MenuOrder: p.MenuOrder,
		Translations: trans, CreatedAt: p.CreatedAt.Time,
	}
}

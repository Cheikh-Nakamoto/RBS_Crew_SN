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

type ServiceTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Description     string  `json:"description"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type ServiceItem struct {
	ID           string               `json:"id"`
	Slug         string               `json:"slug"`
	Icon         *string              `json:"icon"`
	Status       string               `json:"status"`
	MenuOrder    int32                `json:"menuOrder"`
	Translations []ServiceTranslation `json:"translations"`
	CreatedAt    time.Time            `json:"createdAt"`
}

type ServicesService struct {
	repo *repository.ServicesRepository
}

func NewServicesService(repo *repository.ServicesRepository) *ServicesService {
	return &ServicesService{repo: repo}
}

func (s *ServicesService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[ServiceItem], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch services")
	}
	var total int
	results := make([]ServiceItem, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		translations, _ := s.repo.GetTranslations(ctx, row.ID)
		sObj := db.Service{
			ID:        row.ID,
			Slug:      row.Slug,
			Icon:      row.Icon,
			Status:    row.Status,
			MenuOrder: row.MenuOrder,
			CreatedAt: row.CreatedAt,
			UpdatedAt: row.UpdatedAt,
		}
		results = append(results, toServiceResponse(&sObj, translations))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *ServicesService) GetBySlug(ctx context.Context, slug string) (*ServiceItem, *types.AppError) {
	svc, err := s.repo.GetBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Service not found")
		}
		return nil, types.InternalError("Database error")
	}
	translations, _ := s.repo.GetTranslations(ctx, svc.ID)
	res := toServiceResponse(svc, translations)
	return &res, nil
}

func toServiceResponse(svc *db.Service, translations []db.ServiceTranslation) ServiceItem {
	trans := make([]ServiceTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, ServiceTranslation{
			Locale: string(t.Locale), Title: t.Title, Description: t.Description,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	return ServiceItem{
		ID: svc.ID, Slug: svc.Slug, Icon: svc.Icon,
		Status: string(svc.Status), MenuOrder: svc.MenuOrder,
		Translations: trans, CreatedAt: svc.CreatedAt.Time,
	}
}

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

type ServicesService struct {
	repo *repository.ServicesRepository
}

func NewServicesService(repo *repository.ServicesRepository) *ServicesService {
	return &ServicesService{repo: repo}
}

func (s *ServicesService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.ServiceItem], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch services")
	}
	var total int
	results := make([]model.ServiceItem, 0, len(rows))
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

func (s *ServicesService) GetBySlug(ctx context.Context, slug string) (*model.ServiceItem, *types.AppError) {
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

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *ServicesService) toAdminResponse(ctx context.Context, svc *db.Service) model.AdminServiceResponse {
	translations, _ := s.repo.GetTranslations(ctx, svc.ID)
	trans := make([]model.AdminServiceTranslation, 0, len(translations))
	for _, t := range translations {
		desc := &t.Description
		trans = append(trans, model.AdminServiceTranslation{
			Locale: string(t.Locale), Title: t.Title, Slug: svc.Slug,
			Description: desc, MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	return model.AdminServiceResponse{
		ID: svc.ID, IsPublished: svc.Status == db.ProductStatusPUBLISHED,
		Translations: trans, CreatedAt: svc.CreatedAt.Time,
	}
}

func (s *ServicesService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.AdminServiceResponse], *types.AppError) {
	rows, err := s.repo.AdminList(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch services")
	}
	var total int
	results := make([]model.AdminServiceResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 && row.TotalCount > 0 {
			total = int(row.TotalCount)
		}
		sObj := row.Service
		results = append(results, s.toAdminResponse(ctx, &sObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *ServicesService) AdminGetByID(ctx context.Context, id string) (*model.AdminServiceResponse, *types.AppError) {
	svc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Service not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminResponse(ctx, svc)
	return &res, nil
}

func (s *ServicesService) AdminCreate(ctx context.Context, input model.AdminServiceInput) (*model.AdminServiceResponse, *types.AppError) {
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
	svc, err := s.repo.Create(ctx, db.CreateServiceParams{
		ID: uuid.New().String(), Slug: slug, Status: status,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create service")
	}
	for _, t := range input.Translations {
		desc := ""
		if t.Description != nil {
			desc = *t.Description
		}
		_ = s.repo.UpsertTranslation(ctx, db.UpsertServiceTranslationParams{
			ID: uuid.New().String(), ServiceId: svc.ID,
			Locale: db.Locale(t.Locale), Title: t.Title, Description: desc,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	res := s.toAdminResponse(ctx, svc)
	return &res, nil
}

func (s *ServicesService) AdminUpdate(ctx context.Context, id string, input model.AdminServiceInput) (*model.AdminServiceResponse, *types.AppError) {
	status := db.ProductStatusDRAFT
	if input.IsPublished {
		status = db.ProductStatusPUBLISHED
	}
	svc, err := s.repo.Update(ctx, db.UpdateServiceParams{ID: id, Status: &status})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Service not found")
		}
		return nil, types.InternalError("Failed to update service")
	}
	for _, t := range input.Translations {
		desc := ""
		if t.Description != nil {
			desc = *t.Description
		}
		_ = s.repo.UpsertTranslation(ctx, db.UpsertServiceTranslationParams{
			ID: uuid.New().String(), ServiceId: svc.ID,
			Locale: db.Locale(t.Locale), Title: t.Title, Description: desc,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	res := s.toAdminResponse(ctx, svc)
	return &res, nil
}

func (s *ServicesService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete service")
	}
	return nil
}

func toServiceResponse(svc *db.Service, translations []db.ServiceTranslation) model.ServiceItem {
	trans := make([]model.ServiceTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.ServiceTranslation{
			Locale: string(t.Locale), Title: t.Title, Description: t.Description,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	return model.ServiceItem{
		ID: svc.ID, Slug: svc.Slug, Icon: svc.Icon,
		Status: string(svc.Status), MenuOrder: svc.MenuOrder,
		Translations: trans, CreatedAt: svc.CreatedAt.Time,
	}
}

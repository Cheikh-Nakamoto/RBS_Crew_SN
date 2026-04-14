package service

import (
	"context"
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

type PressService struct {
	repo *repository.PressRepository
}

func NewPressService(repo *repository.PressRepository) *PressService {
	return &PressService{repo: repo}
}

func (s *PressService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.PressResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch press mentions")
	}
	var total int
	results := make([]model.PressResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		pmObj := db.PressMention{
			ID:               row.ID,
			Title:            row.Title,
			Source:           row.Source,
			SourceUrl:        row.SourceUrl,
			LogoUrl:          row.LogoUrl,
			FeaturedImageUrl: row.FeaturedImageUrl,
			Excerpt:          row.Excerpt,
			Date:             row.Date,
			CreatedAt:        row.CreatedAt,
		}
		results = append(results, toPressResponse(&pmObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *PressService) GetByID(ctx context.Context, id string) (*model.PressResponse, *types.AppError) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Press mention not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := toPressResponse(p)
	return &res, nil
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

func (s *PressService) AdminList(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.PressResponse], *types.AppError) {
	return s.List(ctx, page, limit)
}

func (s *PressService) AdminCreate(ctx context.Context, input model.AdminPressInput) (*model.PressResponse, *types.AppError) {
	var date pgtype.Timestamp
	if input.PublishedAt != nil && *input.PublishedAt != "" {
		if t, err := time.Parse(time.RFC3339, *input.PublishedAt); err == nil {
			date = pgtype.Timestamp{Time: t, Valid: true}
		}
	}
	p, err := s.repo.Create(ctx, db.CreatePressMentionParams{
		ID:               uuid.New().String(),
		Title:            input.Title,
		Source:           input.Source,
		SourceUrl:        input.SourceURL,
		LogoUrl:          input.LogoURL,
		FeaturedImageUrl: input.FeaturedImageURL,
		Excerpt:          input.Excerpt,
		Date:             date,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create press mention")
	}
	res := toPressResponse(p)
	return &res, nil
}

func (s *PressService) AdminUpdate(ctx context.Context, id string, input model.AdminPressInput) (*model.PressResponse, *types.AppError) {
	var date pgtype.Timestamp
	if input.PublishedAt != nil && *input.PublishedAt != "" {
		if t, err := time.Parse(time.RFC3339, *input.PublishedAt); err == nil {
			date = pgtype.Timestamp{Time: t, Valid: true}
		}
	}
	p, err := s.repo.Update(ctx, db.UpdatePressMentionParams{
		ID:               id,
		Title:            &input.Title,
		Source:           &input.Source,
		SourceUrl:        &input.SourceURL,
		LogoUrl:          input.LogoURL,
		FeaturedImageUrl: input.FeaturedImageURL,
		Excerpt:          input.Excerpt,
		Date:             date,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Press mention not found")
		}
		return nil, types.InternalError("Failed to update press mention")
	}
	res := toPressResponse(p)
	return &res, nil
}

func (s *PressService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete press mention")
	}
	return nil
}

func toPressResponse(p *db.PressMention) model.PressResponse {
	var date *time.Time
	if p.Date.Valid {
		t := p.Date.Time
		date = &t
	}
	return model.PressResponse{
		ID: p.ID, Title: p.Title, Source: p.Source,
		SourceURL: p.SourceUrl, LogoURL: p.LogoUrl,
		FeaturedImageURL: p.FeaturedImageUrl,
		Excerpt:          p.Excerpt, Date: date, CreatedAt: p.CreatedAt.Time,
	}
}

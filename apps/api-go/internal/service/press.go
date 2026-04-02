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

type PressResponse struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Source    string     `json:"source"`
	SourceURL string     `json:"sourceUrl"`
	LogoURL   *string    `json:"logoUrl"`
	Excerpt   *string    `json:"excerpt"`
	Date      *time.Time `json:"date"`
	CreatedAt time.Time  `json:"createdAt"`
}

type PressService struct {
	repo *repository.PressRepository
}

func NewPressService(repo *repository.PressRepository) *PressService {
	return &PressService{repo: repo}
}

func (s *PressService) List(ctx context.Context, page, limit int) (*types.PaginatedResponse[PressResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch press mentions")
	}
	var total int
	results := make([]PressResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		pmObj := db.PressMention{
			ID:        row.ID,
			Title:     row.Title,
			Source:    row.Source,
			SourceUrl: row.SourceUrl,
			LogoUrl:   row.LogoUrl,
			Excerpt:   row.Excerpt,
			Date:      row.Date,
			CreatedAt: row.CreatedAt,
		}
		results = append(results, toPressResponse(&pmObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *PressService) GetByID(ctx context.Context, id string) (*PressResponse, *types.AppError) {
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

func toPressResponse(p *db.PressMention) PressResponse {
	var date *time.Time
	if p.Date.Valid {
		t := p.Date.Time
		date = &t
	}
	return PressResponse{
		ID: p.ID, Title: p.Title, Source: p.Source,
		SourceURL: p.SourceUrl, LogoURL: p.LogoUrl,
		Excerpt: p.Excerpt, Date: date, CreatedAt: p.CreatedAt.Time,
	}
}

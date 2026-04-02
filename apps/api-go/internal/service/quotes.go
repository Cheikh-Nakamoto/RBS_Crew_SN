package service

import (
	"context"
	"errors"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type CreateQuoteDTO struct {
	Name         string     `json:"name"      validate:"required"`
	Surname      *string    `json:"surname"`
	Email        string     `json:"email"     validate:"required,email"`
	Phone        *string    `json:"phone"`
	Company      *string    `json:"company"`
	OrderType    string     `json:"orderType" validate:"required"`
	Quantity     *int32     `json:"quantity"`
	DeliveryDate *time.Time `json:"deliveryDate"`
	Message      string     `json:"message"   validate:"required"`
}

type QuoteResponse struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Surname      *string    `json:"surname"`
	Email        string     `json:"email"`
	Phone        *string    `json:"phone"`
	Company      *string    `json:"company"`
	OrderType    string     `json:"orderType"`
	Quantity     *int32     `json:"quantity"`
	DeliveryDate *time.Time `json:"deliveryDate"`
	Message      string     `json:"message"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type QuotesService struct {
	repo *repository.QuotesRepository
}

func NewQuotesService(repo *repository.QuotesRepository) *QuotesService {
	return &QuotesService{repo: repo}
}

func (s *QuotesService) Create(ctx context.Context, dto CreateQuoteDTO) (*QuoteResponse, *types.AppError) {
	params := db.CreateQuoteParams{
		ID:        uuid.New().String(),
		Name:      dto.Name,
		Surname:   dto.Surname,
		Email:     dto.Email,
		Phone:     dto.Phone,
		Company:   dto.Company,
		OrderType: dto.OrderType,
		Quantity:  dto.Quantity,
		Message:   dto.Message,
	}
	if dto.DeliveryDate != nil {
		params.DeliveryDate = pgtype.Timestamp{Time: *dto.DeliveryDate, Valid: true}
	}

	q, err := s.repo.Create(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to create quote")
	}
	res := toQuoteResponse(q)
	return &res, nil
}

func (s *QuotesService) FindAll(ctx context.Context, page, limit int) (*types.PaginatedResponse[QuoteResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch quotes")
	}
	var total int
	results := make([]QuoteResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		qObj := db.Quote{
			ID:           row.ID,
			Name:         row.Name,
			Surname:      row.Surname,
			Email:        row.Email,
			Phone:        row.Phone,
			Company:      row.Company,
			OrderType:    row.OrderType,
			Quantity:     row.Quantity,
			DeliveryDate: row.DeliveryDate,
			Message:      row.Message,
			Status:       row.Status,
			CreatedAt:    row.CreatedAt,
			UpdatedAt:    row.UpdatedAt,
		}
		results = append(results, toQuoteResponse(&qObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *QuotesService) FindOne(ctx context.Context, id string) (*QuoteResponse, *types.AppError) {
	q, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Quote not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := toQuoteResponse(q)
	return &res, nil
}

func (s *QuotesService) UpdateStatus(ctx context.Context, id, status string) (*QuoteResponse, *types.AppError) {
	q, err := s.repo.UpdateStatus(ctx, id, status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Quote not found")
		}
		return nil, types.InternalError("Failed to update quote")
	}
	res := toQuoteResponse(q)
	return &res, nil
}

func toQuoteResponse(q *db.Quote) QuoteResponse {
	var deliveryDate *time.Time
	if q.DeliveryDate.Valid {
		t := q.DeliveryDate.Time
		deliveryDate = &t
	}
	return QuoteResponse{
		ID: q.ID, Name: q.Name, Surname: q.Surname,
		Email: q.Email, Phone: q.Phone, Company: q.Company,
		OrderType: q.OrderType, Quantity: q.Quantity,
		DeliveryDate: deliveryDate, Message: q.Message,
		Status: q.Status, CreatedAt: q.CreatedAt.Time,
	}
}

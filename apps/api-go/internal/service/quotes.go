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

type QuotesService struct {
	repo     *repository.QuotesRepository
	notifier *NotificationsService
	// authRepo résout le compte utilisateur à partir de l'e-mail du devis :
	// la table Quote n'a pas de userId (formulaire public).
	authRepo *repository.AuthRepository
}

func NewQuotesService(repo *repository.QuotesRepository) *QuotesService {
	return &QuotesService{repo: repo}
}

func (s *QuotesService) WithNotifier(n *NotificationsService, authRepo *repository.AuthRepository) *QuotesService {
	s.notifier = n
	s.authRepo = authRepo
	return s
}

// notifyQuoteAnswered prévient le demandeur si — et seulement si — un compte
// existe pour l'e-mail du devis. Un devis déposé par quelqu'un sans compte ne
// déclenche rien (aucune boîte de réception in-app où l'afficher).
func (s *QuotesService) notifyQuoteAnswered(ctx context.Context, q *db.Quote) {
	if s.notifier == nil || s.authRepo == nil {
		return
	}
	user, err := s.authRepo.GetUserByEmail(ctx, q.Email)
	if err != nil || user == nil {
		return
	}
	s.notifier.Notify(user.ID, NotificationQuoteReply,
		"Votre demande de devis a reçu une réponse",
		"Nous avons répondu à votre demande — consultez votre e-mail.", "/profile")
}

func (s *QuotesService) Create(ctx context.Context, dto model.CreateQuoteDTO) (*model.QuoteResponse, *types.AppError) {
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

func (s *QuotesService) FindAll(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.QuoteResponse], *types.AppError) {
	rows, err := s.repo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch quotes")
	}
	var total int
	results := make([]model.QuoteResponse, 0, len(rows))
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

func (s *QuotesService) FindOne(ctx context.Context, id string) (*model.QuoteResponse, *types.AppError) {
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

func (s *QuotesService) Delete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return types.NotFound("Quote not found")
		}
		return types.InternalError("Failed to delete quote")
	}
	return nil
}

func (s *QuotesService) UpdateStatus(ctx context.Context, id, status string) (*model.QuoteResponse, *types.AppError) {
	q, err := s.repo.UpdateStatus(ctx, id, status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Quote not found")
		}
		return nil, types.InternalError("Failed to update quote")
	}
	// Le passage à « Répondu » est le seul changement qui intéresse le client.
	if status == "ANSWERED" {
		s.notifyQuoteAnswered(ctx, q)
	}
	res := toQuoteResponse(q)
	return &res, nil
}

func toQuoteResponse(q *db.Quote) model.QuoteResponse {
	var deliveryDate *time.Time
	if q.DeliveryDate.Valid {
		t := q.DeliveryDate.Time
		deliveryDate = &t
	}
	return model.QuoteResponse{
		ID: q.ID, Name: q.Name, Surname: q.Surname,
		Email: q.Email, Phone: q.Phone, Company: q.Company,
		OrderType: q.OrderType, Quantity: q.Quantity,
		DeliveryDate: deliveryDate, Message: q.Message,
		Status: q.Status, CreatedAt: q.CreatedAt.Time,
	}
}

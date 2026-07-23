package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
)

// Types de notification. Texte libre côté base, mais centralisé ici pour éviter
// les fautes de frappe aux points d'émission.
const (
	NotificationOrderStatus   = "ORDER_STATUS"
	NotificationQuoteReply    = "QUOTE_REPLY"
	NotificationArtistClaim   = "ARTIST_CLAIM"
	NotificationEmailVerified = "EMAIL_VERIFIED"
)

type NotificationsService struct {
	repo *repository.NotificationRepository
}

func NewNotificationsService(repo *repository.NotificationRepository) *NotificationsService {
	return &NotificationsService{repo: repo}
}

// Notify écrit une notification en tâche de fond. Volontairement fire-and-forget
// (comme ActivityLogger) : la création d'une notification ne doit jamais bloquer
// ni faire échouer l'action métier qui la déclenche (changement de statut,
// réponse à un devis…). Une erreur d'écriture est journalisée, pas propagée.
func (s *NotificationsService) Notify(userID, ntype, title, body, link string) {
	if userID == "" {
		return
	}
	var linkPtr *string
	if link != "" {
		linkPtr = &link
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := s.repo.Create(ctx, &repository.Notification{
			ID:      uuid.New().String(),
			UserID:  userID,
			Type:    ntype,
			Title:   title,
			Body:    body,
			LinkURL: linkPtr,
		}); err != nil {
			slog.Error("notifications: create failed", "error", err, "userId", userID, "type", ntype)
		}
	}()
}

func (s *NotificationsService) List(ctx context.Context, userID string, limit, offset int32) ([]model.NotificationResponse, int64, int64, *types.AppError) {
	notifs, total, err := s.repo.ListByUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, 0, types.InternalError("Failed to fetch notifications")
	}
	unread, err := s.repo.CountUnread(ctx, userID)
	if err != nil {
		return nil, 0, 0, types.InternalError("Failed to count notifications")
	}

	items := make([]model.NotificationResponse, 0, len(notifs))
	for _, n := range notifs {
		items = append(items, model.NotificationResponse{
			ID:        n.ID,
			Type:      n.Type,
			Title:     n.Title,
			Body:      n.Body,
			LinkURL:   n.LinkURL,
			ReadAt:    n.ReadAt,
			CreatedAt: n.CreatedAt,
		})
	}
	return items, total, unread, nil
}

func (s *NotificationsService) MarkRead(ctx context.Context, id, userID string) *types.AppError {
	affected, err := s.repo.MarkRead(ctx, id, userID)
	if err != nil {
		return types.InternalError("Failed to update notification")
	}
	if affected == 0 {
		return types.NotFound("Notification introuvable")
	}
	return nil
}

func (s *NotificationsService) MarkAllRead(ctx context.Context, userID string) *types.AppError {
	if err := s.repo.MarkAllRead(ctx, userID); err != nil {
		return types.InternalError("Failed to update notifications")
	}
	return nil
}

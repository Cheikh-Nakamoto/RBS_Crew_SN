package handler

import (
	"net/http"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

type ActivityLogsHandler struct {
	repo *repository.ActivityLogRepository
}

func NewActivityLogsHandler(repo *repository.ActivityLogRepository) *ActivityLogsHandler {
	return &ActivityLogsHandler{repo: repo}
}

type activityLogResponse struct {
	ID         string  `json:"id"`
	UserID     string  `json:"userId"`
	UserEmail  string  `json:"userEmail"`
	Method     string  `json:"method"`
	Path       string  `json:"path"`
	EntityType string  `json:"entityType"`
	EntityId   *string `json:"entityId"`
	StatusCode int     `json:"statusCode"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (h *ActivityLogsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	logs, total, err := h.repo.List(r.Context(), int32(q.Limit), int32((q.Page-1)*q.Limit))
	if err != nil {
		types.WriteError(w, types.InternalError("Failed to fetch activity logs"))
		return
	}

	items := make([]activityLogResponse, 0, len(logs))
	for _, l := range logs {
		items = append(items, activityLogResponse{
			ID: l.ID, UserID: l.UserID, UserEmail: l.UserEmail,
			Method: l.Method, Path: l.Path, EntityType: l.EntityType,
			EntityId: l.EntityId, StatusCode: l.StatusCode, CreatedAt: l.CreatedAt,
		})
	}
	types.WriteJSON(w, http.StatusOK, types.Paginate(items, int(total), q.Page, q.Limit))
}

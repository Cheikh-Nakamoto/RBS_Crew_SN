package handler

import (
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type NotificationsHandler struct {
	svc *service.NotificationsService
}

func NewNotificationsHandler(svc *service.NotificationsService) *NotificationsHandler {
	return &NotificationsHandler{svc: svc}
}

// GET /notifications — liste paginée du compte connecté. `unreadCount` est
// renvoyé à part du total paginé : c'est cette valeur qui alimente la pastille.
func (h *NotificationsHandler) List(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(types.CtxUserID).(string)
	if !ok || uid == "" {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}

	q := types.ParsePagination(r)
	items, total, unread, appErr := h.svc.List(r.Context(), uid, int32(q.Limit), int32((q.Page-1)*q.Limit))
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}

	res := types.Paginate(items, int(total), q.Page, q.Limit)
	types.WriteJSON(w, http.StatusOK, map[string]any{
		"data":        res.Data,
		"meta":        res.Meta,
		"unreadCount": unread,
	})
}

// PATCH /notifications/{id}/read
func (h *NotificationsHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(types.CtxUserID).(string)
	if !ok || uid == "" {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	id := chi.URLParam(r, "id")
	if appErr := h.svc.MarkRead(r.Context(), id, uid); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"status": "read"})
}

// POST /notifications/read-all
func (h *NotificationsHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(types.CtxUserID).(string)
	if !ok || uid == "" {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	if appErr := h.svc.MarkAllRead(r.Context(), uid); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"status": "all_read"})
}

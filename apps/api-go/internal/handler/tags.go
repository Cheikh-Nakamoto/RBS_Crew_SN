package handler

import (
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type TagsHandler struct{ svc *service.TagsService }

func NewTagsHandler(svc *service.TagsService) *TagsHandler {
	return &TagsHandler{svc: svc}
}

func (h *TagsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *TagsHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	result, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

package handler

import (
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type ArtistsHandler struct{ svc *service.ArtistsService }

func NewArtistsHandler(svc *service.ArtistsService) *ArtistsHandler { return &ArtistsHandler{svc: svc} }

func (h *ArtistsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *ArtistsHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────
type ProjectsHandler struct{ svc *service.ProjectsService }

func NewProjectsHandler(svc *service.ProjectsService) *ProjectsHandler {
	return &ProjectsHandler{svc: svc}
}

func (h *ProjectsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *ProjectsHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────
type FestivalHandler struct{ svc *service.FestivalService }

func NewFestivalHandler(svc *service.FestivalService) *FestivalHandler {
	return &FestivalHandler{svc: svc}
}

func (h *FestivalHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *FestivalHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// GetUpcoming renvoie la prochaine édition publiée (startDate future) sous
// {data: ...} — data vaut null quand aucune édition n'est programmée, pour que
// le front distingue « rien à venir » d'une erreur.
func (h *FestivalHandler) GetUpcoming(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.Upcoming(r.Context())
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]any{"data": result})
}

func (h *FestivalHandler) GetLatestGallery(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.LatestGallery(r.Context())
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────
type PressHandler struct{ svc *service.PressService }

func NewPressHandler(svc *service.PressService) *PressHandler { return &PressHandler{svc: svc} }

func (h *PressHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *PressHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────
type PagesHandler struct{ svc *service.PagesService }

func NewPagesHandler(svc *service.PagesService) *PagesHandler { return &PagesHandler{svc: svc} }

func (h *PagesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *PagesHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// ─────────────────────────────────────────────────────────────────
type ServicesHandler struct{ svc *service.ServicesService }

func NewServicesHandler(svc *service.ServicesService) *ServicesHandler {
	return &ServicesHandler{svc: svc}
}

func (h *ServicesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.List(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *ServicesHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

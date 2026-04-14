package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

// ── Categories ────────────────────────────────────────────────────────────────

type AdminCategoriesHandler struct{ svc *service.CategoriesService }

func NewAdminCategoriesHandler(svc *service.CategoriesService) *AdminCategoriesHandler {
	return &AdminCategoriesHandler{svc: svc}
}

func (h *AdminCategoriesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminCategoriesHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminCategoriesHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminCategoriesHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminCategoryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminCategoriesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Tags ──────────────────────────────────────────────────────────────────────

type AdminTagsHandler struct{ svc *service.TagsService }

func NewAdminTagsHandler(svc *service.TagsService) *AdminTagsHandler {
	return &AdminTagsHandler{svc: svc}
}

func (h *AdminTagsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminTagsHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminTagsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminTagInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminTagsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminTagInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminTagsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Products ──────────────────────────────────────────────────────────────────

type AdminProductsHandler struct{ svc *service.ProductsService }

func NewAdminProductsHandler(svc *service.ProductsService) *AdminProductsHandler {
	return &AdminProductsHandler{svc: svc}
}

func (h *AdminProductsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	var search *string
	if v := r.URL.Query().Get("search"); v != "" {
		search = &v
	}
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit, search)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminProductsHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminProductsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminProductsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminProductInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminProductsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Artists ───────────────────────────────────────────────────────────────────

type AdminArtistsHandler struct{ svc *service.ArtistsService }

func NewAdminArtistsHandler(svc *service.ArtistsService) *AdminArtistsHandler {
	return &AdminArtistsHandler{svc: svc}
}

func (h *AdminArtistsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminArtistsHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminArtistsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminArtistInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminArtistsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminArtistInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminArtistsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Projects ──────────────────────────────────────────────────────────────────

type AdminProjectsHandler struct{ svc *service.ProjectsService }

func NewAdminProjectsHandler(svc *service.ProjectsService) *AdminProjectsHandler {
	return &AdminProjectsHandler{svc: svc}
}

func (h *AdminProjectsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminProjectsHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminProjectsHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminProjectInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminProjectsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminProjectInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminProjectsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Pages ─────────────────────────────────────────────────────────────────────

type AdminPagesHandler struct{ svc *service.PagesService }

func NewAdminPagesHandler(svc *service.PagesService) *AdminPagesHandler {
	return &AdminPagesHandler{svc: svc}
}

func (h *AdminPagesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminPagesHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminPagesHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminPageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminPagesHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminPageInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminPagesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Services ──────────────────────────────────────────────────────────────────

type AdminServicesHandler struct{ svc *service.ServicesService }

func NewAdminServicesHandler(svc *service.ServicesService) *AdminServicesHandler {
	return &AdminServicesHandler{svc: svc}
}

func (h *AdminServicesHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminServicesHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminServicesHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminServiceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminServicesHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminServiceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminServicesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Festival ──────────────────────────────────────────────────────────────────

type AdminFestivalHandler struct{ svc *service.FestivalService }

func NewAdminFestivalHandler(svc *service.FestivalService) *AdminFestivalHandler {
	return &AdminFestivalHandler{svc: svc}
}

func (h *AdminFestivalHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminFestivalHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.AdminGetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminFestivalHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminFestivalInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminFestivalHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminFestivalInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminFestivalHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Press ─────────────────────────────────────────────────────────────────────

type AdminPressHandler struct{ svc *service.PressService }

func NewAdminPressHandler(svc *service.PressService) *AdminPressHandler {
	return &AdminPressHandler{svc: svc}
}

func (h *AdminPressHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	result, err := h.svc.AdminList(r.Context(), q.Page, q.Limit)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminPressHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, err := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminPressHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input model.AdminPressInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminCreate(r.Context(), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *AdminPressHandler) Update(w http.ResponseWriter, r *http.Request) {
	var input model.AdminPressInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		types.WriteError(w, types.BadRequest("Invalid request body"))
		return
	}
	result, appErr := h.svc.AdminUpdate(r.Context(), chi.URLParam(r, "id"), input)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *AdminPressHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

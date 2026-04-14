package handler

import (
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type ProductsHandler struct{ svc *service.ProductsService }

func NewProductsHandler(svc *service.ProductsService) *ProductsHandler {
	return &ProductsHandler{svc: svc}
}

func (h *ProductsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	f := model.ProductFilter{
		Page:  q.Page,
		Limit: q.Limit,
		Order: q.Order,
	}
	rv := r.URL.Query()
	if v := rv.Get("status"); v != "" {
		f.Status = &v
	}
	if v := rv.Get("search"); v != "" {
		f.Search = &v
	}
	if v := rv.Get("category"); v != "" {
		f.CategorySlug = &v
	}
	if v := rv.Get("tag"); v != "" {
		f.TagSlug = &v
	}

	result, err := h.svc.List(r.Context(), f)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *ProductsHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	result, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *ProductsHandler) GetVariants(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result, err := h.svc.GetVariants(r.Context(), id)
	if err != nil {
		types.WriteError(w, err)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

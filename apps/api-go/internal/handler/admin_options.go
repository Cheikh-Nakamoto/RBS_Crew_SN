package handler

import (
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

// AdminOptionsHandler serves the `{id, name}` lists that populate admin form
// selects, instead of paging through the full list endpoints.
type AdminOptionsHandler struct {
	repo *repository.OptionsRepository
}

func NewAdminOptionsHandler(repo *repository.OptionsRepository) *AdminOptionsHandler {
	return &AdminOptionsHandler{repo: repo}
}

func (h *AdminOptionsHandler) write(w http.ResponseWriter, options []repository.Option, err error) {
	if err != nil {
		types.WriteError(w, types.InternalError("Failed to fetch options"))
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]any{"data": options})
}

func (h *AdminOptionsHandler) Categories(w http.ResponseWriter, r *http.Request) {
	options, err := h.repo.Categories(r.Context())
	h.write(w, options, err)
}

func (h *AdminOptionsHandler) Tags(w http.ResponseWriter, r *http.Request) {
	options, err := h.repo.Tags(r.Context())
	h.write(w, options, err)
}

func (h *AdminOptionsHandler) Artists(w http.ResponseWriter, r *http.Request) {
	options, err := h.repo.Artists(r.Context())
	h.write(w, options, err)
}

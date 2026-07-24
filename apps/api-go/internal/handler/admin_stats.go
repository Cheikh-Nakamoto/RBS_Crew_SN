package handler

import (
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
)

type AdminStatsHandler struct {
	repo *repository.StatsRepository
}

func NewAdminStatsHandler(repo *repository.StatsRepository) *AdminStatsHandler {
	return &AdminStatsHandler{repo: repo}
}

// Dashboard renvoie les compteurs du tableau de bord. Le front les lisait
// auparavant dans le `meta.total` d'endpoints de liste appelés avec limit=1.
func (h *AdminStatsHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	counts, err := h.repo.DashboardCounts(r.Context())
	if err != nil {
		types.WriteError(w, types.InternalError("Failed to compute dashboard stats"))
		return
	}
	types.WriteJSON(w, http.StatusOK, counts)
}

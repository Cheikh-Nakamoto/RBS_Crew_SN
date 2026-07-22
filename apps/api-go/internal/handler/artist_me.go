package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

// ArtistMeHandler expose l'espace artiste. Aucun endpoint n'accepte
// d'identifiant d'artiste : la fiche est toujours résolue depuis le JWT, ce qui
// rend structurellement impossible la modification de la fiche d'un tiers.
type ArtistMeHandler struct {
	svc *service.ArtistAccountsService
}

func NewArtistMeHandler(svc *service.ArtistAccountsService) *ArtistMeHandler {
	return &ArtistMeHandler{svc: svc}
}

func (h *ArtistMeHandler) userID(w http.ResponseWriter, r *http.Request) (string, bool) {
	uid, ok := r.Context().Value(types.CtxUserID).(string)
	if !ok || uid == "" {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return "", false
	}
	return uid, true
}

// GET /artist/me
func (h *ArtistMeHandler) Get(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(w, r)
	if !ok {
		return
	}
	resp, appErr := h.svc.GetSelf(r.Context(), uid)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, resp)
}

// PATCH /artist/me
func (h *ArtistMeHandler) Update(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(w, r)
	if !ok {
		return
	}
	var in model.ArtistSelfUpdateInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	if err := validate.Struct(in); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	resp, appErr := h.svc.UpdateSelf(r.Context(), uid, in)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, resp)
}

// POST /artist/me/artworks
func (h *ArtistMeHandler) AddArtwork(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(w, r)
	if !ok {
		return
	}
	var in model.ArtistArtworkInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	if err := validate.Struct(in); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	resp, appErr := h.svc.AddArtwork(r.Context(), uid, in)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, resp)
}

// PUT /artist/me/artworks — remplacement complet (réordonnancement)
func (h *ArtistMeHandler) ReplaceArtworks(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(w, r)
	if !ok {
		return
	}
	var body struct {
		Gallery []string `json:"gallery"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	resp, appErr := h.svc.ReplaceArtworks(r.Context(), uid, body.Gallery)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, resp)
}

// DELETE /artist/me/artworks/{artworkId}
func (h *ArtistMeHandler) DeleteArtwork(w http.ResponseWriter, r *http.Request) {
	uid, ok := h.userID(w, r)
	if !ok {
		return
	}
	if appErr := h.svc.DeleteArtwork(r.Context(), uid, chi.URLParam(r, "artworkId")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── Invitation (admin) ───────────────────────────────────────────────────────

// AdminArtistInviteHandler rattache un compte à une fiche artiste.
type AdminArtistInviteHandler struct {
	svc *service.ArtistAccountsService
}

func NewAdminArtistInviteHandler(svc *service.ArtistAccountsService) *AdminArtistInviteHandler {
	return &AdminArtistInviteHandler{svc: svc}
}

// POST /admin/artists/{id}/invite
func (h *AdminArtistInviteHandler) Invite(w http.ResponseWriter, r *http.Request) {
	var in model.ArtistInviteInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		types.WriteError(w, types.BadRequest("payload invalide"))
		return
	}
	if err := validate.Struct(in); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	emailSent, appErr := h.svc.Invite(r.Context(), chi.URLParam(r, "id"), in.Email)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "invited",
		"emailSent": emailSent,
	})
}

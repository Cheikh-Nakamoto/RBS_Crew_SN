package handler

import (
	"encoding/json"
	"net/http"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-chi/chi/v5"
)

type UsersHandler struct{ svc *service.UsersService }

func NewUsersHandler(svc *service.UsersService) *UsersHandler { return &UsersHandler{svc: svc} }

// ── Self-service ──────────────────────────────────────────────────────────────

func (h *UsersHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	result, appErr := h.svc.GetMe(r.Context(), userID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	var dto model.UpdateUserDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	result, appErr := h.svc.UpdateMe(r.Context(), userID, dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	if appErr := h.svc.DeleteMe(r.Context(), userID); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "Account deleted"})
}

// ── Addresses ─────────────────────────────────────────────────────────────────

func (h *UsersHandler) GetAddresses(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	result, appErr := h.svc.GetAddresses(r.Context(), userID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) AddAddress(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	var dto model.CreateAddressDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	result, appErr := h.svc.AddAddress(r.Context(), userID, dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, result)
}

func (h *UsersHandler) UpdateAddress(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	addrID := chi.URLParam(r, "id")
	var dto model.UpdateAddressDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	result, appErr := h.svc.UpdateAddress(r.Context(), userID, addrID, dto)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) DeleteAddress(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	addrID := chi.URLParam(r, "id")
	if appErr := h.svc.DeleteAddress(r.Context(), userID, addrID); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "Address deleted"})
}

// ── Admin ─────────────────────────────────────────────────────────────────────

func (h *UsersHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	q := types.ParsePagination(r)
	var search *string
	if s := r.URL.Query().Get("search"); s != "" {
		search = &s
	}
	result, appErr := h.svc.ListAll(r.Context(), search, q.Page, q.Limit)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	result, appErr := h.svc.GetByID(r.Context(), chi.URLParam(r, "id"))
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var dto model.UpdateUserRoleDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	if err := validate.Struct(dto); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	result, appErr := h.svc.UpdateRole(r.Context(), id, dto.Role)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) AdminDelete(w http.ResponseWriter, r *http.Request) {
	if appErr := h.svc.AdminDelete(r.Context(), chi.URLParam(r, "id")); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "User deleted"})
}

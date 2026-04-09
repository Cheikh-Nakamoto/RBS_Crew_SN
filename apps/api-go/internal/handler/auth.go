package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"unicode"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/go-playground/validator/v10"
)

var validate = func() *validator.Validate {
	v := validator.New()
	// password_strength: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
	_ = v.RegisterValidation("password_strength", func(fl validator.FieldLevel) bool {
		pwd := fl.Field().String()
		if len(pwd) < 8 {
			return false
		}
		var hasUpper, hasLower, hasDigit, hasSpecial bool
		for _, c := range pwd {
			switch {
			case unicode.IsUpper(c):
				hasUpper = true
			case unicode.IsLower(c):
				hasLower = true
			case unicode.IsDigit(c):
				hasDigit = true
			case unicode.IsPunct(c) || unicode.IsSymbol(c):
				hasSpecial = true
			}
		}
		return hasUpper && hasLower && hasDigit && hasSpecial
	})
	return v
}()

// validationError returns a generic message for validation failures
// to avoid leaking internal field names and rules to the client.
func validationError() *types.AppError {
	return types.BadRequest("Invalid or missing required fields")
}

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// Register godoc
// @Summary      Register a new user
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body body service.RegisterRequest true "Registration payload"
// @Success      201 {object} service.UserResponse
// @Failure      400 {object} types.AppError
// @Failure      409 {object} types.AppError
// @Router       /auth/register [post]
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req service.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	if err := validate.Struct(req); err != nil {
		types.WriteError(w, validationError())
		return
	}

	user, appErr := h.svc.Register(r.Context(), req)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusCreated, user)
}

// Login godoc
// @Summary      Login and receive JWT tokens
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body body service.LoginRequest true "Login credentials"
// @Success      200 {object} service.TokenPair
// @Failure      401 {object} types.AppError
// @Router       /auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req service.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	if err := validate.Struct(req); err != nil {
		types.WriteError(w, types.Unauthorized("Invalid credentials"))
		return
	}

	tokens, appErr := h.svc.Login(r.Context(), req)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, tokens)
}

// Refresh godoc
// @Summary      Refresh access token using refresh token
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body body service.RefreshRequest true "Refresh token"
// @Success      200 {object} service.TokenPair
// @Failure      401 {object} types.AppError
// @Router       /auth/refresh [post]
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req service.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}

	tokens, appErr := h.svc.Refresh(r.Context(), req.RefreshToken)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, tokens)
}

// Logout godoc
// @Summary      Logout (revoke all sessions)
// @Tags         Auth
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} map[string]string
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	result, appErr := h.svc.Logout(r.Context(), userID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, result)
}

// Me godoc
// @Summary      Get current user profile
// @Tags         Auth
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} service.UserResponse
// @Failure      401 {object} types.AppError
// @Router       /auth/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(types.CtxUserID).(string)
	user, appErr := h.svc.Me(r.Context(), userID)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, user)
}

// CheckSession godoc
// @Summary      Check session
// @Tags         Auth
// @Produce      json
// @Success      200 {object} map[string]interface{}
// @Router       /auth/session [post]
func (h *AuthHandler) CheckSession(w http.ResponseWriter, r *http.Request) {
	header := r.Header.Get("Authorization")
	tokenStr := strings.TrimPrefix(header, "Bearer ")
	types.WriteJSON(w, http.StatusOK, h.svc.CheckSession(r.Context(), tokenStr))
}

// ── Password Reset & Verification ─────────────────────────────────────────────

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email" validate:"required,email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	if appErr := h.svc.ForgotPassword(r.Context(), body.Email); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "If an account with this email exists, a reset link has been sent."})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token    string `json:"token" validate:"required"`
		Password string `json:"password" validate:"required,min=8"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	if appErr := h.svc.ResetPassword(r.Context(), body.Token, body.Password); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "Password successfully reset. You can now log in."})
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token" validate:"required"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.BadRequest(err.Error()))
		return
	}
	if appErr := h.svc.VerifyEmail(r.Context(), body.Token); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "Email successfully verified."})
}

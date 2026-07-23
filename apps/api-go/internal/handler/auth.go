package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"unicode"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
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

// passwordValidationError distingue le rejet « mot de passe trop faible » des
// autres erreurs de validation. Les règles sont déjà publiées sur le formulaire
// d'inscription, donc les rappeler ne divulgue rien et évite un 400 opaque.
func passwordValidationError(err error) *types.AppError {
	var verrs validator.ValidationErrors
	if errors.As(err, &verrs) {
		for _, fe := range verrs {
			if fe.Field() == "Password" && fe.Tag() == "password_strength" {
				return types.BadRequest("Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit and a special character")
			}
		}
	}
	return validationError()
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
// @Param        body body model.RegisterRequest true "Registration payload"
// @Success      201 {object} model.AuthResponse
// @Failure      400 {object} types.AppError
// @Failure      409 {object} types.AppError
// @Router       /auth/register [post]
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.WriteError(w, types.BadRequest("Invalid JSON body"))
		return
	}
	if err := validate.Struct(req); err != nil {
		types.WriteError(w, passwordValidationError(err))
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
// @Param        body body model.LoginRequest true "Login credentials"
// @Success      200 {object} model.TokenPair
// @Failure      401 {object} types.AppError
// @Router       /auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
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
// @Param        body body model.RefreshRequest true "Refresh token"
// @Success      200 {object} model.TokenPair
// @Failure      401 {object} types.AppError
// @Router       /auth/refresh [post]
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req model.RefreshRequest
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
// @Success      200 {object} model.UserResponse
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
		types.WriteError(w, validationError())
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
		Password string `json:"password" validate:"required,password_strength"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, validationError())
		return
	}
	if appErr := h.svc.ResetPassword(r.Context(), body.Token, body.Password); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "Password successfully reset. You can now log in."})
}

// GoogleOAuth reçoit l'id_token émis par Google (transmis par next-auth depuis
// le serveur Next.js) et renvoie les JWT applicatifs.
func (h *AuthHandler) GoogleOAuth(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDToken string `json:"idToken" validate:"required"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, types.Unauthorized("Invalid Google token"))
		return
	}
	tokens, appErr := h.svc.GoogleOAuth(r.Context(), body.IDToken)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, tokens)
}

// AcceptInvitation active un compte artiste : l'artiste choisit son mot de
// passe via le lien reçu par e-mail, puis est connecté directement.
func (h *AuthHandler) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token    string `json:"token" validate:"required"`
		Password string `json:"password" validate:"required,password_strength"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		types.WriteError(w, types.BadRequest("Invalid payload"))
		return
	}
	if err := validate.Struct(body); err != nil {
		types.WriteError(w, validationError())
		return
	}
	email, appErr := h.svc.AcceptInvitation(r.Context(), body.Token, body.Password)
	if appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	// Aucun token renvoyé : le client se connecte ensuite normalement avec le
	// mot de passe qu'il vient de définir. Émettre une session ici en créerait
	// une qui ne servirait jamais mais resterait valide plusieurs jours.
	types.WriteJSON(w, http.StatusOK, map[string]string{"email": email})
}

// POST /auth/resend-verification — renvoie le lien au compte connecté.
func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	uid, ok := r.Context().Value(types.CtxUserID).(string)
	if !ok || uid == "" {
		types.WriteError(w, types.Unauthorized("non authentifié"))
		return
	}
	if appErr := h.svc.ResendVerification(r.Context(), uid); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent"})
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
		types.WriteError(w, validationError())
		return
	}
	if appErr := h.svc.VerifyEmail(r.Context(), body.Token); appErr != nil {
		types.WriteError(w, appErr)
		return
	}
	types.WriteJSON(w, http.StatusOK, map[string]string{"message": "Email successfully verified."})
}

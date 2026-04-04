package router

import (
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/handler"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/middleware"
	"github.com/go-chi/chi/v5"
	"golang.org/x/time/rate"
)

type Handlers struct {
	Health     *handler.HealthHandler
	Auth       *handler.AuthHandler
	Categories *handler.CategoriesHandler
	Products   *handler.ProductsHandler
	Users      *handler.UsersHandler
	Artists    *handler.ArtistsHandler
	Projects   *handler.ProjectsHandler
	Festival   *handler.FestivalHandler
	Press      *handler.PressHandler
	Pages      *handler.PagesHandler
	Services   *handler.ServicesHandler
	Orders     *handler.OrdersHandler
	Quotes     *handler.QuotesHandler
	Payments   *handler.PaymentsHandler
}

func NewRouter(cfg *config.Config, h *Handlers) chi.Router {
	r := chi.NewRouter()

	// ── Global Middlewares ──────────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recovery)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(cfg.CORSOrigin))
	r.Use(middleware.Locale)

	// ── Public Routes ───────────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		// Global throttle: 60 req/min burst 20 per IP
		r.Use(middleware.RateLimit(rate.Every(60), 20))

		r.Get("/health", h.Health.Check)

		// Auth
		r.Post("/auth/register", h.Auth.Register)
		r.Post("/auth/login", h.Auth.Login)
		r.Post("/auth/session", h.Auth.CheckSession)
		r.Post("/auth/refresh", h.Auth.Refresh)
		r.Post("/auth/forgot-password", h.Auth.ForgotPassword)
		r.Post("/auth/reset-password", h.Auth.ResetPassword)
		r.Post("/auth/verify-email", h.Auth.VerifyEmail)

		// Categories & Tags
		r.Get("/categories", h.Categories.List)
		r.Get("/categories/{slug}", h.Categories.GetBySlug)

		// Products
		r.Get("/products", h.Products.List)
		r.Get("/products/{slug}", h.Products.GetBySlug)
		r.Get("/products/{id}/variants", h.Products.GetVariants)

		// Artists / Crew
		r.Get("/artists", h.Artists.List)
		r.Get("/artists/{slug}", h.Artists.GetBySlug)

		// Projects
		r.Get("/projects", h.Projects.List)
		r.Get("/projects/{slug}", h.Projects.GetBySlug)

		// Festival Editions
		r.Get("/festival", h.Festival.List)
		r.Get("/festival/{slug}", h.Festival.GetBySlug)

		// Press
		r.Get("/press", h.Press.List)
		r.Get("/press/{id}", h.Press.GetByID)

		// Pages
		r.Get("/pages", h.Pages.List)
		r.Get("/pages/{slug}", h.Pages.GetBySlug)

		// Services
		r.Get("/services", h.Services.List)
		r.Get("/services/{slug}", h.Services.GetBySlug)

		// Quotes — public submit (stricter rate limit)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(rate.Every(300), 3)) // 1 req/5min burst 3
			r.Post("/quotes", h.Quotes.Create)
		})

		// Stripe Webhook — public, exempt from generic middleware rate drops (Stripe handles retries)
		r.Post("/payments/webhook", h.Payments.Webhook)
	})

	// ── Authenticated Routes ─────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg.JWTSecret))

		// Auth self-service
		r.Post("/auth/logout", h.Auth.Logout)
		r.Get("/auth/me", h.Auth.Me)

		// Users — self-service
		r.Get("/users/me", h.Users.GetMe)
		r.Put("/users/me", h.Users.UpdateMe)
		r.Delete("/users/me", h.Users.DeleteMe)
		r.Get("/users/me/addresses", h.Users.GetAddresses)
		r.Post("/users/me/addresses", h.Users.AddAddress)
		r.Put("/users/me/addresses/{id}", h.Users.UpdateAddress)
		r.Delete("/users/me/addresses/{id}", h.Users.DeleteAddress)

		// Orders — authenticated users
		r.Post("/orders", h.Orders.Create)
		r.Get("/orders/my", h.Orders.FindMy)
		r.Get("/orders/{id}", h.Orders.FindOne)

		// Payments
		r.Post("/payments/create-checkout", h.Payments.CreateCheckout)
	})

	// ── Admin Routes ─────────────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg.JWTSecret))
		r.Use(middleware.RequireRoles("ADMIN", "EDITOR"))

		// Orders admin
		r.Get("/admin/orders", h.Orders.FindAll)
		r.Patch("/admin/orders/{id}/status", h.Orders.UpdateStatus)

		// Quotes admin
		r.Get("/admin/quotes", h.Quotes.FindAll)
		r.Get("/admin/quotes/{id}", h.Quotes.FindOne)

		// Users admin
		r.Get("/admin/users", h.Users.ListAll)
		r.Get("/admin/users/{id}", h.Users.GetByID)
		r.Put("/admin/users/{id}/role", h.Users.UpdateRole)
		r.Delete("/admin/users/{id}", h.Users.AdminDelete)
	})

	return r
}

package router

import (
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/handler"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/middleware"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/go-chi/chi/v5"
	"golang.org/x/time/rate"
)

type Handlers struct {
	Health        *handler.HealthHandler
	Auth          *handler.AuthHandler
	Categories    *handler.CategoriesHandler
	Products      *handler.ProductsHandler
	Users         *handler.UsersHandler
	Artists       *handler.ArtistsHandler
	Projects      *handler.ProjectsHandler
	Festival      *handler.FestivalHandler
	Press         *handler.PressHandler
	Pages         *handler.PagesHandler
	Services      *handler.ServicesHandler
	Orders        *handler.OrdersHandler
	Quotes        *handler.QuotesHandler
	Payments      *handler.PaymentsHandler
	Tags              *handler.TagsHandler
	AdminCategories   *handler.AdminCategoriesHandler
	AdminTags         *handler.AdminTagsHandler
	AdminProducts     *handler.AdminProductsHandler
	AdminArtists      *handler.AdminArtistsHandler
	AdminProjects *handler.AdminProjectsHandler
	AdminPages    *handler.AdminPagesHandler
	AdminServices *handler.AdminServicesHandler
	AdminFestival *handler.AdminFestivalHandler
	AdminPress    *handler.AdminPressHandler
	Media         *handler.MediaHandler
}

func NewRouter(cfg *config.Config, h *Handlers) chi.Router {
	r := chi.NewRouter()

	// ── Global Middlewares ──────────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recovery)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.MaxBodySize)
	r.Use(middleware.CORS(cfg.CORSOrigin))
	r.Use(middleware.Locale)

	// ── Public Routes ───────────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		// Global throttle: 60 req/min burst 20 per IP
		r.Use(middleware.RateLimit(rate.Limit(1), 20))

		r.Get("/health", h.Health.Check)

		// Auth — sensitive endpoints get a stricter rate limit (5 req/min burst 5)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RateLimit(rate.Limit(float64(5)/60), 5))
			r.Post("/auth/register", h.Auth.Register)
			r.Post("/auth/login", h.Auth.Login)
			r.Post("/auth/forgot-password", h.Auth.ForgotPassword)
			r.Post("/auth/reset-password", h.Auth.ResetPassword)
		})

		r.Post("/auth/session", h.Auth.CheckSession)
		r.Post("/auth/refresh", h.Auth.Refresh)
		r.Post("/auth/verify-email", h.Auth.VerifyEmail)

		// Categories & Tags
		r.Get("/categories", h.Categories.List)
		r.Get("/categories/{slug}", h.Categories.GetBySlug)

		// Tags
		r.Get("/tags", h.Tags.List)
		r.Get("/tags/{slug}", h.Tags.GetBySlug)

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

		// Payment webhooks — public, exempt from generic rate limiting
		r.Post("/payments/webhook", h.Payments.Webhook) // Legacy Stripe
		r.Post("/payments/webhook/stripe", h.Payments.WebhookFor(payment.MethodStripe))
		r.Post("/payments/webhook/paypal", h.Payments.WebhookFor(payment.MethodPayPal))
		r.Post("/payments/webhook/wave", h.Payments.WebhookFor(payment.MethodWave))
		r.Post("/payments/webhook/orange-money", h.Payments.WebhookFor(payment.MethodOrangeMoney))
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
		r.Get("/admin/orders/{id}", h.Orders.FindOne)
		r.Patch("/admin/orders/{id}/status", h.Orders.UpdateStatus)
		r.Delete("/admin/orders/{id}", h.Orders.AdminDelete)

		// Quotes admin
		r.Get("/admin/quotes", h.Quotes.FindAll)
		r.Get("/admin/quotes/{id}", h.Quotes.FindOne)
		r.Patch("/admin/quotes/{id}/status", h.Quotes.UpdateStatus)
		r.Delete("/admin/quotes/{id}", h.Quotes.AdminDelete)

		// Users admin
		r.Get("/admin/users", h.Users.ListAll)
		r.Get("/admin/users/{id}", h.Users.GetByID)
		r.Put("/admin/users/{id}/role", h.Users.UpdateRole)
		r.Delete("/admin/users/{id}", h.Users.AdminDelete)

		// Categories admin
		r.Get("/admin/categories", h.AdminCategories.List)
		r.Get("/admin/categories/{id}", h.AdminCategories.GetByID)
		r.Post("/admin/categories", h.AdminCategories.Create)
		r.Put("/admin/categories/{id}", h.AdminCategories.Update)
		r.Delete("/admin/categories/{id}", h.AdminCategories.Delete)

		// Tags admin
		r.Get("/admin/tags", h.AdminTags.List)
		r.Get("/admin/tags/{id}", h.AdminTags.GetByID)
		r.Post("/admin/tags", h.AdminTags.Create)
		r.Put("/admin/tags/{id}", h.AdminTags.Update)
		r.Delete("/admin/tags/{id}", h.AdminTags.Delete)

		// Products admin
		r.Get("/admin/products", h.AdminProducts.List)
		r.Get("/admin/products/{id}", h.AdminProducts.GetByID)
		r.Post("/admin/products", h.AdminProducts.Create)
		r.Put("/admin/products/{id}", h.AdminProducts.Update)
		r.Delete("/admin/products/{id}", h.AdminProducts.Delete)

		// Artists admin
		r.Get("/admin/artists", h.AdminArtists.List)
		r.Get("/admin/artists/{id}", h.AdminArtists.GetByID)
		r.Post("/admin/artists", h.AdminArtists.Create)
		r.Put("/admin/artists/{id}", h.AdminArtists.Update)
		r.Delete("/admin/artists/{id}", h.AdminArtists.Delete)

		// Projects admin
		r.Get("/admin/projects", h.AdminProjects.List)
		r.Get("/admin/projects/{id}", h.AdminProjects.GetByID)
		r.Post("/admin/projects", h.AdminProjects.Create)
		r.Put("/admin/projects/{id}", h.AdminProjects.Update)
		r.Delete("/admin/projects/{id}", h.AdminProjects.Delete)

		// Pages admin
		r.Get("/admin/pages", h.AdminPages.List)
		r.Get("/admin/pages/{id}", h.AdminPages.GetByID)
		r.Post("/admin/pages", h.AdminPages.Create)
		r.Put("/admin/pages/{id}", h.AdminPages.Update)
		r.Delete("/admin/pages/{id}", h.AdminPages.Delete)

		// Services admin
		r.Get("/admin/services", h.AdminServices.List)
		r.Get("/admin/services/{id}", h.AdminServices.GetByID)
		r.Post("/admin/services", h.AdminServices.Create)
		r.Put("/admin/services/{id}", h.AdminServices.Update)
		r.Delete("/admin/services/{id}", h.AdminServices.Delete)

		// Festival admin
		r.Get("/admin/festival", h.AdminFestival.List)
		r.Get("/admin/festival/{id}", h.AdminFestival.GetByID)
		r.Post("/admin/festival", h.AdminFestival.Create)
		r.Put("/admin/festival/{id}", h.AdminFestival.Update)
		r.Delete("/admin/festival/{id}", h.AdminFestival.Delete)

		// Press admin
		r.Get("/admin/press", h.AdminPress.List)
		r.Get("/admin/press/{id}", h.AdminPress.GetByID)
		r.Post("/admin/press", h.AdminPress.Create)
		r.Put("/admin/press/{id}", h.AdminPress.Update)
		r.Delete("/admin/press/{id}", h.AdminPress.Delete)

		// Media upload
		r.Post("/admin/media", h.Media.Upload)
	})

	return r
}

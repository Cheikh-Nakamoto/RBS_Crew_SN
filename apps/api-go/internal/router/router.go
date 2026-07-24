package router

import (
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/handler"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/middleware"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/go-chi/chi/v5"
	"golang.org/x/time/rate"
)

type Handlers struct {
	Health            *handler.HealthHandler
	Auth              *handler.AuthHandler
	Categories        *handler.CategoriesHandler
	Products          *handler.ProductsHandler
	Users             *handler.UsersHandler
	Artists           *handler.ArtistsHandler
	Projects          *handler.ProjectsHandler
	Festival          *handler.FestivalHandler
	Press             *handler.PressHandler
	Pages             *handler.PagesHandler
	Services          *handler.ServicesHandler
	Orders            *handler.OrdersHandler
	Quotes            *handler.QuotesHandler
	Payments          *handler.PaymentsHandler
	Tags              *handler.TagsHandler
	AdminCategories   *handler.AdminCategoriesHandler
	AdminTags         *handler.AdminTagsHandler
	AdminProducts     *handler.AdminProductsHandler
	AdminArtists      *handler.AdminArtistsHandler
	AdminProjects     *handler.AdminProjectsHandler
	AdminPages        *handler.AdminPagesHandler
	AdminServices     *handler.AdminServicesHandler
	AdminFestival     *handler.AdminFestivalHandler
	AdminPress        *handler.AdminPressHandler
	ActivityLogs      *handler.ActivityLogsHandler
	AdminStats        *handler.AdminStatsHandler
	AdminOptions      *handler.AdminOptionsHandler
	Media             *handler.MediaHandler
	Cart              *handler.CartHandler
	Refunds           *handler.RefundsHandler
	Shipping          *handler.ShippingHandler
	ArtistMe          *handler.ArtistMeHandler
	AdminArtistInvite *handler.AdminArtistInviteHandler
	ArtistClaims      *handler.ArtistClaimHandler
	Notifications     *handler.NotificationsHandler
}

func NewRouter(cfg *config.Config, h *Handlers, activityRepo *repository.ActivityLogRepository, authRepo *repository.AuthRepository) chi.Router {
	r := chi.NewRouter()

	// ── Global Middlewares ──────────────────────────────────────────────────
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recovery)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.MaxBodySize)
	r.Use(middleware.CORS(cfg.CORSOrigin, cfg.Environment == "development"))
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
			r.Post("/auth/accept-invitation", h.Auth.AcceptInvitation)
			r.Post("/auth/oauth/google", h.Auth.GoogleOAuth)
		})

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
		r.Get("/festival/latest/gallery", h.Festival.GetLatestGallery)
		r.Get("/festival/upcoming", h.Festival.GetUpcoming)
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

		// Shipping quote — public (server recomputes fee, never trusts client total)
		r.Post("/shipping/quote", h.Shipping.Quote)
	})

	// Payment webhooks — véritablement exemptés du rate limit générique par IP
	r.Group(func(r chi.Router) {
		r.Post("/payments/webhook", h.Payments.Webhook) // Legacy Stripe
		r.Post("/payments/webhook/stripe", h.Payments.WebhookFor(payment.MethodStripe))
		r.Post("/payments/webhook/paypal", h.Payments.WebhookFor(payment.MethodPayPal))
		r.Post("/payments/webhook/wave", h.Payments.WebhookFor(payment.MethodWave))
		r.Post("/payments/webhook/orange-money", h.Payments.WebhookFor(payment.MethodOrangeMoney))
		r.Post("/payments/webhook/naboo", h.Payments.WebhookFor(payment.MethodNaboo))
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

		// Auto-déclaration « je suis un artiste RBS » — n'accorde aucun droit,
		// elle attend la validation d'un administrateur.
		r.Post("/users/me/artist-claim", h.ArtistClaims.Submit)

		// Renvoi du lien de vérification. Rate limit dédié : sans lui, l'endpoint
		// devient un relais d'envoi d'e-mails.
		r.With(middleware.RateLimit(rate.Every(time.Minute), 3)).
			Post("/auth/resend-verification", h.Auth.ResendVerification)

		// Orders — authenticated users
		// Seule la création de commande exige une adresse vérifiée. Ne pas étendre
		// au groupe entier : /cart, /users/me et le renvoi du lien doivent rester
		// accessibles, sinon un client bloqué n'a aucun moyen de se débloquer.
		r.With(middleware.RequireVerifiedEmail(authRepo)).Post("/orders", h.Orders.Create)
		r.Get("/orders/my", h.Orders.FindMy)
		r.Get("/orders/{id}", h.Orders.FindOne)
		r.Get("/orders/{id}/status", h.Orders.FindStatus)

		// Payments
		r.Post("/payments/create-checkout", h.Payments.CreateCheckout)

		// Notifications in-app — propres au compte connecté.
		r.Get("/notifications", h.Notifications.List)
		r.Patch("/notifications/{id}/read", h.Notifications.MarkRead)
		r.Post("/notifications/read-all", h.Notifications.MarkAllRead)

	})

	// ── Espace artiste ───────────────────────────────────────────────────────
	// Aucun endpoint n'accepte d'identifiant d'artiste : la fiche est résolue
	// depuis le JWT (Artist.userId), ce qui interdit par construction de toucher
	// à la fiche d'un autre. Le statut de publication, le slug et les éditions
	// du festival restent réservés à l'administration.
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg.JWTSecret))
		r.Use(middleware.RequireRoles("ARTIST"))

		r.Get("/artist/me", h.ArtistMe.Get)
		r.Patch("/artist/me", h.ArtistMe.Update)
		r.Post("/artist/me/artworks", h.ArtistMe.AddArtwork)
		r.Put("/artist/me/artworks", h.ArtistMe.ReplaceArtworks)
		r.Delete("/artist/me/artworks/{artworkId}", h.ArtistMe.DeleteArtwork)

		// Même handler d'upload que l'admin — il est agnostique de l'identité.
		// Rate limit dédié : les groupes authentifiés n'en ont aucun par défaut.
		r.With(
			middleware.MaxBodySizeLarge,
			middleware.RateLimit(rate.Every(6*time.Second), 10),
		).Post("/artist/me/media", h.Media.Upload)
	})

	// ── Cart ─────────────────────────────────────────────────────────────────
	// Panier entièrement côté serveur (Redis), y compris pour les visiteurs non
	// connectés : CartSession accepte soit un JWT, soit un cookie invité signé,
	// et ne rejette jamais la requête. Groupe distinct du groupe public, donc
	// avec son propre rate limit — sinon un anonyme pourrait marteler Redis.
	r.Group(func(r chi.Router) {
		r.Use(middleware.RateLimit(rate.Limit(2), 30))
		r.Use(middleware.CartSession(cfg.JWTSecret, cfg.Environment != "development"))

		r.Get("/cart", h.Cart.Get)
		r.Post("/cart/items", h.Cart.AddItem)
		r.Patch("/cart/items/{productId}", h.Cart.UpdateQuantity)
		r.Delete("/cart/items/{productId}", h.Cart.RemoveItem)
		r.Delete("/cart", h.Cart.Clear)
	})

	// ── Admin Routes ─────────────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg.JWTSecret))
		r.Use(middleware.RequireRoles("ADMIN", "EDITOR"))
		r.Use(middleware.ActivityLogger(activityRepo))

		// Dashboard
		r.Get("/admin/stats", h.AdminStats.Dashboard)

		// Listes d'options {id, name} pour les <Select> des formulaires
		r.Get("/admin/categories/options", h.AdminOptions.Categories)
		r.Get("/admin/tags/options", h.AdminOptions.Tags)
		r.Get("/admin/artists/options", h.AdminOptions.Artists)

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
		// Filet de sécurité : débloquer un client dont l'e-mail n'arrive pas.
		r.With(middleware.RequireRoles("ADMIN")).
			Post("/admin/users/{id}/verify-email", h.Users.AdminVerifyEmail)
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
		// Créer un compte est une action privilégiée : ADMIN uniquement.
		r.With(middleware.RequireRoles("ADMIN")).
			Post("/admin/artists/{id}/invite", h.AdminArtistInvite.Invite)

		// Demandes artiste : consultation ouverte aux éditeurs, décision réservée
		// aux administrateurs (elle attribue un rôle).
		r.Get("/admin/artist-claims", h.ArtistClaims.List)
		r.With(middleware.RequireRoles("ADMIN")).
			Post("/admin/artist-claims/{userId}/approve", h.ArtistClaims.Approve)
		r.With(middleware.RequireRoles("ADMIN")).
			Post("/admin/artist-claims/{userId}/reject", h.ArtistClaims.Reject)

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
		// Festival lineup (artistes)
		r.Post("/admin/festival/{id}/artists", h.AdminFestival.LinkArtist)
		r.Delete("/admin/festival/{id}/artists/{artistId}", h.AdminFestival.UnlinkArtist)

		// Press admin
		r.Get("/admin/press", h.AdminPress.List)
		r.Get("/admin/press/{id}", h.AdminPress.GetByID)
		r.Post("/admin/press", h.AdminPress.Create)
		r.Put("/admin/press/{id}", h.AdminPress.Update)
		r.Delete("/admin/press/{id}", h.AdminPress.Delete)

		// Media upload — override the global 1 MB body limit with 11 MB
		// (handler calls ParseMultipartForm(10 MB); the extra 1 MB covers multipart overhead).
		r.With(middleware.MaxBodySizeLarge).Post("/admin/media", h.Media.Upload)

		// Activity logs
		r.Get("/admin/activity-logs", h.ActivityLogs.List)

		// Orders: shipping tracking (ADMIN + EDITOR)
		r.Patch("/admin/orders/{id}/shipping", h.Orders.UpdateShipping)

		// Shipping zones & methods (ADMIN + EDITOR read, ADMIN write)
		r.Get("/admin/shipping/zones", h.Shipping.ListZones)
		r.Get("/admin/shipping/methods", h.Shipping.ListMethods)

		// Refunds list (ADMIN + EDITOR read)
		r.Get("/admin/orders/{id}/refunds", h.Refunds.List)
	})

	// ── Admin-only routes (ADMIN only) ─────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(cfg.JWTSecret))
		r.Use(middleware.RequireRoles("ADMIN"))
		r.Use(middleware.ActivityLogger(activityRepo))

		// Refunds — money-sensitive, ADMIN only
		r.Post("/admin/orders/{id}/refund", h.Refunds.Create)
		r.Post("/admin/refunds/{refundId}/mark-completed", h.Refunds.MarkManualCompleted)

		// Shipping CRUD write — ADMIN only
		r.Post("/admin/shipping/zones", h.Shipping.CreateZone)
		r.Put("/admin/shipping/zones/{id}", h.Shipping.UpdateZone)
		r.Delete("/admin/shipping/zones/{id}", h.Shipping.DeleteZone)
		r.Post("/admin/shipping/methods", h.Shipping.CreateMethod)
		r.Put("/admin/shipping/methods/{id}", h.Shipping.UpdateMethod)
		r.Delete("/admin/shipping/methods/{id}", h.Shipping.DeleteMethod)
		r.Put("/admin/shipping/rates", h.Shipping.UpsertRate)
	})

	return r
}

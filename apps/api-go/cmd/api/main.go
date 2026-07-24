package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/handler"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/logger"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/router"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/service"
)

func main() {
	if err := run(); err != nil {
		slog.Error("Startup failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("config error: %w", err)
	}

	// Logging — writes to both stdout and logs/ directory
	log, logCleanup, err := logger.New("logs", cfg.Environment)
	if err != nil {
		return fmt.Errorf("logger: %w", err)
	}
	defer logCleanup()
	slog.SetDefault(log)
	slog.Info("Starting API", "env", cfg.Environment, "port", cfg.APIPort)

	// Database
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("database: %w", err)
	}
	defer pool.Close()
	slog.Info("Connected to PostgreSQL")

	// Redis
	redisClient, err := redis.NewClient(ctx, cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	defer func() { _ = redisClient.Close() }()
	slog.Info("Connected to Redis")

	// ── Repositories ────────────────────────────────────────────────────────
	authRepo := repository.NewAuthRepository(pool)
	categoriesRepo := repository.NewCategoriesRepository(pool)
	tagsRepo := repository.NewTagsRepository(pool)
	productsRepo := repository.NewProductsRepository(pool)
	artistsRepo := repository.NewArtistsRepository(pool)
	projectsRepo := repository.NewProjectsRepository(pool)
	festivalRepo := repository.NewFestivalRepository(pool)
	pressRepo := repository.NewPressRepository(pool)
	pagesRepo := repository.NewPagesRepository(pool)
	servicesRepo := repository.NewServicesRepository(pool)
	quotesRepo := repository.NewQuotesRepository(pool)
	ordersRepo := repository.NewOrdersRepository(pool)
	usersRepo := repository.NewUsersRepository(pool)
	activityLogRepo := repository.NewActivityLogRepository(pool)
	refundsRepo := repository.NewRefundsRepository(pool)
	shippingRepo := repository.NewShippingRepository(pool)
	notificationRepo := repository.NewNotificationRepository(pool)
	statsRepo := repository.NewStatsRepository(pool)
	optionsRepo := repository.NewOptionsRepository(pool)

	// ── Services ─────────────────────────────────────────────────────────────
	mailSvc := mail.NewMailService(cfg)
	notificationsSvc := service.NewNotificationsService(notificationRepo)
	authSvc := service.NewAuthService(authRepo, mailSvc, redisClient, cfg.JWTSecret, cfg.JWTRefreshSecret, cfg.GoogleClientID).
		WithNotifier(notificationsSvc)
	categoriesSvc := service.NewCategoriesService(categoriesRepo)
	tagsSvc := service.NewTagsService(tagsRepo)
	productsSvc := service.NewProductsService(productsRepo, redisClient)
	artistsSvc := service.NewArtistsService(artistsRepo, redisClient)
	artistAccountsSvc := service.NewArtistAccountsService(artistsRepo, authRepo, mailSvc, artistsSvc).
		WithNotifier(notificationsSvc)
	projectsSvc := service.NewProjectsService(projectsRepo)
	festivalSvc := service.NewFestivalService(festivalRepo)
	pressSvc := service.NewPressService(pressRepo)
	pagesSvc := service.NewPagesService(pagesRepo)
	servicesSvc := service.NewServicesService(servicesRepo)
	quotesSvc := service.NewQuotesService(quotesRepo).
		WithNotifier(notificationsSvc, authRepo)
	shippingSvc := service.NewShippingService(shippingRepo)
	ordersSvc := service.NewOrdersService(ordersRepo, productsRepo, shippingSvc).
		WithNotifier(notificationsSvc)
	usersSvc := service.NewUsersService(usersRepo, authRepo)
	cartSvc := service.NewCartService(redisClient)

	// ── Payment providers ────────────────────────────────────────────────────
	var paymentProviders []payment.Provider

	if cfg.StripeSecretKey != "" {
		paymentProviders = append(paymentProviders, payment.NewStripeProvider(cfg.StripeSecretKey, cfg.StripeWebhookSecret))
		slog.Info("Payment provider enabled: Stripe")
	}
	if cfg.PayPalClientID != "" && cfg.PayPalClientSecret != "" {
		paymentProviders = append(paymentProviders, payment.NewPayPalProvider(cfg.PayPalClientID, cfg.PayPalClientSecret, cfg.PayPalSandbox, cfg.PayPalWebhookID))
		slog.Info("Payment provider enabled: PayPal", "sandbox", cfg.PayPalSandbox)
	}
	if cfg.WaveAPIKey != "" {
		paymentProviders = append(paymentProviders, payment.NewWaveProvider(cfg.WaveAPIKey, cfg.WaveSecretKey))
		slog.Info("Payment provider enabled: Wave")
	}
	// Orange Money reste désactivé tant que ENABLE_ORANGE_MONEY n'est pas
	// explicitement à "true" : son VerifyWebhook (payment/orange_money.go) ne
	// vérifie aucune signature, donc n'importe qui pourrait forger un webhook et
	// faire passer une commande en payée. Ne pas réactiver sans ce correctif.
	if cfg.EnableOrangeMoney && cfg.OrangeMoneyClientID != "" {
		paymentProviders = append(paymentProviders, payment.NewOrangeMoneyProvider(cfg.OrangeMoneyClientID, cfg.OrangeMoneyClientSecret, cfg.OrangeMoneyMerchantKey))
		slog.Warn("Payment provider enabled: Orange Money — webhook signature is NOT verified")
	}
	if cfg.NabooAPIKey != "" {
		naboo := payment.NewNabooProvider(cfg.NabooAPIKey, cfg.NabooWebhookSecret)
		if cfg.NabooBaseURL != "" {
			naboo = naboo.WithBaseURL(cfg.NabooBaseURL)
		}
		paymentProviders = append(paymentProviders, naboo)
		slog.Info("Payment provider enabled: Naboo")
	}

	paymentsSvc := service.NewPaymentsService(ordersRepo, redisClient, paymentProviders...).
		WithOrdersService(ordersSvc).
		WithCartService(cartSvc).
		WithNotifier(notificationsSvc)
	refundsSvc := service.NewRefundsService(refundsRepo, ordersRepo, redisClient, mailSvc, paymentProviders...)

	// ── Handlers ────────────────────────────────────────────────────────────
	handlers := &router.Handlers{
		Health:            handler.NewHealthHandler(pool),
		Auth:              handler.NewAuthHandler(authSvc),
		Categories:        handler.NewCategoriesHandler(categoriesSvc),
		Products:          handler.NewProductsHandler(productsSvc),
		Artists:           handler.NewArtistsHandler(artistsSvc),
		Projects:          handler.NewProjectsHandler(projectsSvc),
		Festival:          handler.NewFestivalHandler(festivalSvc),
		Press:             handler.NewPressHandler(pressSvc),
		Pages:             handler.NewPagesHandler(pagesSvc),
		Services:          handler.NewServicesHandler(servicesSvc),
		Orders:            handler.NewOrdersHandler(ordersSvc),
		Quotes:            handler.NewQuotesHandler(quotesSvc),
		Users:             handler.NewUsersHandler(usersSvc),
		Payments:          handler.NewPaymentsHandler(paymentsSvc),
		Tags:              handler.NewTagsHandler(tagsSvc),
		AdminCategories:   handler.NewAdminCategoriesHandler(categoriesSvc),
		AdminTags:         handler.NewAdminTagsHandler(tagsSvc),
		AdminProducts:     handler.NewAdminProductsHandler(productsSvc),
		AdminArtists:      handler.NewAdminArtistsHandler(artistsSvc),
		ArtistMe:          handler.NewArtistMeHandler(artistAccountsSvc),
		AdminArtistInvite: handler.NewAdminArtistInviteHandler(artistAccountsSvc),
		ArtistClaims:      handler.NewArtistClaimHandler(artistAccountsSvc),
		AdminProjects:     handler.NewAdminProjectsHandler(projectsSvc),
		AdminPages:        handler.NewAdminPagesHandler(pagesSvc),
		AdminServices:     handler.NewAdminServicesHandler(servicesSvc),
		AdminFestival:     handler.NewAdminFestivalHandler(festivalSvc),
		AdminPress:        handler.NewAdminPressHandler(pressSvc),
		Media:             handler.NewMediaHandler(cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket, cfg.R2PublicURL),
		Cart:              handler.NewCartHandler(cartSvc, cfg.Environment != "development"),
		ActivityLogs:      handler.NewActivityLogsHandler(activityLogRepo),
		AdminStats:        handler.NewAdminStatsHandler(statsRepo),
		AdminOptions:      handler.NewAdminOptionsHandler(optionsRepo),
		Refunds:           handler.NewRefundsHandler(refundsSvc),
		Shipping:          handler.NewShippingHandler(shippingSvc),
		Notifications:     handler.NewNotificationsHandler(notificationsSvc),
	}

	// ── HTTP Server ──────────────────────────────────────────────────────────
	r := router.NewRouter(cfg, handlers, activityLogRepo, authRepo)
	srv := &http.Server{
		Addr:         ":" + cfg.APIPort,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  time.Minute,
	}

	// Balayage des commandes jamais payées : sans lui, un client qui ferme son
	// onglet immobilise du stock indéfiniment. Le délai doit couvrir la durée
	// réelle d'un paiement NabooPay, sinon on annulerait des règlements en cours.
	sweepCtx, stopSweep := context.WithCancel(ctx)
	defer stopSweep()
	go func() {
		ticker := time.NewTicker(cfg.OrderExpirySweepInterval)
		defer ticker.Stop()
		for {
			select {
			case <-sweepCtx.Done():
				return
			case <-ticker.C:
				released, err := ordersSvc.ExpireUnpaidOrders(sweepCtx, cfg.OrderExpiry)
				if err != nil {
					slog.Error("order expiry sweep failed", "error", err)
					continue
				}
				if released > 0 {
					slog.Info("expired unpaid orders", "count", released, "olderThan", cfg.OrderExpiry)
				}
			}
		}
	}()

	// Balayage des sessions expirées : sans lui, "UserSession" s'accumule pour
	// tout utilisateur qui ne se reconnecte jamais explicitement, ce qui
	// ralentit la boucle bcrypt de Refresh (une comparaison par session active).
	go func() {
		ticker := time.NewTicker(cfg.SessionSweepInterval)
		defer ticker.Stop()
		for {
			select {
			case <-sweepCtx.Done():
				return
			case <-ticker.C:
				deleted, err := authRepo.DeleteExpiredSessions(sweepCtx)
				if err != nil {
					slog.Error("session expiry sweep failed", "error", err)
					continue
				}
				if deleted > 0 {
					slog.Info("expired sessions purged", "count", deleted)
				}
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	errCh := make(chan error, 1)
	go func() {
		slog.Info("Server is listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case sig := <-quit:
		slog.Info("Shutting down", "signal", sig.String())
	}

	shutCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutCtx); err != nil {
		return fmt.Errorf("shutdown error: %w", err)
	}
	slog.Info("Server stopped gracefully")
	return nil
}

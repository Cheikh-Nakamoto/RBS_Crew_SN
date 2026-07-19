package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

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
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/migrations"
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

	// Optional auto-migrate (default off) — set AUTO_MIGRATE=true to run
	// pending goose migrations against DATABASE_URL before the server starts.
	if strings.EqualFold(os.Getenv("AUTO_MIGRATE"), "true") {
		if err := runMigrations(cfg.DatabaseURL); err != nil {
			return fmt.Errorf("auto-migrate: %w", err)
		}
		slog.Info("Migrations applied")
	}

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

	// ── Services ─────────────────────────────────────────────────────────────
	mailSvc := mail.NewMailService(cfg)
	authSvc := service.NewAuthService(authRepo, mailSvc, cfg.JWTSecret, cfg.JWTRefreshSecret)
	categoriesSvc := service.NewCategoriesService(categoriesRepo)
	tagsSvc := service.NewTagsService(tagsRepo)
	productsSvc := service.NewProductsService(productsRepo, redisClient)
	artistsSvc := service.NewArtistsService(artistsRepo, redisClient)
	projectsSvc := service.NewProjectsService(projectsRepo)
	festivalSvc := service.NewFestivalService(festivalRepo)
	pressSvc := service.NewPressService(pressRepo)
	pagesSvc := service.NewPagesService(pagesRepo)
	servicesSvc := service.NewServicesService(servicesRepo)
	quotesSvc := service.NewQuotesService(quotesRepo)
	shippingSvc := service.NewShippingService(shippingRepo)
	ordersSvc := service.NewOrdersService(ordersRepo, productsRepo, shippingSvc)
	usersSvc := service.NewUsersService(usersRepo)
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
	if cfg.OrangeMoneyClientID != "" {
		paymentProviders = append(paymentProviders, payment.NewOrangeMoneyProvider(cfg.OrangeMoneyClientID, cfg.OrangeMoneyClientSecret, cfg.OrangeMoneyMerchantKey))
		slog.Info("Payment provider enabled: Orange Money")
	}
	if cfg.NabooAPIKey != "" {
		naboo := payment.NewNabooProvider(cfg.NabooAPIKey, cfg.NabooWebhookSecret)
		if cfg.NabooBaseURL != "" {
			naboo = naboo.WithBaseURL(cfg.NabooBaseURL)
		}
		paymentProviders = append(paymentProviders, naboo)
		slog.Info("Payment provider enabled: Naboo")
	}

	paymentsSvc := service.NewPaymentsService(ordersRepo, redisClient, paymentProviders...)
	refundsSvc := service.NewRefundsService(refundsRepo, ordersRepo, redisClient, mailSvc, paymentProviders...)

	// ── Handlers ────────────────────────────────────────────────────────────
	handlers := &router.Handlers{
		Health:        handler.NewHealthHandler(pool),
		Auth:          handler.NewAuthHandler(authSvc),
		Categories:    handler.NewCategoriesHandler(categoriesSvc),
		Products:      handler.NewProductsHandler(productsSvc),
		Artists:       handler.NewArtistsHandler(artistsSvc),
		Projects:      handler.NewProjectsHandler(projectsSvc),
		Festival:      handler.NewFestivalHandler(festivalSvc),
		Press:         handler.NewPressHandler(pressSvc),
		Pages:         handler.NewPagesHandler(pagesSvc),
		Services:      handler.NewServicesHandler(servicesSvc),
		Orders:        handler.NewOrdersHandler(ordersSvc),
		Quotes:        handler.NewQuotesHandler(quotesSvc),
		Users:         handler.NewUsersHandler(usersSvc),
		Payments:      handler.NewPaymentsHandler(paymentsSvc),
		Tags:            handler.NewTagsHandler(tagsSvc),
		AdminCategories: handler.NewAdminCategoriesHandler(categoriesSvc),
		AdminTags:       handler.NewAdminTagsHandler(tagsSvc),
		AdminProducts:   handler.NewAdminProductsHandler(productsSvc),
		AdminArtists:    handler.NewAdminArtistsHandler(artistsSvc),
		AdminProjects: handler.NewAdminProjectsHandler(projectsSvc),
		AdminPages:    handler.NewAdminPagesHandler(pagesSvc),
		AdminServices: handler.NewAdminServicesHandler(servicesSvc),
		AdminFestival: handler.NewAdminFestivalHandler(festivalSvc),
		AdminPress:    handler.NewAdminPressHandler(pressSvc),
		Media:         handler.NewMediaHandler(cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket, cfg.R2PublicURL),
		Cart:          handler.NewCartHandler(cartSvc),
		ActivityLogs:  handler.NewActivityLogsHandler(activityLogRepo),
		Refunds:       handler.NewRefundsHandler(refundsSvc),
		Shipping:      handler.NewShippingHandler(shippingSvc),
	}

	// ── HTTP Server ──────────────────────────────────────────────────────────
	r := router.NewRouter(cfg, handlers, activityLogRepo)
	srv := &http.Server{
		Addr:         ":" + cfg.APIPort,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  time.Minute,
	}

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

// runMigrations applies pending goose migrations from the embedded FS.
// It opens a dedicated *sql.DB via the pgx stdlib driver because goose expects
// a database/sql handle rather than a pgxpool.
func runMigrations(databaseURL string) error {
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}

	sqlDB, err := goose.OpenDBWithDriver("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer func() { _ = sqlDB.Close() }()

	if err := goose.Up(sqlDB, "."); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	return nil
}

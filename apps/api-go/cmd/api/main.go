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
	ordersSvc := service.NewOrdersService(ordersRepo, productsRepo)
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

	paymentsSvc := service.NewPaymentsService(ordersRepo, paymentProviders...)

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
	}

	// ── HTTP Server ──────────────────────────────────────────────────────────
	r := router.NewRouter(cfg, handlers)
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

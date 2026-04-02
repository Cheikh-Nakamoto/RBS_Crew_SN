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
	productsRepo := repository.NewProductsRepository(pool)
	artistsRepo := repository.NewArtistsRepository(pool)
	projectsRepo := repository.NewProjectsRepository(pool)
	festivalRepo := repository.NewFestivalRepository(pool)
	pressRepo := repository.NewPressRepository(pool)
	pagesRepo := repository.NewPagesRepository(pool)
	servicesRepo := repository.NewServicesRepository(pool)
	quotesRepo := repository.NewQuotesRepository(pool)
	ordersRepo := repository.NewOrdersRepository(pool)

	// ── Services ─────────────────────────────────────────────────────────────
	authSvc := service.NewAuthService(authRepo, cfg.JWTSecret, cfg.JWTRefreshSecret)
	categoriesSvc := service.NewCategoriesService(categoriesRepo)
	productsSvc := service.NewProductsService(productsRepo, redisClient)
	artistsSvc := service.NewArtistsService(artistsRepo, redisClient)
	projectsSvc := service.NewProjectsService(projectsRepo)
	festivalSvc := service.NewFestivalService(festivalRepo)
	pressSvc := service.NewPressService(pressRepo)
	pagesSvc := service.NewPagesService(pagesRepo)
	servicesSvc := service.NewServicesService(servicesRepo)
	quotesSvc := service.NewQuotesService(quotesRepo)
	ordersSvc := service.NewOrdersService(ordersRepo, productsRepo)

	// ── Handlers ────────────────────────────────────────────────────────────
	handlers := &router.Handlers{
		Health:     handler.NewHealthHandler(pool),
		Auth:       handler.NewAuthHandler(authSvc),
		Categories: handler.NewCategoriesHandler(categoriesSvc),
		Products:   handler.NewProductsHandler(productsSvc),
		Artists:    handler.NewArtistsHandler(artistsSvc),
		Projects:   handler.NewProjectsHandler(projectsSvc),
		Festival:   handler.NewFestivalHandler(festivalSvc),
		Press:      handler.NewPressHandler(pressSvc),
		Pages:      handler.NewPagesHandler(pagesSvc),
		Services:   handler.NewServicesHandler(servicesSvc),
		Orders:     handler.NewOrdersHandler(ordersSvc),
		Quotes:     handler.NewQuotesHandler(quotesSvc),
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

package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL      string
	RedisURL         string
	JWTSecret        string
	JWTRefreshSecret string
	APIPort          string
	Environment      string
	CORSOrigin       string
}

func Load() (*Config, error) {
	_ = godotenv.Load() // Ignore error if .env is missing, just fallback to env vars

	return &Config{
		DatabaseURL:      getEnv("DATABASE_URL", "postgresql://rbs:password@localhost:5432/rbs_db"),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-secret"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret"),
		APIPort:          getEnv("API_PORT", "4000"),
		Environment:      getEnv("NODE_ENV", "development"),
		CORSOrigin:       getEnv("CORS_ORIGIN", "http://localhost:3000"),
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

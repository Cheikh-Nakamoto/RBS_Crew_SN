package config

import (
	"fmt"
	"os"
	"strconv"

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
	AppURL           string

	// SMTP
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	SMTPFrom string

	// Stripe
	StripeSecretKey     string
	StripeWebhookSecret string

	// PayPal
	PayPalClientID     string
	PayPalClientSecret string
	PayPalWebhookID    string
	PayPalSandbox      bool

	// Wave
	WaveAPIKey    string
	WaveSecretKey string

	// Orange Money
	OrangeMoneyClientID     string
	OrangeMoneyClientSecret string
	OrangeMoneyMerchantKey  string

	// Cloudflare R2 (S3-compatible storage)
	R2AccountID   string
	R2AccessKey   string
	R2SecretKey   string
	R2Bucket      string
	R2PublicURL   string
}

func Load() (*Config, error) {
	_ = godotenv.Load() // Ignore error if .env is missing, just fallback to env vars

	env := getEnv("APP_ENV", "development")

	jwtSecret, err := requireEnv("JWT_SECRET")
	if err != nil && env == "production" {
		return nil, err
	}
	if jwtSecret == "" {
		jwtSecret = "change-me-secret-do-not-use-in-production"
	}

	jwtRefreshSecret, err := requireEnv("JWT_REFRESH_SECRET")
	if err != nil && env == "production" {
		return nil, err
	}
	if jwtRefreshSecret == "" {
		jwtRefreshSecret = "change-me-refresh-secret-do-not-use-in-production"
	}

	dbURL, err := requireEnv("DATABASE_URL")
	if err != nil && env == "production" {
		return nil, err
	}
	if dbURL == "" {
		dbURL = "postgresql://rbs:password@localhost:5432/rbs_db"
	}

	return &Config{
		DatabaseURL:         dbURL,
		RedisURL:            getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:           jwtSecret,
		JWTRefreshSecret:    jwtRefreshSecret,
		APIPort:             getEnv("API_PORT", "4000"),
		Environment:         env,
		CORSOrigin:          getEnv("CORS_ORIGIN", "http://localhost:3000"),
		AppURL:              getEnv("APP_URL", "http://localhost:3000"),
		SMTPHost:            getEnv("SMTP_HOST", ""),
		SMTPPort:            getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:            getEnv("SMTP_USER", ""),
		SMTPPass:            getEnv("SMTP_PASS", ""),
		SMTPFrom:            getEnv("SMTP_FROM", "RBS Crew <noreply@rbscrew.sn>"),
		StripeSecretKey:         getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:     getEnv("STRIPE_WEBHOOK_SECRET", ""),
		PayPalClientID:          getEnv("PAYPAL_CLIENT_ID", ""),
		PayPalClientSecret:      getEnv("PAYPAL_CLIENT_SECRET", ""),
		PayPalWebhookID:         getEnv("PAYPAL_WEBHOOK_ID", ""),
		PayPalSandbox:           getEnv("PAYPAL_SANDBOX", "true") == "true",
		WaveAPIKey:              getEnv("WAVE_API_KEY", ""),
		WaveSecretKey:           getEnv("WAVE_SECRET_KEY", ""),
		OrangeMoneyClientID:     getEnv("OM_CLIENT_ID", ""),
		OrangeMoneyClientSecret: getEnv("OM_CLIENT_SECRET", ""),
		OrangeMoneyMerchantKey:  getEnv("OM_MERCHANT_KEY", ""),
		R2AccountID:             getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKey:             getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretKey:             getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2Bucket:                getEnv("R2_BUCKET_NAME", ""),
		R2PublicURL:             getEnv("R2_PUBLIC_URL", ""),
	}, nil
}

func requireEnv(key string) (string, error) {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value, nil
	}
	return "", fmt.Errorf("required environment variable %q is not set", key)
}

func getEnvAsInt(key string, fallback int) int {
	valStr := os.Getenv(key)
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return fallback
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

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

	// Orange Money — désactivé par défaut, voir EnableOrangeMoney.
	EnableOrangeMoney       bool
	OrangeMoneyClientID     string
	OrangeMoneyClientSecret string
	OrangeMoneyMerchantKey  string

	// Expiration des commandes impayées : au-delà de ce délai, la commande est
	// annulée et son stock rendu. Doit rester supérieur au temps réel d'un
	// paiement (redirection provider, saisie, confirmation).
	OrderExpiry              time.Duration
	OrderExpirySweepInterval time.Duration

	// Balayage des sessions dont le refresh token a expiré : sans lui, la table
	// UserSession s'accumule indéfiniment pour les utilisateurs qui ne se
	// reconnectent jamais explicitement, ce qui ralentit la boucle bcrypt de
	// Refresh (une comparaison par session active).
	SessionSweepInterval time.Duration

	// Google OAuth — seul le client ID est nécessaire côté API : il sert à
	// vérifier l'audience de l'id_token émis par Google.
	GoogleClientID string

	// Naboo
	NabooAPIKey        string
	NabooWebhookSecret string
	NabooBaseURL       string

	// Cloudflare R2 (S3-compatible storage)
	R2AccountID string
	R2AccessKey string
	R2SecretKey string
	R2Bucket    string
	R2PublicURL string
}

func Load() (*Config, error) {
	_ = godotenv.Load() // Ignore error if .env is missing, just fallback to env vars

	env := getEnv("APP_ENV", "development")

	// Required secrets — must be set regardless of APP_ENV.
	jwtSecret, err := requireEnv("JWT_SECRET")
	if err != nil {
		return nil, err
	}

	jwtRefreshSecret, err := requireEnv("JWT_REFRESH_SECRET")
	if err != nil {
		return nil, err
	}

	dbURL, err := requireEnv("DATABASE_URL")
	if err != nil {
		return nil, err
	}

	return &Config{
		DatabaseURL:      dbURL,
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:        jwtSecret,
		JWTRefreshSecret: jwtRefreshSecret,
		APIPort:          getEnv("API_PORT", "4000"),
		Environment:      env,
		CORSOrigin:       getEnv("CORS_ORIGIN", "http://localhost:3000,https://rbs-crew.cheikhmodiouf.org"),
		AppURL:           getEnv("APP_URL", "http://localhost:3000"),
		SMTPHost:         getEnv("SMTP_HOST", ""),
		SMTPPort:         getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:         getEnv("SMTP_USER", ""),
		SMTPPass:         getEnv("SMTP_PASS", ""),
		SMTPFrom:         getEnv("SMTP_FROM", "RBS Crew <noreply@rbscrew.sn>"),
		GoogleClientID:   getEnv("GOOGLE_CLIENT_ID", ""),

		OrderExpiry:              time.Duration(getEnvAsInt("ORDER_EXPIRY_MINUTES", 45)) * time.Minute,
		OrderExpirySweepInterval: time.Duration(getEnvAsInt("ORDER_EXPIRY_SWEEP_MINUTES", 5)) * time.Minute,
		SessionSweepInterval:     time.Duration(getEnvAsInt("SESSION_SWEEP_MINUTES", 60)) * time.Minute,
		StripeSecretKey:          getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:      getEnv("STRIPE_WEBHOOK_SECRET", ""),
		PayPalClientID:           getEnv("PAYPAL_CLIENT_ID", ""),
		PayPalClientSecret:       getEnv("PAYPAL_CLIENT_SECRET", ""),
		PayPalWebhookID:          getEnv("PAYPAL_WEBHOOK_ID", ""),
		PayPalSandbox:            getEnv("PAYPAL_SANDBOX", "true") == "true",
		WaveAPIKey:               getEnv("WAVE_API_KEY", ""),
		WaveSecretKey:            getEnv("WAVE_SECRET_KEY", ""),
		EnableOrangeMoney:        getEnv("ENABLE_ORANGE_MONEY", "false") == "true",
		OrangeMoneyClientID:      getEnv("OM_CLIENT_ID", ""),
		OrangeMoneyClientSecret:  getEnv("OM_CLIENT_SECRET", ""),
		OrangeMoneyMerchantKey:   getEnv("OM_MERCHANT_KEY", ""),
		NabooAPIKey:              getEnv("NABOO_API_KEY", ""),
		NabooWebhookSecret:       getEnv("NABOO_WEBHOOK_SECRET", ""),
		NabooBaseURL:             getEnv("NABOO_BASE_URL", ""),
		R2AccountID:              getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKey:              getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretKey:              getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2Bucket:                 getEnv("R2_BUCKET_NAME", ""),
		R2PublicURL:              getEnv("R2_PUBLIC_URL", ""),
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

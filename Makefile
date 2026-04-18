.PHONY: install dev dev-api dev-web up down logs logs-api logs-web \
        build build-api build-web lint test clean health \
        db-sqlc db-docs \
        migrate-extract migrate-upload migrate-db-push migrate-import migrate-full

# ── Node Env ─────────────────────────────────
# Configure NVM to ensure npm and node are found by make
NVM_PATH := $(shell bash -c '. ~/.nvm/nvm.sh && nvm use 20 > /dev/null 2>&1 && dirname $$(which node)' 2>/dev/null || echo "")
ifneq ($(NVM_PATH),)
export PATH := $(NVM_PATH):$(PATH)
endif

# ── Setup ────────────────────────────────────

install: ## Install Node dependencies (web)
	npm install

# ── Development ──────────────────────────────

dev: ## Start postgres+redis in Docker, then run API Go + Web in parallel
	docker compose up -d postgres redis
	$(MAKE) -j2 dev-api dev-web

dev-api: ## Run Go API in dev mode (hot-reload)
	cd apps/api-go && go run ./cmd/api

dev-web: ## Run Next.js web in dev mode
	cd apps/web && npm run dev

up: ## Build and start all services in Docker
	docker compose up -d --build

down: ## Stop all Docker services
	docker compose down

logs: ## Follow logs for all services
	docker compose logs -f

logs-api: ## Follow Go API logs
	docker compose logs -f nestjs-api

logs-web: ## Follow Next.js web logs
	docker compose logs -f nextjs-web

# ── Build ────────────────────────────────────

build: build-api build-web ## Build API Go + Web

build-api: ## Build Go API binary → apps/api-go/dist/api-go
	cd apps/api-go && $(MAKE) build

build-web: install ## Build Next.js for production
	cd apps/web && npm run build

# ── Code Generation ──────────────────────────

db-sqlc: ## Regenerate DB queries from SQL (sqlc)
	cd apps/api-go && sqlc generate

db-docs: ## Regenerate Swagger/OpenAPI docs (swag)
	cd apps/api-go && swag init -g ./cmd/api/main.go -o docs --parseDependency

# ── Quality ──────────────────────────────────

lint: ## Run linters (Go + web)
	cd apps/api-go && golangci-lint run ./...
	cd apps/web && npm run lint

test: ## Run tests (Go + web)
	cd apps/api-go && go test -race -cover ./...
	cd apps/web && npm run test --if-present

# ── Migration from WordPress ─────────────────

migrate-extract: ## Extraire toutes les données de WordPress vers JSON
	cd migration-scripts && npm run all

migrate-upload: ## Envoyer toutes les images locales vers Cloudflare S3
	cd migration-scripts && npm run upload-s3

migrate-db-push: ## Appliquer le schéma SQL sur la base de données
	psql "$$DATABASE_URL" -f apps/api-go/sql/schema.sql

migrate-import: ## Injecter les fichiers JSON dans PostgreSQL
	cd migration-scripts && npx tsx import-db.ts

migrate-full: migrate-extract migrate-upload migrate-db-push migrate-import ## Pipeline complet de migration

# ── Health Checks ────────────────────────────

health: ## Check health of API, nginx and web
	@echo "=== Go API Health ==="
	@curl -sf http://localhost:4000/health 2>/dev/null && echo "" || echo "API unreachable"
	@echo "=== Nginx → API ==="
	@curl -sf http://localhost/api/health 2>/dev/null && echo "" || echo "Nginx→API unreachable"
	@echo "=== Nginx → Web ==="
	@curl -sf -o /dev/null -w "HTTP %{http_code}" http://localhost/ 2>/dev/null && echo "" || echo "Nginx→Web unreachable"

# ── Cleanup ──────────────────────────────────

clean: ## Remove node_modules, Go dist, .next, .turbo
	rm -rf node_modules apps/web/node_modules packages/*/node_modules
	rm -rf apps/api-go/dist apps/web/.next
	rm -rf .turbo apps/*/.turbo packages/*/.turbo

# ── Help ─────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

.PHONY: install dev dev-api dev-web up down logs logs-api logs-web \
        build build-api build-web lint test clean health help \
        db-sqlc db-docs \
        db-reset db-push \
        migrate-extract migrate-upload migrate-import migrate-full

# ── Node Env ─────────────────────────────────
# Configure NVM to ensure npm and node are found by make
NVM_PATH := $(shell bash -c '. ~/.nvm/nvm.sh && nvm use 20 > /dev/null 2>&1 && dirname $$(which node)' 2>/dev/null || echo "")
ifneq ($(NVM_PATH),)
export PATH := $(NVM_PATH):$(PATH)
endif

# ── Outils Go ────────────────────────────────
# swag s'installe dans $GOPATH/bin, qui n'est pas toujours dans le PATH.
SWAG := $(shell go env GOPATH)/bin/swag

# ── Setup ────────────────────────────────────

install: ## Install Node dependencies (web)
	npm install

# ── Development ──────────────────────────────

dev: ## Start postgres+redis in Docker, then run API Go + Web in parallel
	docker compose up -d postgres redis
	$(MAKE) -j2 dev-api dev-web

dev-api: ## Run Go API (recompile at each `make dev-api`, pas de hot-reload)
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
	docker compose logs -f api-go

logs-web: ## Follow Next.js web logs
	docker compose logs -f nextjs-web

# ── Build ────────────────────────────────────

build: build-api build-web ## Build API Go + Web

# Ne PAS déléguer à apps/api-go/Makefile : sa cible `build` dépend de `generate`,
# qui régénère sqlc ET le swagger versionné — un simple build réécrivait donc des
# fichiers suivis par git. La génération reste explicite : `db-sqlc` / `db-docs`.
build-api: ## Build Go API binary → apps/api-go/dist/api-go
	cd apps/api-go && CGO_ENABLED=0 go build -ldflags="-s -w" -o dist/api-go ./cmd/api

build-web: install ## Build Next.js for production
	cd apps/web && npm run build

# ── Code Generation ──────────────────────────

db-sqlc: ## Regenerate DB queries from SQL (sqlc)
	cd apps/api-go && sqlc generate

db-docs: ## Regenerate Swagger/OpenAPI docs (swag)
	@test -x "$(SWAG)" || { echo "swag introuvable — go install github.com/swaggo/swag/cmd/swag@latest"; exit 1; }
	cd apps/api-go && $(SWAG) init -g ./cmd/api/main.go -o docs --parseDependency

# ── Quality ──────────────────────────────────

lint: ## Run linters (Go + web)
	cd apps/api-go && golangci-lint run ./...
	cd apps/web && npm run lint

test: ## Run tests (Go + web)
	cd apps/api-go && go test -race -cover ./...
	cd apps/web && npm run test --if-present

# ── Schéma de base de données ────────────────
# Source de vérité unique : apps/api-go/sql/schema.sql (aucune migration
# incrémentale, aucun ALTER TABLE). Voir l'avertissement en tête de ce fichier.

db-reset: ## ⚠️ DÉTRUIT la base et la recrée depuis sql/schema.sql (toutes les données sont perdues)
	docker compose down -v
	docker compose up -d --wait postgres redis
	@echo ""
	@echo "Base recréée depuis apps/api-go/sql/schema.sql ($$(docker compose exec -T postgres \
		psql -U $${POSTGRES_USER:-rbs} -d $${POSTGRES_DB:-rbs_db} -tAc \
		"select count(*) from information_schema.tables where table_schema='public'" | tr -d '\r') tables)."
	@echo "Note : le volume redis a également été supprimé (paniers + caches)."
	@echo "Pour réinjecter les données WordPress : make migrate-import"

db-push: ## Appliquer sql/schema.sql sur une base EXISTANTE (ne droppe rien)
	psql "$$DATABASE_URL" -f apps/api-go/sql/schema.sql

# ── Migration from WordPress ─────────────────

migrate-extract: ## Extraire toutes les données de WordPress vers JSON
	cd migration-scripts && npm run all

migrate-upload: ## Envoyer toutes les images locales vers Cloudflare S3
	cd migration-scripts && npm run upload-s3

migrate-import: ## Injecter les fichiers JSON dans PostgreSQL
	cd migration-scripts && npm run import-db

migrate-full: migrate-extract migrate-upload migrate-import ## Pipeline complet de migration

# ── Health Checks ────────────────────────────

# L'API n'expose aucun port sur l'hôte en Docker (accès via le réseau interne
# uniquement) : on l'interroge donc depuis le conteneur. En mode `make dev` elle
# tourne en revanche sur localhost:4000 — les deux cas sont couverts.
# Nginx n'est pas orchestré par docker-compose : il n'est pas testé ici.
health: ## Check health of API and web
	@echo "=== Go API (conteneur) ==="
	@docker compose exec -T api-go wget -qO- http://127.0.0.1:4000/health 2>/dev/null \
		&& echo "" || echo "  injoignable (conteneur arrêté ?)"
	@echo "=== Go API (mode dev, localhost:4000) ==="
	@curl -sf http://localhost:4000/health 2>/dev/null && echo "" || echo "  injoignable"
	@echo "=== Next.js (localhost:3000) ==="
	@code=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null); \
		if [ "$$code" = "000" ]; then echo "  injoignable"; else echo "  HTTP $$code"; fi

# ── Cleanup ──────────────────────────────────

clean: ## Remove node_modules, Go dist, .next, .turbo
	rm -rf node_modules apps/web/node_modules packages/*/node_modules
	rm -rf apps/api-go/dist apps/web/.next
	rm -rf .turbo apps/*/.turbo packages/*/.turbo

# ── Help ─────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

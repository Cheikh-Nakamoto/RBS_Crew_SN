.PHONY: install dev up down logs logs-api logs-web build lint test clean health \
       db-migrate db-generate db-seed db-studio db-reset migrate-products

# ── Setup ────────────────────────────────────

install: ## Install all workspace dependencies
	npm install

# ── Development ──────────────────────────────

dev: ## Start postgres+redis in Docker, then run API + Web locally with hot-reload
	docker compose up -d postgres redis
	npx turbo dev

up: ## Build and start all services in Docker
	docker compose up -d --build

down: ## Stop all Docker services
	docker compose down

logs: ## Follow logs for all services
	docker compose logs -f

logs-api: ## Follow NestJS API logs
	docker compose logs -f nestjs-api

logs-web: ## Follow Next.js web logs
	docker compose logs -f nextjs-web

# ── Build & Quality ─────────────────────────

build: ## Build all packages
	npx turbo build

lint: ## Run linters across all packages
	npx turbo lint

test: ## Run tests across all packages
	npx turbo test

# ── Database ─────────────────────────────────

db-migrate: ## Run Prisma migrations (dev)
	cd apps/api && npx prisma migrate dev

db-generate: ## Regenerate Prisma client
	cd apps/api && npx prisma generate

db-seed: ## Seed the database
	cd apps/api && npx prisma db seed

db-studio: ## Open Prisma Studio (DB GUI)
	cd apps/api && npx prisma studio

db-reset: ## Reset database and re-run all migrations
	cd apps/api && npx prisma migrate reset

# ── Migration from WordPress ─────────────────

migrate-products: ## Extract products from WooCommerce and seed into PostgreSQL
	cd migration-scripts && npx ts-node extract-products.ts

# ── Health Checks ────────────────────────────

health: ## Check health of API and nginx
	@echo "=== API Health ==="
	@curl -sf http://localhost:4000/health 2>/dev/null && echo "" || echo "API unreachable"
	@echo "=== Nginx → API ==="
	@curl -sf http://localhost/api/health 2>/dev/null && echo "" || echo "Nginx→API unreachable"
	@echo "=== Nginx → Web ==="
	@curl -sf -o /dev/null -w "HTTP %{http_code}" http://localhost/ 2>/dev/null && echo "" || echo "Nginx→Web unreachable"

# ── Cleanup ──────────────────────────────────

clean: ## Remove node_modules, dist, .next, .turbo
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/api/dist apps/web/.next
	rm -rf .turbo apps/*/.turbo packages/*/.turbo

# ── Help ─────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

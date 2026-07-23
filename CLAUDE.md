# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: Go 1.26 with `chi` router, `pgx` for PostgreSQL 16, `go-redis` for Redis 7, `sqlc` for query generation
- **Frontend**: Next.js 16 (App Router, React 19, RSC, React Compiler), Tailwind CSS 4, shadcn/ui (Base UI), `next-auth` 5 beta with JWT credentials
- **Infra**: Docker Compose (postgres + redis + go api + nextjs), Nginx reverse proxy config in `infra/nginx/`
- **Payments**: Stripe, PayPal, Wave, Orange Money — pluggable provider interface in `apps/api-go/internal/payment/`
- **Storage**: Cloudflare R2 (S3-compatible) via AWS SDK v2
- **Monorepo**: npm workspaces + Turborepo (`apps/web`, `apps/api-go`, `packages/types`, `packages/ui`, `packages/config`)
- **Migration**: Node.js scripts in `migration-scripts/` for extracting WooCommerce/WordPress data into this system

## Development Commands

```bash
# First-time setup
make install          # npm install (needs Node 20 via NVM)
docker compose up -d postgres redis  # start infrastructure

# Development (with hot-reload)
make dev              # starts postgres+redis, then go api + nextjs in parallel
make dev-api          # go run ./cmd/api (from apps/api-go)
make dev-web          # next dev (from apps/web)

# Build
make build            # builds both API and Web
make build-api        # CGO_ENABLED=0 go build → dist/api-go
make build-web        # next build (standalone output)

# Code generation (required after SQL changes)
make db-sqlc          # sqlc generate (creates Go types/queries from .sql files)
make db-docs          # swag init for Swagger/OpenAPI docs

# Quality
make lint             # golangci-lint + eslint
make test             # go test -race -cover + web tests (if present)

# Docker
make up               # docker compose up -d --build (all services)
make down             # docker compose down
make logs             # docker compose logs -f

# Health checks
make health           # curl health endpoints (API, Nginx→API, Nginx→Web)

# Clean
make clean            # remove node_modules, dist, .next, .turbo

# View all targets
make help
```

## Architecture

### Monorepo Layout

```
apps/
  api-go/             # Go REST API (chi router, chi middleware stack)
    cmd/api/main.go   #   entrypoint: wires config → db → redis → repos → services → handlers → router → http.Server
    internal/
      config/         #   env loading (.env + os.Getenv), typed Config struct
      db/             #   pgxpool connection + sqlc-generated queries
      handler/        #   HTTP handlers (one file per domain + admin_* variants)
      logger/         #   slog dual-output (stdout + daily file in logs/)
      mail/           #   gomail SMTP service
      middleware/      #   RequestID, Logger, Recovery, SecurityHeaders, MaxBodySize, CORS, Locale, RateLimit, RequireAuth, RequireRoles, ActivityLogger
      model/          #   domain structs
      payment/        #   PaymentProvider interface + Stripe/PayPal/Wave/OrangeMoney implementations
      redis/          #   go-redis client
      repository/     #   data access (sqlc queries, pgxpool)
      router/         #   chi router setup — three route groups: public, authenticated, admin
      service/        #   business logic layer between handlers and repositories
      sql/            #   raw SQL files consumed by sqlc
    sql/schema.sql    #   SOURCE DE VÉRITÉ UNIQUE du schéma — CREATE TABLE only, jamais d'ALTER.
                      #   Exécuté par Postgres à la création de la base (initdb) ET lu par sqlc.
    sqlc.yaml         #   sqlc config
  web/                # Next.js 16 App Router
    app/
      layout.tsx      #   root layout
      (public)/       #   public-facing pages: home, shop, crew, festival, projects, press, labz, login, register, profile
      (admin)/        #   admin CRUD pages: produits, commandes, devis, categories, tags, artistes, etc.
      api/auth/[...nextauth]/route.ts  # next-auth route handler
    components/
      ui/             #   shadcn/ui primitives (button, dialog, table, form, etc.) + custom animated components
      layout/         #   navbar + footer
      admin/          #   admin-specific components (stats cards, activity logs, delete dialogs)
      composite/      #   composed components (carousel demos, festival gallery)
    lib/
      api.ts          #   ky client (auto-detects server vs client for API URL)
      auth.ts         #   next-auth config (Credentials + Google, JWT refresh rotation)
      admin/          #   admin API helpers, schemas, error handling, query factories
    middleware.ts     #   next-auth middleware — protects /admin (role check) and /profile, /shop/checkout
    next.config.ts    #   standalone output, React Compiler, rewrites /backend → api container
packages/
  types/              #   shared TypeScript types (Product, Order, User, etc.)
  ui/                 #   shared UI components
  config/             #   shared config
```

### Backend: Layered Architecture (handler → service → repository → sqlc)

Every domain entity follows the same pattern:
- **SQL layer**: raw parameterized queries in `internal/sql/` compiled by sqlc into `internal/db/queries/`
- **Repository**: wraps sqlc `*Queries` with domain-specific methods, returns `model.*` types
- **Service**: business logic, caching (Redis), validation
- **Handler**: JSON request/response, calls service, returns `{ data, meta }` envelope
- **Router**: chi groups — public (rate-limited), authenticated (JWT Bearer), admin (JWT + role check + activity logging)

### API Route Design

- `/health` — DB health check
- `/auth/*` — register, login, refresh, logout, verify-email, forgot/reset password
- `/categories`, `/tags`, `/products`, `/artists`, `/projects`, `/festival`, `/press`, `/pages`, `/services` — public read-only
- `/quotes` — public POST (heavily rate-limited: 1 req/5min)
- `/payments/webhook/*` — public, per-provider webhook endpoints
- `/cart`, `/orders`, `/users/me`, `/auth/me` — authenticated
- `/admin/*` — admin/editor only, activity-logged

### Frontend: Route Groups

- `(public)/` — pages accessible to all visitors (home, shop, crew, festival, projects, press, labz, login, register, profile)
- `(admin)/admin/` — full CRUD for all entities (produits, commandes, devis, categories, tags, artistes, projets, pages, services, editions, presse, utilisateurs, activite)
- Admin pages use Server Actions for mutations, ky client for data fetching

### Auth Flow

1. Next.js middleware (`middleware.ts`) wraps next-auth — protects `/admin` (requires ADMIN/EDITOR role) and `/profile`, `/shop/checkout` (requires login)
2. next-auth Credentials provider calls Go API `/auth/login`, `/auth/me`
3. JWT tokens stored in next-auth session with automatic refresh rotation (14-min expiry)
4. On the Go side: `middleware.RequireAuth` validates JWT, `RequireRoles` enforces role-based access
5. Server-side API calls from RSC use `INTERNAL_API_URL` (docker network), client-side uses `NEXT_PUBLIC_API_URL`

### Docker Networking

- `postgres` and `redis` bound to `127.0.0.1` on host (for dev), available on Docker network for containers
- `nestjs-api` (Go API) — NOT exposed to host, only via Docker network or Next.js rewrites
- `nextjs-web` on `:3000`
- Next.js rewrite rule: `/backend/:path*` → `http://nestjs-api:4000/:path*`
- In prod, Nginx reverse-proxies both (config in `infra/nginx/`)

### Migration from WordPress

Scripts in `migration-scripts/` handle the WordPress → PostgreSQL migration:
- `run-all.ts` — extract all WP data to JSON
- `upload-s3.ts` — upload local images to Cloudflare R2
- `import-db.ts` — import JSON into PostgreSQL
- Use `make migrate-full` for the complete pipeline

## Environment Variables

Copy `.env.example` → `.env`. Critical variables:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — generate with `openssl rand -base64 64`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `R2_*` — Cloudflare R2 credentials for media storage
- `INTERNAL_API_URL` — Docker service URL for server-side API calls (set in docker-compose)

## Testing

- **Current state**: the Go side has integration tests (`internal/service`, `internal/handler`, `internal/middleware`) run by `make test`. `apps/web` has no `test` script, so `make test`'s web step (`npm run test --if-present`) is a no-op.
- **Go**: `make test` runs `go test -race -cover ./...` from `apps/api-go`. To run a single test once tests exist: `cd apps/api-go && go test -race -run TestName ./internal/service/...`
- **Lint** (`make lint`) is the main automated gate today: `golangci-lint run ./...` (Go) + `eslint` (web). Run it before committing.

## Notes

- The Go API is named `nestjs-api` in Docker but it's Go, not NestJS — this is a leftover from a previous stack
- `apps/web/AGENTS.md` warns about Next.js 16 breaking changes — read `node_modules/next/dist/docs/` before writing Next.js code
- Go codegen (`sqlc generate`, via `make db-sqlc`) must be run after any change to `internal/sql/*.sql` **or** to `sql/schema.sql`
- **Schema changes**: edit `apps/api-go/sql/schema.sql` (no `ALTER TABLE`, no migration files), then `make db-sqlc` and `make db-reset`. `db-reset` destroys all data — see the warning at the top of `schema.sql`.
- **Schema changes on a live database** (prod, or local data you want to keep): also add an idempotent copy of the new `CREATE` (with `IF NOT EXISTS`) to `apps/api-go/sql/patches/`, then run `make db-patch` (honours `DATABASE_URL`, falls back to the compose container). Patches are replayed in full on every run, so they must stay idempotent. `schema.sql` remains the single source of truth — a patch is the same DDL made replayable for databases that predate it.
- Activity logging middleware records all admin actions to the `ActivityLog` table
- Redis is used for caching (products, artists) and cart state

## Multi-Agent Orchestration

This project uses a multi-agent system. Agent memory files live in `.claude/agent-memory/`.

| Agent | Role | Memory File |
|-------|------|-------------|
| aziz | CTO (arbitration) | `aziz.md` |
| product-manager | PM (specs, user stories) | `product-manager.md` |
| lucas | Tech Lead (architecture) | `lucas.md` |
| mouha | Frontend | `mouha.md` |
| mounzil | Backend | `mounzil.md` |
| malang | DevOps | `malang.md` |
| janel | QA | `janel.md` |
| massar | Security | `massar.md` |

Typical flow for new features: PM → Lucas → mounzil (API) + mouha (UI) → janel (tests) → massar (security) → malang (deploy)

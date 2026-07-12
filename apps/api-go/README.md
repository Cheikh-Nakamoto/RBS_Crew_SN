# api-go

Go backend for RBS Crew SN.

## Database migrations

Schema changes are managed with [goose](https://github.com/pressly/goose) as
plain SQL migrations under [`./migrations/`](./migrations/). The baseline
(`00001_baseline.sql`) mirrors the frozen `sql/schema.sql`; all subsequent
changes must be added as new numbered files.

### Make targets (run from repo root)

`DATABASE_URL` must be exported (or defined in your shell env).

| Target | Description |
| --- | --- |
| `make migrate-up` | Apply all pending migrations |
| `make migrate-down` | Roll back the last migration |
| `make migrate-status` | Show which migrations have been applied |
| `make migrate-create NAME=add_something` | Scaffold a new empty SQL migration |

### Adding a new migration

```bash
NAME=add_foo_to_bar make migrate-create
# edit apps/api-go/migrations/000NN_add_foo_to_bar.sql
make migrate-up
```

Each generated file has `-- +goose Up` / `-- +goose Down` sections. Wrap
multi-statement blocks (functions, DO blocks) with
`-- +goose StatementBegin` / `-- +goose StatementEnd`.

### Auto-migrate on startup (optional)

If the env var `AUTO_MIGRATE=true` is set, the API will run `goose up` against
`DATABASE_URL` before starting the HTTP server. Migrations are embedded in the
binary via `//go:embed`, so no filesystem access is required at runtime.

Auto-migrate is **off by default** so production deployments can run migrations
out-of-band (e.g. from CI or a one-shot job).

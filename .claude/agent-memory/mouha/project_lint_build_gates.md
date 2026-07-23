---
name: lint-build-gates
description: How to run/interpret lint and build gates for frontend work in apps/web (make lint quirks, Turbopack route table)
metadata:
  type: project
---

`make lint` and `make build-web` gotchas when doing frontend-only work in `apps/web`.

**`make lint` is blocked by pre-existing Go failures, not frontend.** The target runs `cd apps/api-go && golangci-lint run ./...` FIRST, then `cd apps/web && npm run lint`. As of 2026-07, the Go step fails (errcheck/staticcheck/unused in internal/payment, internal/redis, internal/service) — pre-existing backend debt outside frontend scope — so `make` aborts before the web eslint ever runs.

**Why:** A frontend agent cannot make `make lint` green; the Go failures belong to backend (mounzil).
**How to apply:** For a frontend lint gate, run `cd apps/web && npm run lint` directly. Exit 0 with only warnings is the healthy state. Don't try to "fix" the Go lint errors — flag them to backend instead.

**`make build-web` must run from repo root** (Makefile lives there). Chaining after `cd apps/web` breaks it ("Aucune règle pour ... build-web"). Use `make -C <repo-root> build-web`.

**Next 16 Turbopack build prints a route table with NO size columns** (just the route tree + symbols). Per-route First Load JS sizes are not emitted, so bundle-size diffs can't be read from `next build` output. Compare route lists structurally; inspect `.next/static` chunk sizes if you need byte-level evidence of code-splitting.

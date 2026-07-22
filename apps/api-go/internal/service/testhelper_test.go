package service

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/config"
	dbpkg "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/jackc/pgx/v5/pgxpool"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// Shared postgres container across tests in this package.
// The first test that needs a DB starts a container and applies the schema.
// Subsequent tests reuse the pool but truncate the tables they mutate (see truncate helpers).
var (
	sharedPGOnce sync.Once
	sharedPGPool *pgxpool.Pool
	sharedPGErr  error
)

// getTestPool starts (once) a Postgres 16 testcontainer, applies sql/schema.sql,
// and returns a *pgxpool.Pool. Tests should call t.Skip if err indicates docker/setup
// isn't available so `-short` can still pass on non-docker CI.
func getTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	if testing.Short() {
		t.Skip("skipping integration test in -short mode")
	}

	sharedPGOnce.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()

		container, err := tcpostgres.Run(ctx,
			"postgres:16-alpine",
			tcpostgres.WithDatabase("rbstest"),
			tcpostgres.WithUsername("rbstest"),
			tcpostgres.WithPassword("rbstest"),
			tcpostgres.BasicWaitStrategies(),
			tcpostgres.WithSQLDriver("pgx"),
		)
		if err != nil {
			sharedPGErr = fmt.Errorf("start container: %w", err)
			return
		}

		// wait until log is ready — extra safety
		if err := wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).
			WithStartupTimeout(60*time.Second).
			WaitUntilReady(ctx, container); err != nil {
			sharedPGErr = fmt.Errorf("wait ready: %w", err)
			return
		}

		connStr, err := container.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			sharedPGErr = fmt.Errorf("conn str: %w", err)
			return
		}

		pool, err := dbpkg.NewPool(ctx, connStr)
		if err != nil {
			sharedPGErr = fmt.Errorf("new pool: %w", err)
			return
		}

		// Le schéma est appliqué depuis sql/schema.sql, l'unique source de
		// vérité (il n'y a plus de migrations incrémentales). Chemin relatif
		// au package : //go:embed ne peut pas remonter au-dessus de celui-ci.
		schemaSQL, err := os.ReadFile(filepath.Join("..", "..", "sql", "schema.sql"))
		if err != nil {
			sharedPGErr = fmt.Errorf("read schema: %w", err)
			return
		}
		if _, err := pool.Exec(ctx, `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;`); err != nil {
			sharedPGErr = fmt.Errorf("create extensions: %w", err)
			return
		}
		if _, err := pool.Exec(ctx, string(schemaSQL)); err != nil {
			sharedPGErr = fmt.Errorf("apply schema: %w", err)
			return
		}
		sharedPGPool = pool
	})

	if sharedPGErr != nil {
		t.Skipf("skipping: postgres container unavailable: %v", sharedPGErr)
	}
	return sharedPGPool
}

// truncateAll clears the tables commonly touched by tests. Called at the start of each
// test that mutates state so tests don't leak into each other.
func truncateAll(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	// Delete order matters due to FK; TRUNCATE ... CASCADE simplifies.
	stmt := `TRUNCATE TABLE
		"UserSession","OrderItem","Payment","Order","ProductTranslation",
		"ProductCategory","ProductTag","ProductImage","ProductVariant","ProductAttribute",
		"Product","CategoryTranslation","Category","TagTranslation","Tag","Address","User"
		RESTART IDENTITY CASCADE`
	if _, err := pool.Exec(ctx, stmt); err != nil {
		// If a table doesn't exist for some reason, log & continue; tests will fail
		// with clearer errors when they run.
		t.Logf("truncate warning: %v", err)
	}
}

// mailStub returns a mail.MailService safe for tests (SMTPHost empty → no real send).
func mailStub() *mail.MailService {
	return mail.NewMailService(&config.Config{})
}

// mustExec runs a raw statement — useful for seeding.
func mustExec(t *testing.T, pool *pgxpool.Pool, sqlStr string, args ...any) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := pool.Exec(ctx, sqlStr, args...); err != nil {
		t.Fatalf("exec %q: %v", firstLine(sqlStr), err)
	}
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i > 0 {
		return s[:i]
	}
	return s
}

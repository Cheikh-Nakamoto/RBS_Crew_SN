package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsRepository struct {
	pool *pgxpool.Pool
}

func NewStatsRepository(pool *pgxpool.Pool) *StatsRepository {
	return &StatsRepository{pool: pool}
}

// DashboardCounts are the four KPI counters of the admin dashboard.
type DashboardCounts struct {
	PendingOrders     int64 `json:"pendingOrders"`
	Users             int64 `json:"users"`
	PublishedProducts int64 `json:"publishedProducts"`
	Quotes            int64 `json:"quotes"`
}

// DashboardCounts computes the four counters in a single round-trip, so the
// dashboard no longer has to page through list endpoints just to read totals.
func (r *StatsRepository) DashboardCounts(ctx context.Context) (*DashboardCounts, error) {
	var c DashboardCounts
	err := r.pool.QueryRow(ctx,
		`SELECT
		   (SELECT COUNT(*) FROM "Order" WHERE status = 'PENDING'::"OrderStatus"),
		   (SELECT COUNT(*) FROM "User"),
		   (SELECT COUNT(*) FROM "Product" WHERE status = 'PUBLISHED'::"ProductStatus"),
		   (SELECT COUNT(*) FROM "Quote")`,
	).Scan(&c.PendingOrders, &c.Users, &c.PublishedProducts, &c.Quotes)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

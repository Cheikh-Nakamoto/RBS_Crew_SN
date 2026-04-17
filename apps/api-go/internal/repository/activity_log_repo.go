package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ActivityLog struct {
	ID         string
	UserID     string
	UserEmail  string
	Method     string
	Path       string
	EntityType string
	EntityId   *string
	StatusCode int
	CreatedAt  time.Time
}

type ActivityLogRepository struct {
	pool *pgxpool.Pool
}

func NewActivityLogRepository(pool *pgxpool.Pool) *ActivityLogRepository {
	return &ActivityLogRepository{pool: pool}
}

func (r *ActivityLogRepository) Create(ctx context.Context, entry *ActivityLog) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO "ActivityLog" ("id","userId","userEmail","method","path","entityType","entityId","statusCode","createdAt")
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
		entry.ID, entry.UserID, entry.UserEmail, entry.Method,
		entry.Path, entry.EntityType, entry.EntityId, entry.StatusCode,
	)
	return err
}

func (r *ActivityLogRepository) List(ctx context.Context, limit, offset int32) ([]ActivityLog, int64, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT "id","userId","userEmail","method","path","entityType","entityId","statusCode","createdAt",
		        COUNT(*) OVER() AS total
		 FROM "ActivityLog"
		 ORDER BY "createdAt" DESC
		 LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []ActivityLog
	var total int64
	for rows.Next() {
		var l ActivityLog
		if err := rows.Scan(
			&l.ID, &l.UserID, &l.UserEmail, &l.Method,
			&l.Path, &l.EntityType, &l.EntityId, &l.StatusCode, &l.CreatedAt,
			&total,
		); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}
	return logs, total, rows.Err()
}

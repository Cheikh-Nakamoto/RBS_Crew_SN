package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Notification struct {
	ID        string
	UserID    string
	Type      string
	Title     string
	Body      string
	LinkURL   *string
	ReadAt    *time.Time
	CreatedAt time.Time
}

type NotificationRepository struct {
	pool *pgxpool.Pool
}

func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{pool: pool}
}

func (r *NotificationRepository) Create(ctx context.Context, n *Notification) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO "Notification" ("id","userId","type","title","body","linkUrl","createdAt")
		 VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
		n.ID, n.UserID, n.Type, n.Title, n.Body, n.LinkURL,
	)
	return err
}

func (r *NotificationRepository) ListByUser(ctx context.Context, userID string, limit, offset int32) ([]Notification, int64, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT "id","userId","type","title","body","linkUrl","readAt","createdAt",
		        COUNT(*) OVER() AS total
		 FROM "Notification"
		 WHERE "userId" = $1
		 ORDER BY "createdAt" DESC
		 LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notifs []Notification
	var total int64
	for rows.Next() {
		var n Notification
		if err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body,
			&n.LinkURL, &n.ReadAt, &n.CreatedAt, &total,
		); err != nil {
			return nil, 0, err
		}
		notifs = append(notifs, n)
	}
	return notifs, total, rows.Err()
}

func (r *NotificationRepository) CountUnread(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM "Notification" WHERE "userId" = $1 AND "readAt" IS NULL`,
		userID).Scan(&count)
	return count, err
}

// MarkRead ne marque que si la notification appartient bien à l'utilisateur :
// l'ownership est porté par la clause WHERE, pas par un contrôle applicatif.
// Renvoie le nombre de lignes touchées (0 = introuvable ou appartient à autrui).
func (r *NotificationRepository) MarkRead(ctx context.Context, id, userID string) (int64, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE "Notification" SET "readAt" = NOW()
		 WHERE id = $1 AND "userId" = $2 AND "readAt" IS NULL`,
		id, userID)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *NotificationRepository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE "Notification" SET "readAt" = NOW()
		 WHERE "userId" = $1 AND "readAt" IS NULL`,
		userID)
	return err
}

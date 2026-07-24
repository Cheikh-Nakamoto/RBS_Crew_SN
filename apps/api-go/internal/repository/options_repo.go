package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// OptionsRepository backs the lightweight `{id, name}` lists used to populate
// admin form selects, so a form no longer pulls full entities with their
// translations just to render a dropdown.
type OptionsRepository struct {
	pool *pgxpool.Pool
}

func NewOptionsRepository(pool *pgxpool.Pool) *OptionsRepository {
	return &OptionsRepository{pool: pool}
}

type Option struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Taken flags an artist profile already linked to an account. Always false
	// for categories and tags.
	Taken bool `json:"taken,omitempty"`
}

func (r *OptionsRepository) scanOptions(ctx context.Context, sql string) ([]Option, error) {
	rows, err := r.pool.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	options := make([]Option, 0)
	for rows.Next() {
		var o Option
		if err := rows.Scan(&o.ID, &o.Name, &o.Taken); err != nil {
			return nil, err
		}
		options = append(options, o)
	}
	return options, rows.Err()
}

// Categories returns every category as {id, name}, French label preferred.
func (r *OptionsRepository) Categories(ctx context.Context) ([]Option, error) {
	return r.scanOptions(ctx,
		`SELECT c.id,
		        COALESCE(fr.name, any_t.name, c.slug) AS name,
		        false
		 FROM "Category" c
		 LEFT JOIN "CategoryTranslation" fr ON fr."categoryId" = c.id AND fr.locale = 'fr'::"Locale"
		 LEFT JOIN LATERAL (
		   SELECT name FROM "CategoryTranslation" t WHERE t."categoryId" = c.id LIMIT 1
		 ) any_t ON true
		 ORDER BY name ASC`)
}

// Tags returns every tag as {id, name}, French label preferred.
func (r *OptionsRepository) Tags(ctx context.Context) ([]Option, error) {
	return r.scanOptions(ctx,
		`SELECT t.id,
		        COALESCE(fr.name, any_t.name, t.slug) AS name,
		        false
		 FROM "Tag" t
		 LEFT JOIN "TagTranslation" fr ON fr."tagId" = t.id AND fr.locale = 'fr'::"Locale"
		 LEFT JOIN LATERAL (
		   SELECT name FROM "TagTranslation" x WHERE x."tagId" = t.id LIMIT 1
		 ) any_t ON true
		 ORDER BY name ASC`)
}

// Artists returns every artist profile as {id, name, taken} — `taken` marks the
// profiles already claimed by a user account.
func (r *OptionsRepository) Artists(ctx context.Context) ([]Option, error) {
	return r.scanOptions(ctx,
		`SELECT a.id,
		        COALESCE(fr.name, any_t.name, a.slug) AS name,
		        (a."userId" IS NOT NULL) AS taken
		 FROM "Artist" a
		 LEFT JOIN "ArtistTranslation" fr ON fr."artistId" = a.id AND fr.locale = 'fr'::"Locale"
		 LEFT JOIN LATERAL (
		   SELECT name FROM "ArtistTranslation" t WHERE t."artistId" = a.id LIMIT 1
		 ) any_t ON true
		 ORDER BY name ASC`)
}

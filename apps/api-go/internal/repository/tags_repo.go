package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TagsRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewTagsRepository(pool *pgxpool.Pool) *TagsRepository {
	return &TagsRepository{q: db.New(pool), pool: pool}
}

func (r *TagsRepository) List(ctx context.Context, limit, offset int32) ([]db.ListTagsRow, error) {
	return r.q.ListTags(ctx, db.ListTagsParams{Limit: limit, Offset: offset})
}

func (r *TagsRepository) GetByID(ctx context.Context, id string) (*db.Tag, error) {
	t, err := r.q.GetTagByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TagsRepository) GetBySlug(ctx context.Context, slug string) (*db.Tag, error) {
	t, err := r.q.GetTagBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TagsRepository) GetTranslations(ctx context.Context, id, locale string) ([]db.TagTranslation, error) {
	return r.q.GetTagTranslations(ctx, db.GetTagTranslationsParams{TagId: id, Locale: db.Locale(locale)})
}

func (r *TagsRepository) GetAllTranslations(ctx context.Context, id string) ([]db.TagTranslation, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, "tagId", locale, name FROM "TagTranslation" WHERE "tagId" = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []db.TagTranslation
	for rows.Next() {
		var t db.TagTranslation
		if err := rows.Scan(&t.ID, &t.TagId, &t.Locale, &t.Name); err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

func (r *TagsRepository) Create(ctx context.Context, params db.CreateTagParams) (*db.Tag, error) {
	t, err := r.q.CreateTag(ctx, params)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TagsRepository) Update(ctx context.Context, params db.UpdateTagParams) (*db.Tag, error) {
	t, err := r.q.UpdateTag(ctx, params)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TagsRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteTag(ctx, id)
}

func (r *TagsRepository) UpsertTranslation(ctx context.Context, params db.UpsertTagTranslationParams) error {
	_, err := r.q.UpsertTagTranslation(ctx, params)
	return err
}

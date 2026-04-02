package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoriesRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewCategoriesRepository(pool *pgxpool.Pool) *CategoriesRepository {
	return &CategoriesRepository{q: db.New(pool), pool: pool}
}

func (r *CategoriesRepository) List(ctx context.Context, limit, offset int32) ([]db.ListCategoriesRow, error) {
	return r.q.ListCategories(ctx, db.ListCategoriesParams{Limit: limit, Offset: offset})
}

func (r *CategoriesRepository) GetBySlug(ctx context.Context, slug string) (*db.Category, error) {
	c, err := r.q.GetCategoryBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CategoriesRepository) GetByID(ctx context.Context, id string) (*db.Category, error) {
	c, err := r.q.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CategoriesRepository) GetTranslations(ctx context.Context, id, locale string) ([]db.CategoryTranslation, error) {
	return r.q.GetCategoryTranslations(ctx, db.GetCategoryTranslationsParams{CategoryId: id, Locale: db.Locale(locale)})
}

func (r *CategoriesRepository) GetChildren(ctx context.Context, parentID string) ([]db.Category, error) {
	return r.q.GetChildCategories(ctx, &parentID)
}

func (r *CategoriesRepository) Create(ctx context.Context, params db.CreateCategoryParams) (*db.Category, error) {
	c, err := r.q.CreateCategory(ctx, params)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CategoriesRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteCategory(ctx, id)
}

func (r *CategoriesRepository) UpsertTranslation(ctx context.Context, params db.UpsertCategoryTranslationParams) error {
	_, err := r.q.UpsertCategoryTranslation(ctx, params)
	return err
}

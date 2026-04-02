package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductsRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewProductsRepository(pool *pgxpool.Pool) *ProductsRepository {
	return &ProductsRepository{q: db.New(pool), pool: pool}
}

func (r *ProductsRepository) List(ctx context.Context, params db.ListProductsParams) ([]db.ListProductsRow, error) {
	return r.q.ListProducts(ctx, params)
}

func (r *ProductsRepository) GetBySlug(ctx context.Context, slug, locale string) (*db.Product, error) {
	p, err := r.q.GetProductBySlug(ctx, db.GetProductBySlugParams{Slug: slug, Locale: db.Locale(locale)})
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductsRepository) GetByID(ctx context.Context, id string) (*db.Product, error) {
	p, err := r.q.GetProductByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductsRepository) GetTranslations(ctx context.Context, id string) ([]db.ProductTranslation, error) {
	return r.q.GetProductTranslations(ctx, id)
}

func (r *ProductsRepository) GetImages(ctx context.Context, id string) ([]db.ProductImage, error) {
	return r.q.GetProductImages(ctx, id)
}

func (r *ProductsRepository) GetCategories(ctx context.Context, id, locale string) ([]db.GetProductCategoriesRow, error) {
	return r.q.GetProductCategories(ctx, db.GetProductCategoriesParams{ProductId: id, Locale: db.Locale(locale)})
}

func (r *ProductsRepository) GetTags(ctx context.Context, id, locale string) ([]db.GetProductTagsRow, error) {
	return r.q.GetProductTags(ctx, db.GetProductTagsParams{ProductId: id, Locale: db.Locale(locale)})
}

func (r *ProductsRepository) GetVariants(ctx context.Context, id string) ([]db.ProductVariant, error) {
	return r.q.GetProductVariants(ctx, id)
}

func (r *ProductsRepository) Create(ctx context.Context, params db.CreateProductParams) (*db.Product, error) {
	p, err := r.q.CreateProduct(ctx, params)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductsRepository) UpsertTranslation(ctx context.Context, params db.UpsertProductTranslationParams) error {
	_, err := r.q.UpsertProductTranslation(ctx, params)
	return err
}

func (r *ProductsRepository) Delete(ctx context.Context, id string) error {
	return r.q.DeleteProduct(ctx, id)
}

// DecrementStock atomically decrements stock only if sufficient. Returns rows affected.
func (r *ProductsRepository) DecrementStock(ctx context.Context, id string, qty int32) (int64, error) {
	return r.q.DecrementStock(ctx, db.DecrementStockParams{ID: id, Stock: qty})
}

func (r *ProductsRepository) GetForOrder(ctx context.Context, id string) (*db.GetProductForOrderRow, error) {
	row, err := r.q.GetProductForOrder(ctx, id)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *ProductsRepository) CreateVariant(ctx context.Context, params db.CreateProductVariantParams) (*db.ProductVariant, error) {
	v, err := r.q.CreateProductVariant(ctx, params)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// ── Response types matching packages/types/src/index.ts ─────────────────────

type ProductTranslation struct {
	Locale           string  `json:"locale"`
	Name             string  `json:"name"`
	Slug             string  `json:"slug"`
	Description      *string `json:"description"`
	ShortDescription *string `json:"shortDescription"`
	MetaTitle        *string `json:"metaTitle"`
	MetaDescription  *string `json:"metaDescription"`
}

type ProductImage struct {
	ID       string `json:"id"`
	ImageURL string `json:"imageUrl"`
	Position int32  `json:"position"`
}

type ProductResponse struct {
	ID               string               `json:"id"`
	Slug             string               `json:"slug"`
	SKU              *string              `json:"sku"`
	Price            decimal.Decimal      `json:"price"`
	CompareAtPrice   *decimal.Decimal     `json:"compareAtPrice"`
	Stock            int32                `json:"stock"`
	Status           string               `json:"status"`
	FeaturedImageURL *string              `json:"featuredImageUrl"`
	Images           []ProductImage       `json:"images"`
	Translations     []ProductTranslation `json:"translations"`
	Categories       []CategorySummary    `json:"categories"`
	Tags             []TagSummary         `json:"tags"`
}

type TagSummary struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type ProductVariantResponse struct {
	ID    string          `json:"id"`
	SKU   *string         `json:"sku"`
	Price decimal.Decimal `json:"price"`
	Stock int32           `json:"stock"`
}

// ── Filters ──────────────────────────────────────────────────────────────────

type ProductFilter struct {
	Page         int
	Limit        int
	Status       *string
	Search       *string
	CategorySlug *string
	TagSlug      *string
	MinPrice     *decimal.Decimal
	MaxPrice     *decimal.Decimal
	Order        string
}

func (f ProductFilter) cacheKey(locale string) string {
	b, _ := json.Marshal(f)
	return fmt.Sprintf("products:%s:%x", locale, b)
}

// ── Service ──────────────────────────────────────────────────────────────────

type ProductsService struct {
	repo  *repository.ProductsRepository
	cache *redis.Client
}

func NewProductsService(repo *repository.ProductsRepository, cache *redis.Client) *ProductsService {
	return &ProductsService{repo: repo, cache: cache}
}

func (s *ProductsService) List(ctx context.Context, f ProductFilter) (*types.PaginatedResponse[ProductResponse], *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	key := f.cacheKey(locale)

	// Cache read
	if cached, err := s.cache.Get(ctx, key); err == nil {
		var result types.PaginatedResponse[ProductResponse]
		if json.Unmarshal([]byte(cached), &result) == nil {
			return &result, nil
		}
	}

	params := db.ListProductsParams{
		Limit:  int32(f.Limit),
		Offset: int32((f.Page - 1) * f.Limit),
		OrderBy: func() *string {
			if f.Order != "" {
				return &f.Order
			}
			return nil
		}(),
	}
	if f.MinPrice != nil {
		params.MinPrice = decimal.NullDecimal{Decimal: *f.MinPrice, Valid: true}
	}
	if f.MaxPrice != nil {
		params.MaxPrice = decimal.NullDecimal{Decimal: *f.MaxPrice, Valid: true}
	}
	if f.Status != nil {
		s2 := db.NullProductStatus{ProductStatus: db.ProductStatus(*f.Status), Valid: true}
		params.Status = s2
	}
	if f.Search != nil {
		params.Search = f.Search
	}
	if f.CategorySlug != nil {
		params.CategorySlug = f.CategorySlug
	}
	if f.TagSlug != nil {
		params.TagSlug = f.TagSlug
	}

	rows, err := s.repo.List(ctx, params)
	if err != nil {
		slog.Error("Failed to fetch products from DB", "error", err, "filter", f)
		return nil, types.InternalError("Failed to fetch products")
	}

	slog.Debug("Products fetched", "count", len(rows))

	var total int
	products := make([]ProductResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		pObj := db.Product{
			ID:               row.ID,
			Slug:             row.Slug,
			Sku:              row.Sku,
			Price:            row.Price,
			CompareAtPrice:   row.CompareAtPrice,
			Stock:            row.Stock,
			ManageStock:      row.ManageStock,
			Status:           row.Status,
			WcId:             row.WcId,
			CreatedAt:        row.CreatedAt,
			UpdatedAt:        row.UpdatedAt,
			FeaturedImageUrl: row.FeaturedImageUrl,
		}
		p, _ := s.assembleProduct(ctx, &pObj, locale)
		products = append(products, p)
	}

	result := types.Paginate(products, total, f.Page, f.Limit)
	if data, jerr := json.Marshal(result); jerr == nil {
		_ = s.cache.Set(ctx, key, string(data), 5*time.Minute)
	}
	return result, nil
}

func (s *ProductsService) GetBySlug(ctx context.Context, slug string) (*ProductResponse, *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	p, err := s.repo.GetBySlug(ctx, slug, locale)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Product not found")
		}
		return nil, types.InternalError("Database error")
	}
	res, _ := s.assembleProduct(ctx, p, locale)
	return &res, nil
}

func (s *ProductsService) GetVariants(ctx context.Context, id string) ([]ProductVariantResponse, *types.AppError) {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Product not found")
		}
		return nil, types.InternalError("Database error")
	}
	variants, err := s.repo.GetVariants(ctx, id)
	if err != nil {
		return nil, types.InternalError("Failed to fetch variants")
	}
	result := make([]ProductVariantResponse, 0, len(variants))
	for _, v := range variants {
		result = append(result, ProductVariantResponse{
			ID: v.ID, SKU: v.Sku, Price: v.Price, Stock: v.Stock,
		})
	}
	return result, nil
}

func (s *ProductsService) ClearCache(ctx context.Context) {
	_ = s.cache.DeletePattern(ctx, "products:*")
}

func (s *ProductsService) assembleProduct(ctx context.Context, p *db.Product, locale string) (ProductResponse, error) {
	translations, err := s.repo.GetTranslations(ctx, p.ID)
	if err != nil {
		slog.Warn("Failed to fetch product translations", "productId", p.ID, "error", err)
	}
	images, err := s.repo.GetImages(ctx, p.ID)
	if err != nil {
		slog.Warn("Failed to fetch product images", "productId", p.ID, "error", err)
	}
	categories, err := s.repo.GetCategories(ctx, p.ID, locale)
	if err != nil {
		slog.Warn("Failed to fetch product categories", "productId", p.ID, "error", err)
	}
	tags, err := s.repo.GetTags(ctx, p.ID, locale)
	if err != nil {
		slog.Warn("Failed to fetch product tags", "productId", p.ID, "error", err)
	}

	trans := make([]ProductTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, ProductTranslation{
			Locale: string(t.Locale), Name: t.Name, Slug: t.Slug,
			Description: t.Description, ShortDescription: t.ShortDescription,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	imgs := make([]ProductImage, 0, len(images))
	for _, img := range images {
		imgs = append(imgs, ProductImage{ID: img.ID, ImageURL: img.ImageUrl, Position: img.Position})
	}
	cats := make([]CategorySummary, 0, len(categories))
	for _, c := range categories {
		name := ""
		if c.Name != nil {
			name = *c.Name
		}
		cats = append(cats, CategorySummary{ID: c.ID, Slug: c.Slug, Name: name})
	}
	tgs := make([]TagSummary, 0, len(tags))
	for _, t := range tags {
		name := ""
		if t.Name != nil {
			name = *t.Name
		}
		tgs = append(tgs, TagSummary{ID: t.ID, Slug: t.Slug, Name: name})
	}

	// Convert NullDecimal → *decimal.Decimal for JSON response
	var cap *decimal.Decimal
	if p.CompareAtPrice.Valid {
		cap = &p.CompareAtPrice.Decimal
	}

	return ProductResponse{
		ID: p.ID, Slug: p.Slug, SKU: p.Sku,
		Price: p.Price, CompareAtPrice: cap,
		Stock: p.Stock, Status: string(p.Status),
		FeaturedImageURL: p.FeaturedImageUrl,
		Images: imgs, Translations: trans, Categories: cats, Tags: tgs,
	}, nil
}

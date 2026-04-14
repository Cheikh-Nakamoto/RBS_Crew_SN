package service

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// ── Service ──────────────────────────────────────────────────────────────────

type ProductsService struct {
	repo  *repository.ProductsRepository
	cache *redis.Client
}

func NewProductsService(repo *repository.ProductsRepository, cache *redis.Client) *ProductsService {
	return &ProductsService{repo: repo, cache: cache}
}

func (s *ProductsService) List(ctx context.Context, f model.ProductFilter) (*types.PaginatedResponse[model.ProductResponse], *types.AppError) {
	locale := types.LocaleFromCtx(ctx)
	key := f.CacheKey(locale)

	// Cache read
	if cached, err := s.cache.Get(ctx, key); err == nil {
		var result types.PaginatedResponse[model.ProductResponse]
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
	products := make([]model.ProductResponse, 0, len(rows))
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

func (s *ProductsService) GetBySlug(ctx context.Context, slug string) (*model.ProductResponse, *types.AppError) {
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

func (s *ProductsService) GetVariants(ctx context.Context, id string) ([]model.ProductVariantResponse, *types.AppError) {
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
	result := make([]model.ProductVariantResponse, 0, len(variants))
	for _, v := range variants {
		result = append(result, model.ProductVariantResponse{
			ID: v.ID, SKU: v.Sku, Price: v.Price, Stock: v.Stock,
		})
	}
	return result, nil
}

func (s *ProductsService) ClearCache(ctx context.Context) {
	_ = s.cache.DeletePattern(ctx, "products:*")
}

// ── Admin methods ─────────────────────────────────────────────────────────────

func (s *ProductsService) toAdminProductResponse(ctx context.Context, p *db.Product) model.AdminProductResponse {
	translations, _ := s.repo.GetTranslations(ctx, p.ID)
	images, _ := s.repo.GetImages(ctx, p.ID)
	categories, _ := s.repo.GetCategories(ctx, p.ID, "fr")
	tags, _ := s.repo.GetTags(ctx, p.ID, "fr")
	variants, _ := s.repo.GetVariants(ctx, p.ID)

	trans := make([]model.ProductTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.ProductTranslation{
			Locale: string(t.Locale), Name: t.Name, Slug: t.Slug,
			Description: t.Description, ShortDescription: t.ShortDescription,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	imgs := make([]model.ProductImage, 0, len(images))
	gallery := make([]string, 0, len(images))
	for _, img := range images {
		imgs = append(imgs, model.ProductImage{ID: img.ID, ImageURL: img.ImageUrl, Position: img.Position})
		gallery = append(gallery, img.ImageUrl)
	}
	cats := make([]model.CategorySummary, 0, len(categories))
	for _, c := range categories {
		name := ""
		if c.Name != nil {
			name = *c.Name
		}
		cats = append(cats, model.CategorySummary{ID: c.ID, Slug: c.Slug, Name: name})
	}
	tgs := make([]model.TagSummary, 0, len(tags))
	for _, t := range tags {
		name := ""
		if t.Name != nil {
			name = *t.Name
		}
		tgs = append(tgs, model.TagSummary{ID: t.ID, Slug: t.Slug, Name: name})
	}
	vs := make([]model.ProductVariantResponse, 0, len(variants))
	for _, v := range variants {
		vs = append(vs, model.ProductVariantResponse{ID: v.ID, SKU: v.Sku, Price: v.Price, Stock: v.Stock})
	}
	var cap *decimal.Decimal
	if p.CompareAtPrice.Valid {
		cap = &p.CompareAtPrice.Decimal
	}
	return model.AdminProductResponse{
		ID: p.ID, SKU: p.Sku, Price: p.Price, CompareAtPrice: cap,
		Stock: p.Stock, Status: string(p.Status), FeaturedImageURL: p.FeaturedImageUrl,
		Gallery: gallery, Images: imgs, Translations: trans, Categories: cats, Tags: tgs, Variants: vs,
		CreatedAt: p.CreatedAt.Time, UpdatedAt: p.UpdatedAt.Time,
	}
}

func (s *ProductsService) AdminList(ctx context.Context, page, limit int, search *string) (*types.PaginatedResponse[model.AdminProductResponse], *types.AppError) {
	params := db.ListProductsParams{
		Limit:  int32(limit),
		Offset: int32((page - 1) * limit),
	}
	if search != nil && *search != "" {
		params.Search = search
	}
	rows, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, types.InternalError("Failed to fetch products")
	}
	var total int
	results := make([]model.AdminProductResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		pObj := db.Product{
			ID: row.ID, Slug: row.Slug, Sku: row.Sku, Price: row.Price,
			CompareAtPrice: row.CompareAtPrice, Stock: row.Stock,
			Status: row.Status, FeaturedImageUrl: row.FeaturedImageUrl,
			CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
		}
		results = append(results, s.toAdminProductResponse(ctx, &pObj))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *ProductsService) AdminGetByID(ctx context.Context, id string) (*model.AdminProductResponse, *types.AppError) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Product not found")
		}
		return nil, types.InternalError("Database error")
	}
	res := s.toAdminProductResponse(ctx, p)
	return &res, nil
}

func (s *ProductsService) AdminCreate(ctx context.Context, input model.AdminProductInput) (*model.AdminProductResponse, *types.AppError) {
	if len(input.Translations) == 0 {
		return nil, types.BadRequest("At least one translation is required")
	}
	slug := input.Translations[0].Slug
	if slug == "" {
		return nil, types.BadRequest("Slug is required")
	}
	status := db.ProductStatusDRAFT
	if input.Status != "" {
		status = db.ProductStatus(input.Status)
	}
	price := decimal.NewFromFloat(input.Price)
	var cap decimal.NullDecimal
	if input.CompareAtPrice != nil {
		cap = decimal.NullDecimal{Decimal: decimal.NewFromFloat(*input.CompareAtPrice), Valid: true}
	}
	p, err := s.repo.Create(ctx, db.CreateProductParams{
		ID: uuid.New().String(), Slug: slug, Sku: input.SKU,
		Price: price, CompareAtPrice: cap, Stock: input.Stock,
		Status: status, FeaturedImageUrl: input.FeaturedImageURL,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create product")
	}
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertProductTranslationParams{
			ID: uuid.New().String(), ProductId: p.ID, Locale: db.Locale(t.Locale),
			Name: t.Title, Slug: t.Slug, Description: t.Description,
			ShortDescription: t.ShortDescription, MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	for _, cid := range input.CategoryIDs {
		_ = s.repo.AddCategory(ctx, p.ID, cid)
	}
	for _, tid := range input.TagIDs {
		_ = s.repo.AddTag(ctx, p.ID, tid)
	}
	for i, url := range input.Gallery {
		_ = s.repo.AddImage(ctx, db.AddProductImageParams{
			ID:        uuid.New().String(),
			ProductId: p.ID,
			ImageUrl:  url,
			Position:  int32(i),
		})
	}
	s.ClearCache(ctx)
	res := s.toAdminProductResponse(ctx, p)
	return &res, nil
}

func (s *ProductsService) AdminUpdate(ctx context.Context, id string, input model.AdminProductInput) (*model.AdminProductResponse, *types.AppError) {
	price := decimal.NullDecimal{Decimal: decimal.NewFromFloat(input.Price), Valid: true}
	var cap decimal.NullDecimal
	if input.CompareAtPrice != nil {
		cap = decimal.NullDecimal{Decimal: decimal.NewFromFloat(*input.CompareAtPrice), Valid: true}
	}
	stock := input.Stock
	status := db.NullProductStatus{Valid: true, ProductStatus: db.ProductStatus(input.Status)}
	p, err := s.repo.Update(ctx, db.UpdateProductParams{
		ID: id, Sku: input.SKU, Price: price, CompareAtPrice: cap,
		Stock: &stock, Status: status, FeaturedImageUrl: input.FeaturedImageURL,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Product not found")
		}
		return nil, types.InternalError("Failed to update product")
	}
	_ = s.repo.DeleteTranslations(ctx, id)
	for _, t := range input.Translations {
		_ = s.repo.UpsertTranslation(ctx, db.UpsertProductTranslationParams{
			ID: uuid.New().String(), ProductId: id, Locale: db.Locale(t.Locale),
			Name: t.Title, Slug: t.Slug, Description: t.Description,
			ShortDescription: t.ShortDescription, MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	_ = s.repo.ClearCategories(ctx, id)
	for _, cid := range input.CategoryIDs {
		_ = s.repo.AddCategory(ctx, id, cid)
	}
	_ = s.repo.ClearTags(ctx, id)
	for _, tid := range input.TagIDs {
		_ = s.repo.AddTag(ctx, id, tid)
	}
	_ = s.repo.ClearImages(ctx, id)
	for i, url := range input.Gallery {
		_ = s.repo.AddImage(ctx, db.AddProductImageParams{
			ID:        uuid.New().String(),
			ProductId: id,
			ImageUrl:  url,
			Position:  int32(i),
		})
	}
	s.ClearCache(ctx)
	res := s.toAdminProductResponse(ctx, p)
	return &res, nil
}

func (s *ProductsService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.repo.Delete(ctx, id); err != nil {
		return types.InternalError("Failed to delete product")
	}
	s.ClearCache(ctx)
	return nil
}

func (s *ProductsService) assembleProduct(ctx context.Context, p *db.Product, locale string) (model.ProductResponse, error) {
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

	trans := make([]model.ProductTranslation, 0, len(translations))
	for _, t := range translations {
		trans = append(trans, model.ProductTranslation{
			Locale: string(t.Locale), Name: t.Name, Slug: t.Slug,
			Description: t.Description, ShortDescription: t.ShortDescription,
			MetaTitle: t.MetaTitle, MetaDescription: t.MetaDescription,
		})
	}
	imgs := make([]model.ProductImage, 0, len(images))
	for _, img := range images {
		imgs = append(imgs, model.ProductImage{ID: img.ID, ImageURL: img.ImageUrl, Position: img.Position})
	}
	cats := make([]model.CategorySummary, 0, len(categories))
	for _, c := range categories {
		name := ""
		if c.Name != nil {
			name = *c.Name
		}
		cats = append(cats, model.CategorySummary{ID: c.ID, Slug: c.Slug, Name: name})
	}
	tgs := make([]model.TagSummary, 0, len(tags))
	for _, t := range tags {
		name := ""
		if t.Name != nil {
			name = *t.Name
		}
		tgs = append(tgs, model.TagSummary{ID: t.ID, Slug: t.Slug, Name: name})
	}

	// Convert NullDecimal → *decimal.Decimal for JSON response
	var cap *decimal.Decimal
	if p.CompareAtPrice.Valid {
		cap = &p.CompareAtPrice.Decimal
	}

	return model.ProductResponse{
		ID: p.ID, Slug: p.Slug, SKU: p.Sku,
		Price: p.Price, CompareAtPrice: cap,
		Stock: p.Stock, Status: string(p.Status),
		FeaturedImageURL: p.FeaturedImageUrl,
		Images: imgs, Translations: trans, Categories: cats, Tags: tgs,
	}, nil
}

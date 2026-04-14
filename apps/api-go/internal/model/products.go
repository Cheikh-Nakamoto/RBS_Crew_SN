package model

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
)

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

func (f ProductFilter) CacheKey(locale string) string {
	b, _ := json.Marshal(f)
	return fmt.Sprintf("products:%s:%x", locale, b)
}

type AdminProductTranslationInput struct {
	Locale           string  `json:"locale"`
	Title            string  `json:"title"`
	Slug             string  `json:"slug"`
	Description      *string `json:"description"`
	ShortDescription *string `json:"shortDescription"`
	MetaTitle        *string `json:"metaTitle"`
	MetaDescription  *string `json:"metaDescription"`
}

type AdminProductVariantInput struct {
	ID             *string  `json:"id"`
	SKU            *string  `json:"sku"`
	Price          float64  `json:"price"`
	CompareAtPrice *float64 `json:"compareAtPrice"`
	Stock          int32    `json:"stock"`
}

type AdminProductInput struct {
	SKU              *string                        `json:"sku"`
	Price            float64                        `json:"price"`
	CompareAtPrice   *float64                       `json:"compareAtPrice"`
	Stock            int32                          `json:"stock"`
	Status           string                         `json:"status"`
	FeaturedImageURL *string                        `json:"featuredImageUrl"`
	Gallery          []string                       `json:"gallery"`
	CategoryIDs      []string                       `json:"categoryIds"`
	TagIDs           []string                       `json:"tagIds"`
	Translations     []AdminProductTranslationInput `json:"translations"`
	Variants         []AdminProductVariantInput     `json:"variants"`
}

type AdminProductResponse struct {
	ID               string                   `json:"id"`
	SKU              *string                  `json:"sku"`
	Price            decimal.Decimal          `json:"price"`
	CompareAtPrice   *decimal.Decimal         `json:"compareAtPrice"`
	Stock            int32                    `json:"stock"`
	Status           string                   `json:"status"`
	FeaturedImageURL *string                  `json:"featuredImageUrl"`
	Gallery          []string                 `json:"gallery"`
	Images           []ProductImage           `json:"images"`
	Translations     []ProductTranslation     `json:"translations"`
	Categories       []CategorySummary        `json:"categories"`
	Tags             []TagSummary             `json:"tags"`
	Variants         []ProductVariantResponse `json:"variants"`
	CreatedAt        time.Time                `json:"createdAt"`
	UpdatedAt        time.Time                `json:"updatedAt"`
}

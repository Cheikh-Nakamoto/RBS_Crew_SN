package model

import "time"

type PageTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	Content         string  `json:"content"`
	Excerpt         *string `json:"excerpt"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type PageResponse struct {
	ID           string            `json:"id"`
	Slug         string            `json:"slug"`
	Template     *string           `json:"template"`
	Status       string            `json:"status"`
	MenuOrder    int32             `json:"menuOrder"`
	Translations []PageTranslation `json:"translations"`
	CreatedAt    time.Time         `json:"createdAt"`
}

type AdminPageTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	Content         *string `json:"content"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type AdminPageResponse struct {
	ID           string                 `json:"id"`
	IsPublished  bool                   `json:"isPublished"`
	Translations []AdminPageTranslation `json:"translations"`
	CreatedAt    time.Time              `json:"createdAt"`
}

type AdminPageInput struct {
	IsPublished  bool `json:"isPublished"`
	Translations []struct {
		Locale          string  `json:"locale"`
		Title           string  `json:"title"`
		Slug            string  `json:"slug"`
		Content         *string `json:"content"`
		MetaTitle       *string `json:"metaTitle"`
		MetaDescription *string `json:"metaDescription"`
	} `json:"translations"`
}

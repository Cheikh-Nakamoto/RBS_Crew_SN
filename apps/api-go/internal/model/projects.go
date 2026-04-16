package model

import "time"

type ProjectTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Summary         *string `json:"summary"`
	Content         *string `json:"content"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type ProjectResponse struct {
	ID               string               `json:"id"`
	Slug             string               `json:"slug"`
	FeaturedImageURL *string              `json:"featuredImageUrl"`
	Gallery          []string             `json:"gallery"`
	CompletedAt      *time.Time           `json:"completedAt"`
	ClientName       *string              `json:"clientName"`
	Status           string               `json:"status"`
	Translations     []ProjectTranslation `json:"translations"`
	CreatedAt        time.Time            `json:"createdAt"`
}

type AdminProjectTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	Description     *string `json:"description"`
	Content         *string `json:"content"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type AdminProjectResponse struct {
	ID               string                    `json:"id"`
	Slug             string                    `json:"slug"`
	FeaturedImageURL *string                   `json:"featuredImageUrl"`
	Gallery          []string                  `json:"gallery"`
	IsPublished      bool                      `json:"isPublished"`
	Translations     []AdminProjectTranslation `json:"translations"`
	CreatedAt        time.Time                 `json:"createdAt"`
}

type AdminProjectInput struct {
	FeaturedImageURL *string  `json:"featuredImageUrl"`
	Gallery          []string `json:"gallery"`
	IsPublished      bool     `json:"isPublished"`
	Translations     []struct {
		Locale          string  `json:"locale"`
		Title           string  `json:"title"`
		Slug            string  `json:"slug"`
		Description     *string `json:"description"`
		Content         *string `json:"content"`
		MetaTitle       *string `json:"metaTitle"`
		MetaDescription *string `json:"metaDescription"`
	} `json:"translations"`
}

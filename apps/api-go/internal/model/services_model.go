package model

import "time"

type ServiceTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Description     string  `json:"description"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type ServiceItem struct {
	ID           string               `json:"id"`
	Slug         string               `json:"slug"`
	Icon         *string              `json:"icon"`
	Status       string               `json:"status"`
	MenuOrder    int32                `json:"menuOrder"`
	Translations []ServiceTranslation `json:"translations"`
	CreatedAt    time.Time            `json:"createdAt"`
}

type AdminServiceTranslation struct {
	Locale          string  `json:"locale"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	Description     *string `json:"description"`
	MetaTitle       *string `json:"metaTitle"`
	MetaDescription *string `json:"metaDescription"`
}

type AdminServiceResponse struct {
	ID               string                    `json:"id"`
	FeaturedImageURL *string                   `json:"featuredImageUrl"`
	IsPublished      bool                      `json:"isPublished"`
	Translations     []AdminServiceTranslation `json:"translations"`
	CreatedAt        time.Time                 `json:"createdAt"`
}

type AdminServiceInput struct {
	FeaturedImageURL *string `json:"featuredImageUrl"`
	IsPublished      bool    `json:"isPublished"`
	Translations     []struct {
		Locale          string  `json:"locale"`
		Title           string  `json:"title"`
		Slug            string  `json:"slug"`
		Description     *string `json:"description"`
		MetaTitle       *string `json:"metaTitle"`
		MetaDescription *string `json:"metaDescription"`
	} `json:"translations"`
}

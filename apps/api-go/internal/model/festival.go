package model

import "time"

type FestivalTranslation struct {
	Locale    string  `json:"locale"`
	ThemeName string  `json:"themeName"`
	Summary   *string `json:"summary"`
	Content   *string `json:"content"`
}

type FestivalResponse struct {
	ID            string                `json:"id"`
	Slug          string                `json:"slug"`
	EditionNumber int32                 `json:"editionNumber"`
	Year          int32                 `json:"year"`
	City          *string               `json:"city"`
	Country       string                `json:"country"`
	Status        string                `json:"status"`
	MainImage     *string               `json:"mainImage"`
	HeroImage     *string               `json:"heroImage"`
	Gallery       []string              `json:"gallery"`
	Typography    []string              `json:"typography"`
	Translations  []FestivalTranslation `json:"translations"`
	CreatedAt     time.Time             `json:"createdAt"`
}

type AdminFestivalTranslation struct {
	Locale    string  `json:"locale"`
	Title     string  `json:"title"`
	Slug      string  `json:"slug"`
	ThemeName *string `json:"themeName,omitempty"`
	Summary   *string `json:"description"`
	Content   *string `json:"content"`
}

type AdminFestivalResponse struct {
	ID               string                     `json:"id"`
	Slug             string                     `json:"slug"`
	EditionNumber    int32                      `json:"editionNumber"`
	Year             int32                      `json:"year"`
	City             *string                    `json:"city"`
	Country          string                     `json:"country"`
	IsPublished      bool                       `json:"isPublished"`
	FeaturedImageUrl *string                    `json:"featuredImageUrl"`
	HeroImage        *string                    `json:"heroImage"`
	Gallery          []string                   `json:"gallery"`
	Translations     []AdminFestivalTranslation `json:"translations"`
	CreatedAt        time.Time                  `json:"createdAt"`
}

type AdminFestivalInput struct {
	IsPublished   bool     `json:"isPublished"`
	EditionNumber int32    `json:"editionNumber"`
	Year          int32    `json:"year"`
	City          *string  `json:"city"`
	Country       *string  `json:"country"`
	MainImage     *string  `json:"featuredImageUrl"`
	HeroImage     *string  `json:"heroImage"`
	Gallery       []string `json:"gallery"`
	Translations  []struct {
		Locale      string  `json:"locale"`
		Title       string  `json:"title"`
		Slug        string  `json:"slug"`
		Description *string `json:"description"`
		Content     *string `json:"content"`
	} `json:"translations"`
}

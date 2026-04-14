package model

import "time"

type PressResponse struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Source           string     `json:"source"`
	SourceURL        string     `json:"sourceUrl"`
	LogoURL          *string    `json:"logoUrl"`
	FeaturedImageURL *string    `json:"featuredImageUrl"`
	Excerpt          *string    `json:"excerpt"`
	Date             *time.Time `json:"date"`
	CreatedAt        time.Time  `json:"createdAt"`
}

type AdminPressInput struct {
	Title            string  `json:"title"`
	Source           string  `json:"source"`
	SourceURL        string  `json:"sourceUrl"`
	LogoURL          *string `json:"logoUrl"`
	FeaturedImageURL *string `json:"featuredImageUrl"`
	Excerpt          *string `json:"excerpt"`
	PublishedAt      *string `json:"publishedAt"`
}

package model

import "time"

type ArtistTranslation struct {
	Locale string  `json:"locale"`
	Name   string  `json:"name"`
	Bio    *string `json:"bio"`
}

type ArtistArtwork struct {
	ID       string `json:"id"`
	ImageURL string `json:"imageUrl"`
	Position int32  `json:"position"`
}

type ArtistResponse struct {
	ID               string              `json:"id"`
	Slug             string              `json:"slug"`
	City             *string             `json:"city"`
	Country          *string             `json:"country"`
	FeaturedImageURL *string             `json:"featuredImageUrl"`
	AvatarURL        *string             `json:"avatarUrl"`
	InstagramURL     *string             `json:"instagramUrl"`
	Status           string              `json:"status"`
	Translations     []ArtistTranslation `json:"translations"`
	Artworks         []ArtistArtwork     `json:"artworks"`
	CreatedAt        time.Time           `json:"createdAt"`
}

type AdminArtistTranslation struct {
	Locale      string  `json:"locale"`
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	Description *string `json:"description"`
}

type AdminArtistResponse struct {
	ID               string                   `json:"id"`
	Slug             string                   `json:"slug"`
	AvatarURL        *string                  `json:"avatarUrl"`
	FeaturedImageURL *string                  `json:"featuredImageUrl"`
	Gallery          []string                 `json:"gallery"`
	IsPublished      bool                     `json:"isPublished"`
	Translations     []AdminArtistTranslation `json:"translations"`
	CreatedAt        time.Time                `json:"createdAt"`
}

type AdminArtistInput struct {
	FeaturedImageURL *string  `json:"featuredImageUrl"`
	Gallery          []string `json:"gallery"`
	IsPublished      bool     `json:"isPublished"`
	Translations     []struct {
		Locale      string  `json:"locale"`
		Title       string  `json:"title"`
		Slug        string  `json:"slug"`
		Description *string `json:"description"`
	} `json:"translations"`
}

package model

import "time"

type TagTranslationResponse struct {
	Locale string `json:"locale"`
	Name   string `json:"name"`
}

type TagResponse struct {
	ID           string                   `json:"id"`
	Slug         string                   `json:"slug"`
	Translations []TagTranslationResponse `json:"translations"`
	CreatedAt    time.Time                `json:"createdAt"`
}

type AdminTagTranslation struct {
	Locale string `json:"locale"`
	Title  string `json:"title"`
	Slug   string `json:"slug"`
}

type AdminTagResponse struct {
	ID           string                `json:"id"`
	Slug         string                `json:"slug"`
	Translations []AdminTagTranslation `json:"translations"`
	CreatedAt    time.Time             `json:"createdAt"`
}

type AdminTagInput struct {
	Translations []struct {
		Locale string `json:"locale"`
		Title  string `json:"title"`
		Slug   string `json:"slug"`
	} `json:"translations"`
}

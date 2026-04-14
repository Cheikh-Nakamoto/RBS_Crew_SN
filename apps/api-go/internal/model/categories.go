package model

import "time"

type CategoryTranslation struct {
	Locale      string  `json:"locale"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type CategorySummary struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type CategoryResponse struct {
	ID           string                `json:"id"`
	Slug         string                `json:"slug"`
	ParentID     *string               `json:"parentId"`
	Translations []CategoryTranslation `json:"translations"`
	Children     []CategorySummary     `json:"children"`
	CreatedAt    time.Time             `json:"createdAt"`
}

type AdminCategoryTranslation struct {
	Locale      string  `json:"locale"`
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	Description *string `json:"description"`
}

type AdminCategoryResponse struct {
	ID           string                     `json:"id"`
	Slug         string                     `json:"slug"`
	ParentID     *string                    `json:"parentId"`
	Translations []AdminCategoryTranslation `json:"translations"`
	CreatedAt    time.Time                  `json:"createdAt"`
}

type AdminCategoryInput struct {
	ParentID     *string `json:"parentId"`
	Translations []struct {
		Locale      string  `json:"locale"`
		Title       string  `json:"title"`
		Slug        string  `json:"slug"`
		Description *string `json:"description"`
	} `json:"translations"`
}

package model

// CartItem represents a single item in the user's cart.
type CartItem struct {
	ProductID string  `json:"productId"`
	Slug      string  `json:"slug"`
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	Quantity  int     `json:"quantity"`
	Image     string  `json:"image,omitempty"`
	MaxStock  int     `json:"maxStock"`
}

// CartResponse is the payload returned by all cart endpoints.
type CartResponse struct {
	Items []CartItem `json:"items"`
	Total float64    `json:"total"`
	Count int        `json:"count"`
}

// UpsertCartItemDTO is the payload for POST /cart/items.
type UpsertCartItemDTO struct {
	ProductID string  `json:"productId" validate:"required"`
	Slug      string  `json:"slug"      validate:"required"`
	Name      string  `json:"name"      validate:"required"`
	Price     float64 `json:"price"     validate:"required,gt=0"`
	Quantity  int     `json:"quantity"  validate:"required,min=1"`
	Image     string  `json:"image,omitempty"`
	MaxStock  int     `json:"maxStock"  validate:"required,min=1"`
}

// UpdateQuantityDTO is the payload for PATCH /cart/items/{productId}.
type UpdateQuantityDTO struct {
	Quantity int `json:"quantity" validate:"min=0"`
}

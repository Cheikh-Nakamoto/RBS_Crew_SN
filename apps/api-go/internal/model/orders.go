package model

import (
	"time"

	"github.com/shopspring/decimal"
)

type CreateOrderItemDTO struct {
	ProductID string  `json:"productId" validate:"required,uuid"`
	VariantID *string `json:"variantId"`
	Quantity  int     `json:"quantity"  validate:"required,min=1"`
}

type CreateOrderDTO struct {
	Items             []CreateOrderItemDTO `json:"items"      validate:"required,min=1,dive"`
	GuestEmail        string               `json:"guestEmail"`
	ShippingAddressID *string              `json:"shippingAddressId"`
	BillingAddressID  *string              `json:"billingAddressId"`
	Notes             *string              `json:"notes"`
}

type OrderItemResponse struct {
	ID          string          `json:"id"`
	ProductID   string          `json:"productId"`
	ProductName string          `json:"productName"`
	ProductSKU  *string         `json:"productSku"`
	Quantity    int32           `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unitPrice"`
	TotalPrice  decimal.Decimal `json:"totalPrice"`
}

type OrderResponse struct {
	ID             string              `json:"id"`
	OrderNumber    string              `json:"orderNumber"`
	Status         string              `json:"status"`
	PaymentStatus  string              `json:"paymentStatus"`
	Currency       string              `json:"currency"`
	Subtotal       decimal.Decimal     `json:"subtotal"`
	TaxAmount      decimal.Decimal     `json:"taxAmount"`
	ShippingAmount decimal.Decimal     `json:"shippingAmount"`
	DiscountAmount decimal.Decimal     `json:"discountAmount"`
	Total          decimal.Decimal     `json:"total"`
	Items          []OrderItemResponse `json:"items"`
	CreatedAt      time.Time           `json:"createdAt"`
}

package model

import "time"

type CreateQuoteDTO struct {
	Name         string     `json:"name"      validate:"required"`
	Surname      *string    `json:"surname"`
	Email        string     `json:"email"     validate:"required,email"`
	Phone        *string    `json:"phone"`
	Company      *string    `json:"company"`
	OrderType    string     `json:"orderType" validate:"required"`
	Quantity     *int32     `json:"quantity"`
	DeliveryDate *time.Time `json:"deliveryDate"`
	Message      string     `json:"message"   validate:"required"`
}

type QuoteResponse struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Surname      *string    `json:"surname"`
	Email        string     `json:"email"`
	Phone        *string    `json:"phone"`
	Company      *string    `json:"company"`
	OrderType    string     `json:"orderType"`
	Quantity     *int32     `json:"quantity"`
	DeliveryDate *time.Time `json:"deliveryDate"`
	Message      string     `json:"message"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
}

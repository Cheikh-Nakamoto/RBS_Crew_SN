package model

type CreateCheckoutDTO struct {
	OrderID       string `json:"orderId" validate:"required"`
	PaymentMethod string `json:"paymentMethod" validate:"required,oneof=STRIPE PAYPAL WAVE ORANGE_MONEY"`
	SuccessURL    string `json:"successUrl" validate:"required,url"`
	CancelURL     string `json:"cancelUrl" validate:"required,url"`
}

type CheckoutResponse struct {
	URL           string `json:"url"`
	PaymentMethod string `json:"paymentMethod"`
	PaymentID     string `json:"paymentId,omitempty"`
}

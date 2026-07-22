package model

type CreateCheckoutDTO struct {
	OrderID       string `json:"orderId" validate:"required"`
	// Doit rester aligné sur les constantes de internal/payment/provider.go.
	// NABOO y manquait depuis l'intégration du provider : le checkout, qui
	// n'expose que ce moyen de paiement, était rejeté en 400 avant même
	// d'atteindre le service.
	PaymentMethod string `json:"paymentMethod" validate:"required,oneof=STRIPE PAYPAL WAVE ORANGE_MONEY NABOO"`
	SuccessURL    string `json:"successUrl" validate:"required,url"`
	CancelURL     string `json:"cancelUrl" validate:"required,url"`
}

type CheckoutResponse struct {
	URL           string `json:"url"`
	PaymentMethod string `json:"paymentMethod"`
	PaymentID     string `json:"paymentId,omitempty"`
}

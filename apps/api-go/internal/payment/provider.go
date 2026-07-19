package payment

import (
	"context"
	"errors"
	"net/http"
)

// ── Types ─────────────────────────────────────────────────────────────────────

// Method represents a supported payment provider.
type Method string

const (
	MethodStripe      Method = "STRIPE"
	MethodPayPal      Method = "PAYPAL"
	MethodWave        Method = "WAVE"
	MethodOrangeMoney Method = "ORANGE_MONEY"
	MethodNaboo       Method = "NABOO"	
)

// CallbackURLs are the URLs that the payment provider will redirect to after payment.
type CallbackURLs struct {
	SuccessURL string
	CancelURL  string
	WebhookURL string // Server-to-server notification URL
}

// OrderInfo contains the order data that providers need to create a payment.
type OrderInfo struct {
	ID                string
	OrderNumber       string
	Currency          string
	Items             []OrderItem
	Shipping          int64 // Amount in minor units (or whole units for XOF)
	Total             int64
	Email             string
	CustomerFirstName string
	CustomerLastName  string
	CustomerPhone     string // format E.164 attendu, ex. +221771234567
}

// OrderItem is a line item for the payment.
type OrderItem struct {
	Name     string
	Quantity int64
	Price    int64 // Unit price in minor units
}

// PaymentResult is returned after successfully initiating a payment.
type PaymentResult struct {
	RedirectURL string // URL to redirect the customer to
	ExternalID  string // Provider-specific payment/session ID
}

// WebhookEvent is the parsed result of a provider webhook callback.
type WebhookEvent struct {
	ExternalID string // Provider-specific payment/session ID
	OrderID    string // Our internal order ID (if available from provider metadata)
	Status     string // "PAID", "FAILED", "REFUNDED"
}

// ── Interface ─────────────────────────────────────────────────────────────────

// Provider is the common interface for all payment gateways.
type Provider interface {
	// Name returns the payment method identifier.
	Name() Method

	// CreatePayment initiates a payment session and returns a redirect URL.
	CreatePayment(ctx context.Context, order OrderInfo, callbacks CallbackURLs) (*PaymentResult, error)

	// VerifyWebhook validates an incoming webhook request and extracts the event.
	VerifyWebhook(ctx context.Context, payload []byte, headers http.Header) (*WebhookEvent, error)
}

// ── Refund port ───────────────────────────────────────────────────────────────

// ErrRefundNotSupported is returned by providers that don't support programmatic refunds.
// The caller should fall back to a manual refund workflow.
var ErrRefundNotSupported = errors.New("refund not supported by this provider")

// RefundInput carries the data needed to issue a refund.
type RefundInput struct {
	ExternalPaymentID string  // Provider payment intent/transaction ID
	Amount            float64 // Amount to refund (same units as payment)
	Currency          string
	IdempotencyKey    string // Provider-level idempotency key
	Reason            string
}

// RefundOutput is the result of a successful programmatic refund.
type RefundOutput struct {
	ProviderRefundID string // Provider-assigned refund ID
	Status           string // "succeeded", "pending", "failed"
}

// PaymentRefunder is an optional interface that providers implement when they
// support programmatic refunds. Providers that don't (e.g. Wave) should return
// ErrRefundNotSupported so the service can fall back to manual processing.
type PaymentRefunder interface {
	Refund(ctx context.Context, input RefundInput) (RefundOutput, error)
}

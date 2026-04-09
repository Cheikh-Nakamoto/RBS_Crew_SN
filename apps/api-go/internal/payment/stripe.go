package payment

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/webhook"
)

// StripeProvider implements Provider for Stripe payments.
type StripeProvider struct {
	webhookSecret string
}

// NewStripeProvider creates a new Stripe provider and sets the global API key.
func NewStripeProvider(apiKey, webhookSecret string) *StripeProvider {
	stripe.Key = apiKey
	return &StripeProvider{webhookSecret: webhookSecret}
}

func (s *StripeProvider) Name() Method { return MethodStripe }

func (s *StripeProvider) CreatePayment(ctx context.Context, order OrderInfo, callbacks CallbackURLs) (*PaymentResult, error) {
	var lineItems []*stripe.CheckoutSessionLineItemParams
	for _, item := range order.Items {
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(order.Currency),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(item.Name),
				},
				UnitAmount: stripe.Int64(item.Price),
			},
			Quantity: stripe.Int64(item.Quantity),
		})
	}

	// Add shipping if any
	if order.Shipping > 0 {
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(order.Currency),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String("Frais de livraison"),
				},
				UnitAmount: stripe.Int64(order.Shipping),
			},
			Quantity: stripe.Int64(1),
		})
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(callbacks.SuccessURL),
		CancelURL:          stripe.String(callbacks.CancelURL),
		ClientReferenceID:  stripe.String(order.ID),
		LineItems:          lineItems,
	}
	if order.Email != "" {
		params.CustomerEmail = stripe.String(order.Email)
	}

	sess, err := session.New(params)
	if err != nil {
		return nil, fmt.Errorf("stripe: failed to create checkout session: %w", err)
	}

	return &PaymentResult{
		RedirectURL: sess.URL,
		ExternalID:  sess.ID,
	}, nil
}

func (s *StripeProvider) VerifyWebhook(_ context.Context, payload []byte, headers http.Header) (*WebhookEvent, error) {
	sig := headers.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sig, s.webhookSecret)
	if err != nil {
		return nil, fmt.Errorf("stripe: invalid webhook signature: %w", err)
	}

	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return nil, fmt.Errorf("stripe: failed to parse session: %w", err)
		}
		return &WebhookEvent{
			ExternalID: sess.ID,
			OrderID:    sess.ClientReferenceID,
			Status:     "PAID",
		}, nil

	case "checkout.session.expired":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return nil, fmt.Errorf("stripe: failed to parse session: %w", err)
		}
		return &WebhookEvent{
			ExternalID: sess.ID,
			OrderID:    sess.ClientReferenceID,
			Status:     "FAILED",
		}, nil

	case "charge.refunded":
		var charge stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			return nil, fmt.Errorf("stripe: failed to parse charge: %w", err)
		}
		return &WebhookEvent{
			ExternalID: charge.PaymentIntent.ID,
			Status:     "REFUNDED",
		}, nil
	}

	// Unhandled event type – return nil (not an error, just ignored)
	return nil, nil
}

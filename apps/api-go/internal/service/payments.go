package service

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/webhook"
)

type PaymentsService struct {
	stripeKey     string
	webhookSecret string
	ordersRepo    *repository.OrdersRepository
}

func NewPaymentsService(stripeKey, webhookSecret string, ordersRepo *repository.OrdersRepository) *PaymentsService {
	stripe.Key = stripeKey
	return &PaymentsService{
		stripeKey:     stripeKey,
		webhookSecret: webhookSecret,
		ordersRepo:    ordersRepo,
	}
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

type CreateCheckoutDTO struct {
	OrderID    string `json:"orderId" validate:"required"`
	SuccessURL string `json:"successUrl" validate:"required,url"`
	CancelURL  string `json:"cancelUrl" validate:"required,url"`
}

type CheckoutResponse struct {
	URL string `json:"url"`
}

// ── Checkout Session ──────────────────────────────────────────────────────────

func (s *PaymentsService) CreateCheckout(ctx context.Context, userID, role string, dto CreateCheckoutDTO) (*CheckoutResponse, *types.AppError) {
	// 1. Get and validate order
	order, err := s.ordersRepo.GetByID(ctx, dto.OrderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Order not found")
		}
		return nil, types.InternalError("Database error")
	}

	if role != "ADMIN" && (order.UserId == nil || *order.UserId != userID) {
		return nil, types.Forbidden("Order does not belong to you")
	}

	if order.PaymentStatus == db.PaymentStatusPAID {
		return nil, types.BadRequest("Order is already paid")
	}

	// 2. Fetch order items for line items
	items, err := s.ordersRepo.GetItems(ctx, order.ID)
	if err != nil {
		return nil, types.InternalError("Failed to fetch order items")
	}

	// 3. Construct Stripe LineItems
	var lineItems []*stripe.CheckoutSessionLineItemParams
	for _, item := range items {
		// Stripe expects zero-decimal currency formats for non-zero decimal currencies
		// But for XOF it's actually a 0-decimal currency, so total is just the integer.
		// Standardized way: convert unit price to integer (assuming no decimal support needed or multiply depending on currency).
		// We'll multiply by 100 as fallback logic for standard currencies like EUR/USD,
		// but XOF might need no multiplication. For simplicity let's assume standard behavior = price * 100.
		unitAmount := item.UnitPrice.Mul(decimal.NewFromInt(100)).IntPart()
		if order.Currency == "XOF" {
			unitAmount = item.UnitPrice.IntPart() // XOF has no cents
		}

		lineItem := &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(string(order.Currency)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(item.ProductName),
				},
				UnitAmount: stripe.Int64(unitAmount),
			},
			Quantity: stripe.Int64(int64(item.Quantity)),
		}
		lineItems = append(lineItems, lineItem)
	}

	// 4. Create Stripe Session
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}), // Add orangemoney or others if needed
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(dto.SuccessURL),
		CancelURL:          stripe.String(dto.CancelURL),
		ClientReferenceID:  stripe.String(order.ID),
		LineItems:          lineItems,
		CustomerEmail:      order.GuestEmail, // Best effort
	}
	
	// Add shipping cost if any
	if order.ShippingAmount.IntPart() > 0 {
		shippingAmount := order.ShippingAmount.Mul(decimal.NewFromInt(100)).IntPart()
		if order.Currency == "XOF" {
			shippingAmount = order.ShippingAmount.IntPart()
		}
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(string(order.Currency)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String("Frais de livraison"),
				},
				UnitAmount: stripe.Int64(shippingAmount),
			},
			Quantity: stripe.Int64(1),
		})
	}

	sess, err := session.New(params)
	if err != nil {
		slog.Error("Failed to create Stripe checkout session", "error", err)
		return nil, types.InternalError("Failed to initialize payment gateway")
	}

	// 5. Save intent id internally
	if _, err := s.ordersRepo.UpdateOrderPaymentStatus(ctx, order.ID, order.PaymentStatus, nil, &sess.ID); err != nil {
		slog.Error("Failed to save stripe session ID", "error", err)
		// We still return the URL because the user can pay, we'll reconcile via webhook.
	}

	return &CheckoutResponse{URL: sess.URL}, nil
}

// ── Webhook Handler ───────────────────────────────────────────────────────────

func (s *PaymentsService) HandleWebhook(ctx context.Context, payload []byte, signature string) *types.AppError {
	// 1. Verify signature
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		slog.Error("Stripe webhook signature validation failed", "error", err)
		return types.BadRequest("Invalid payload / signature")
	}

	slog.Info("Stripe webhook received", "type", event.Type)

	// 2. Process based on event type
	switch event.Type {
	case "checkout.session.completed":
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
			return types.InternalError("Failed to parse event data")
		}
		
		// Some checkout sessions might not have a ClientReferenceID. Fallback to lookup by Stripe Session ID.
		if sess.ClientReferenceID != "" {
			if err := s.markAsPaidByOrderID(ctx, sess.ClientReferenceID); err != nil {
				return err
			}
		} else {
			if err := s.markAsPaidBySessionID(ctx, sess.ID); err != nil {
				return err
			}
		}

	case "payment_intent.payment_failed":
		var intent stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &intent); err != nil {
			return types.InternalError("Failed to parse event data")
		}
		
		// Logic to mark as failed
		order, err := s.ordersRepo.GetOrderByStripeSession(ctx, intent.ID)
		if err == nil {
			failedStatus := db.OrderStatusFAILED
			_, _ = s.ordersRepo.UpdateOrderPaymentStatus(ctx, order.ID, db.PaymentStatusUNPAID, &failedStatus, nil)
		}

	case "charge.refunded":
		var charge stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			return types.InternalError("Failed to parse event")
		}
		// If charge refunded, mark order refunded
		order, err := s.ordersRepo.GetOrderByStripeSession(ctx, charge.PaymentIntent.ID)
		if err == nil {
			refundedStatus := db.OrderStatusREFUNDED
			_, _ = s.ordersRepo.UpdateOrderPaymentStatus(ctx, order.ID, db.PaymentStatusREFUNDED, &refundedStatus, nil)
		}

	default:
		slog.Debug("Unhandled Stripe event type", "type", event.Type)
	}

	return nil
}

func (s *PaymentsService) markAsPaidByOrderID(ctx context.Context, orderID string) *types.AppError {
	processing := db.OrderStatusPROCESSING
	if _, err := s.ordersRepo.UpdateOrderPaymentStatus(ctx, orderID, db.PaymentStatusPAID, &processing, nil); err != nil {
		slog.Error("Failed to update status for order", "orderId", orderID, "error", err)
		return types.InternalError("Failed to update order")
	}
	// TODO: Trigger order email confirmation through MailService here
	return nil
}

func (s *PaymentsService) markAsPaidBySessionID(ctx context.Context, sessionID string) *types.AppError {
	order, err := s.ordersRepo.GetOrderByStripeSession(ctx, sessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			slog.Warn("Stripe session completed but order not found", "sessionId", sessionID)
			return types.NotFound("Order not found")
		}
		return types.InternalError("Database error")
	}
	return s.markAsPaidByOrderID(ctx, order.ID)
}

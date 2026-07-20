package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// webhookDedupeTTL is the window during which a duplicate webhook event ID is ignored.
const webhookDedupeTTL = 24 * time.Hour

type PaymentsService struct {
	providers  map[payment.Method]payment.Provider
	ordersRepo *repository.OrdersRepository
	cache      *redis.Client
}

func NewPaymentsService(ordersRepo *repository.OrdersRepository, cache *redis.Client, providers ...payment.Provider) *PaymentsService {
	pm := make(map[payment.Method]payment.Provider)
	for _, p := range providers {
		pm[p.Name()] = p
	}
	return &PaymentsService{
		providers:  pm,
		ordersRepo: ordersRepo,
		cache:      cache,
	}
}

// ── Checkout Session ──────────────────────────────────────────────────────────

func (s *PaymentsService) CreateCheckout(ctx context.Context, userID, role string, dto model.CreateCheckoutDTO) (*model.CheckoutResponse, *types.AppError) {
	// 1. Validate payment method
	method := payment.Method(dto.PaymentMethod)
	provider, ok := s.providers[method]
	if !ok {
		return nil, types.BadRequest("Payment method not available: " + dto.PaymentMethod)
	}

	// 2. Get and validate order
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

	// 3. Fetch order items
	items, err := s.ordersRepo.GetItems(ctx, order.ID)
	if err != nil {
		return nil, types.InternalError("Failed to fetch order items")
	}

	// 4. Build order info for provider
	var providerItems []payment.OrderItem
	for _, item := range items {
		unitPrice := item.UnitPrice.IntPart() // XOF = no decimals
		if order.Currency != "XOF" {
			unitPrice = item.UnitPrice.Mul(decimal.NewFromInt(100)).IntPart()
		}
		providerItems = append(providerItems, payment.OrderItem{
			Name:     item.ProductName,
			Quantity: int64(item.Quantity),
			Price:    unitPrice,
		})
	}

	totalAmount := order.Total.IntPart()
	shippingAmount := order.ShippingAmount.IntPart()
	if order.Currency != "XOF" {
		totalAmount = order.Total.Mul(decimal.NewFromInt(100)).IntPart()
		shippingAmount = order.ShippingAmount.Mul(decimal.NewFromInt(100)).IntPart()
	}

	email := ""
	if order.GuestEmail != nil {
		email = *order.GuestEmail
	}

	orderInfo := payment.OrderInfo{
		ID:          order.ID,
		OrderNumber: order.OrderNumber,
		Currency:    string(order.Currency),
		Items:       providerItems,
		Shipping:    shippingAmount,
		Total:       totalAmount,
		Email:       email,
	}

	if order.CustomerFirstName != nil {
		orderInfo.CustomerFirstName = *order.CustomerFirstName
	}
	if order.CustomerLastName != nil {
		orderInfo.CustomerLastName = *order.CustomerLastName
	}
	if order.CustomerPhone != nil {
		orderInfo.CustomerPhone = *order.CustomerPhone
	}

	// 5. Create payment with provider
	result, err := provider.CreatePayment(ctx, orderInfo, payment.CallbackURLs{
		SuccessURL: dto.SuccessURL,
		CancelURL:  dto.CancelURL,
	})
	if err != nil {
		slog.Error("Failed to create payment", "method", dto.PaymentMethod, "error", err)
		return nil, types.InternalError("Failed to initialize payment gateway")
	}

	// 6. Create Payment record in DB
	paymentID := uuid.New().String()
	_, dbErr := s.ordersRepo.CreatePayment(ctx, db.CreatePaymentParams{
		ID:         paymentID,
		OrderId:    order.ID,
		Method:     db.PaymentMethod(method),
		ExternalId: &result.ExternalID,
		Amount:     order.Total,
		Currency:   string(order.Currency),
		Status:     db.PaymentStatusUNPAID,
	})
	if dbErr != nil {
		slog.Error("Failed to save payment record", "error", dbErr)
		// Continue anyway — we'll reconcile via webhook
	}

	// 7. Update order's payment method
	pm := db.NullPaymentMethod{PaymentMethod: db.PaymentMethod(method), Valid: true}
	if _, err := s.ordersRepo.UpdateOrderPaymentMethod(ctx, order.ID, pm); err != nil {
		slog.Error("Failed to update order payment method", "error", err)
	}

	return &model.CheckoutResponse{
		URL:           result.RedirectURL,
		PaymentMethod: dto.PaymentMethod,
		PaymentID:     paymentID,
	}, nil
}

// ── Webhook Handler ───────────────────────────────────────────────────────────

func (s *PaymentsService) HandleWebhook(ctx context.Context, method payment.Method, payload []byte, headers map[string]string) *types.AppError {
	provider, ok := s.providers[method]
	if !ok {
		return types.BadRequest("Unknown payment method: " + string(method))
	}

	// Convert map to http.Header
	httpHeaders := make(map[string][]string)
	for k, v := range headers {
		httpHeaders[k] = []string{v}
	}

	event, err := provider.VerifyWebhook(ctx, payload, httpHeaders)
	if err != nil {
		slog.Error("Webhook verification failed", "method", method, "error", err)
		return types.BadRequest("Invalid webhook: " + err.Error())
	}

	if event == nil {
		// Unhandled event type — acknowledge silently
		return nil
	}

	slog.Info("Payment webhook received", "method", method, "status", event.Status, "externalId", event.ExternalID, "orderId", event.OrderID)

	// Idempotency: dedupe by provider event ID (fallback to externalID) via Redis SETNX.
	// If the key was already present, another delivery has already applied this event.
	var dedupeKey string
	if s.cache != nil {
		dedupeID := event.ExternalID
		if dedupeID == "" {
			dedupeID = event.OrderID
		}
		if dedupeID != "" {
			dedupeKey = fmt.Sprintf("webhook:%s:%s", method, dedupeID)
			acquired, err := s.cache.SetNX(ctx, dedupeKey, "1", webhookDedupeTTL)
			if err != nil {
				// Redis failure should not block webhook processing — log and continue.
				slog.Warn("webhook dedupe SETNX failed", "method", method, "error", err)
			} else if !acquired {
				slog.Info("webhook already processed — skipping", "method", method, "eventId", dedupeID)
				return nil
			}
		}
	}

	// Find the order
	orderID := event.OrderID
	if orderID == "" && event.ExternalID != "" {
		// Try to find via payment record
		p, err := s.ordersRepo.GetPaymentByExternalID(ctx, event.ExternalID)
		if err == nil {
			orderID = p.OrderId
		} else {
			// Fallback: try the old stripePaymentIntentId column
			o, err := s.ordersRepo.GetOrderByStripeSession(ctx, event.ExternalID)
			if err == nil {
				orderID = o.ID
			}
		}
	}

	if orderID == "" {
		slog.Warn("Webhook received but order not found", "method", method, "externalId", event.ExternalID)
		return nil // Don't return error — it might be a duplicate or something old
	}

	// Update payment record status
	if event.ExternalID != "" {
		p, err := s.ordersRepo.GetPaymentByExternalID(ctx, event.ExternalID)
		if err == nil {
			newStatus := db.PaymentStatusUNPAID
			switch event.Status {
			case "PAID":
				newStatus = db.PaymentStatusPAID
			case "REFUNDED":
				newStatus = db.PaymentStatusREFUNDED
			}
			if _, err := s.ordersRepo.UpdatePaymentStatus(ctx, p.ID, newStatus); err != nil {
				slog.Error("Failed to update payment status", "paymentId", p.ID, "error", err)
			}
		}
	}

	// Update order status
	var updateErr error
	switch event.Status {
	case "PAID":
		processing := db.OrderStatusPROCESSING
		if _, err := s.ordersRepo.UpdateOrderPaymentStatus(ctx, orderID, db.PaymentStatusPAID, &processing, nil); err != nil {
			slog.Error("Failed to mark order as paid", "orderId", orderID, "error", err)
			updateErr = err
		}

	case "FAILED":
		failed := db.OrderStatusFAILED
		if _, err := s.ordersRepo.UpdateOrderPaymentStatus(ctx, orderID, db.PaymentStatusUNPAID, &failed, nil); err != nil {
			slog.Error("Failed to mark order as failed", "orderId", orderID, "error", err)
			updateErr = err
		}

	case "REFUNDED":
		refunded := db.OrderStatusREFUNDED
		if _, err := s.ordersRepo.UpdateOrderPaymentStatus(ctx, orderID, db.PaymentStatusREFUNDED, &refunded, nil); err != nil {
			slog.Error("Failed to mark order as refunded", "orderId", orderID, "error", err)
			updateErr = err
		}
	}

	if updateErr != nil {
		if dedupeKey != "" && s.cache != nil {
			if delErr := s.cache.Delete(ctx, dedupeKey); delErr != nil {
				slog.Error("failed to release webhook dedupe lock after DB error", "key", dedupeKey, "error", delErr)
			}
		}
		return types.InternalError("Failed to update order status")
	}

	return nil
}

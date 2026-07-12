package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/mail"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/payment"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

type RefundResponse struct {
	ID               string   `json:"id"`
	OrderID          string   `json:"orderId"`
	PaymentID        string   `json:"paymentId"`
	Amount           float64  `json:"amount"`
	Currency         string   `json:"currency"`
	Reason           string   `json:"reason"`
	Status           string   `json:"status"`
	ProviderRefundID *string  `json:"providerRefundId,omitempty"`
	IdempotencyKey   string   `json:"idempotencyKey"`
	ErrorMessage     *string  `json:"errorMessage,omitempty"`
	ManualReference  *string  `json:"manualReference,omitempty"`
	JustificationURL *string  `json:"justificationUrl,omitempty"`
	IsManualRequired bool     `json:"isManualRequired"`
}

type RefundsService struct {
	refundsRepo  *repository.RefundsRepository
	ordersRepo   *repository.OrdersRepository
	providers    []payment.Provider
	redis        *redis.Client
	mail         *mail.MailService
}

func NewRefundsService(
	refundsRepo *repository.RefundsRepository,
	ordersRepo *repository.OrdersRepository,
	redis *redis.Client,
	mail *mail.MailService,
	providers ...payment.Provider,
) *RefundsService {
	return &RefundsService{
		refundsRepo: refundsRepo,
		ordersRepo:  ordersRepo,
		providers:   providers,
		redis:       redis,
		mail:        mail,
	}
}

func (s *RefundsService) RequestRefund(
	ctx context.Context,
	orderID, adminUserID string,
	amount float64,
	reason, idempotencyKey string,
) (*RefundResponse, *types.AppError) {
	// 1. Idempotency check — return existing if key already used
	existing, err := s.refundsRepo.GetByIdempotencyKey(ctx, idempotencyKey)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, types.InternalError("Database error checking idempotency")
	}
	if existing != nil {
		return toRefundResponse(existing), nil
	}

	// 2. Load order
	order, err := s.ordersRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Order not found")
		}
		return nil, types.InternalError("Database error")
	}

	// 3. Load payment (first PAID payment)
	payments, err := s.ordersRepo.GetPaymentsForOrder(ctx, orderID)
	if err != nil || len(payments) == 0 {
		return nil, types.BadRequest("No payment found for this order")
	}
	pay := payments[0] // most recent first

	// 4. Cap check: existing refunds (PENDING+SUCCEEDED) + new amount <= order.total
	existingSum, err := s.refundsRepo.SumByOrderID(ctx, orderID)
	if err != nil {
		return nil, types.InternalError("Failed to calculate existing refunds")
	}
	newAmount := decimal.NewFromFloat(amount)
	if existingSum.Add(newAmount).GreaterThan(order.Total) {
		return nil, types.BadRequest("Refund amount exceeds order total minus existing refunds")
	}

	// 5. Redis lock (extra safety, 30s window)
	redisKey := "refund_lock:" + idempotencyKey
	set, _ := s.redis.SetNX(ctx, redisKey, "1", 30*time.Second)
	if !set {
		// Race — the DB idempotency check will catch this on retry
		return nil, types.Conflict("Refund already being processed")
	}

	// 6. Begin transaction
	pool := s.refundsRepo.Pool()
	tx, txErr := pool.Begin(ctx)
	if txErr != nil {
		return nil, types.InternalError("Failed to start transaction")
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 7. Insert RefundRequest (PENDING)
	refRow, txErr := s.refundsRepo.WithTx(tx).CreateRefundRequest(ctx, db.CreateRefundRequestParams{
		ID:             uuid.New().String(),
		OrderId:        orderID,
		PaymentId:      pay.ID,
		Amount:         newAmount,
		Currency:       pay.Currency,
		Reason:         reason,
		IdempotencyKey: idempotencyKey,
		RequestedBy:    adminUserID,
	})
	if txErr != nil {
		return nil, types.InternalError("Failed to create refund request")
	}

	// 8. Call payment provider
	refunder := s.findRefunder(pay.Method)
	if refunder == nil {
		// Provider not configured — treat as manual
		if commitErr := tx.Commit(ctx); commitErr != nil {
			return nil, types.InternalError("Failed to commit")
		}
		resp := toRefundResponse(&refRow)
		resp.IsManualRequired = true
		errMsg := "manual_refund_required"
		resp.ErrorMessage = &errMsg
		return resp, nil
	}

	externalID := ""
	if pay.ExternalId != nil {
		externalID = *pay.ExternalId
	}
	providerOut, provErr := refunder.Refund(ctx, payment.RefundInput{
		ExternalPaymentID: externalID,
		Amount:            amount,
		Currency:          pay.Currency,
		IdempotencyKey:    idempotencyKey,
		Reason:            reason,
	})

	var finalStatus db.RefundStatus
	var providerRefundID *string
	var errorMsg *string
	isManual := false

	if errors.Is(provErr, payment.ErrRefundNotSupported) {
		// Manual workflow (e.g. Wave)
		isManual = true
		finalStatus = db.RefundStatus("PENDING")
		msg := "manual_refund_required"
		errorMsg = &msg
	} else if provErr != nil {
		finalStatus = db.RefundStatus("FAILED")
		msg := provErr.Error()
		errorMsg = &msg
	} else {
		finalStatus = db.RefundStatus("SUCCEEDED")
		if providerOut.ProviderRefundID != "" {
			providerRefundID = &providerOut.ProviderRefundID
		}
	}

	// 9. Update refund status in transaction
	qtx := s.refundsRepo.WithTx(tx)
	updatedRef, txErr := qtx.UpdateRefundStatus(ctx, db.UpdateRefundStatusParams{
		ID:               refRow.ID,
		Status:           finalStatus,
		ProviderRefundId: providerRefundID,
		ErrorMessage:     errorMsg,
	})
	if txErr != nil {
		return nil, types.InternalError("Failed to update refund status")
	}

	// 10. Update payment + order status if fully refunded
	if finalStatus == db.RefundStatus("SUCCEEDED") {
		newSum := existingSum.Add(newAmount)
		payStatus := db.PaymentStatusPARTIALLYREFUNDED
		orderStatus := db.OrderStatus(order.Status)

		if newSum.GreaterThanOrEqual(order.Total) {
			payStatus = db.PaymentStatusREFUNDED
			orderStatus = db.OrderStatusREFUNDED
		}

		ordersQtx := s.ordersRepo.WithTx(tx)
		if _, txErr = ordersQtx.UpdatePaymentStatus(ctx, db.UpdatePaymentStatusParams{
			ID:      pay.ID,
			Column2: payStatus,
		}); txErr != nil {
			return nil, types.InternalError("Failed to update payment status")
		}

		if _, txErr = ordersQtx.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
			ID:     orderID,
			Status: orderStatus,
		}); txErr != nil {
			return nil, types.InternalError("Failed to update order status")
		}
	}

	if commitErr := tx.Commit(ctx); commitErr != nil {
		return nil, types.InternalError("Failed to commit transaction")
	}

	// 11. Send email (non-blocking)
	customerEmail := ""
	if order.GuestEmail != nil {
		customerEmail = *order.GuestEmail
	}
	locale := string(order.Locale)
	go func() {
		bgCtx := context.Background()
		if mailErr := s.mail.SendRefundEmail(bgCtx, customerEmail, locale, mail.RefundEmailData{
			OrderNumber:     order.OrderNumber,
			Amount:          amount,
			Currency:        pay.Currency,
			IsManualPending: isManual,
		}); mailErr != nil {
			slog.Warn("refunds: failed to send email", "error", mailErr, "orderId", orderID)
		}
	}()

	resp := toRefundResponse(&updatedRef)
	resp.IsManualRequired = isManual
	return resp, nil
}

func (s *RefundsService) MarkManualCompleted(
	ctx context.Context,
	refundID, adminUserID string,
	manualReference string,
	justificationURL *string,
) (*RefundResponse, *types.AppError) {
	ref, err := s.refundsRepo.GetByID(ctx, refundID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Refund not found")
		}
		return nil, types.InternalError("Database error")
	}
	if ref.Status != db.RefundStatus("PENDING") {
		return nil, types.BadRequest("Refund is not in PENDING status")
	}
	if ref.ErrorMessage == nil || *ref.ErrorMessage != "manual_refund_required" {
		return nil, types.BadRequest("This refund does not require manual completion")
	}

	// Everything in one transaction: mark SUCCEEDED + update payment/order atomically.
	pool := s.refundsRepo.Pool()
	tx, txErr := pool.Begin(ctx)
	if txErr != nil {
		return nil, types.InternalError("Failed to start transaction")
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtxRef := s.refundsRepo.WithTx(tx)
	manualRef := manualReference
	updated, err := qtxRef.MarkRefundManualCompleted(ctx, db.MarkRefundManualCompletedParams{
		ID:               refundID,
		ManualReference:  &manualRef,
		JustificationUrl: justificationURL,
	})
	if err != nil {
		return nil, types.InternalError("Failed to mark refund as completed")
	}

	order, err := s.ordersRepo.GetByID(ctx, ref.OrderId)
	if err != nil {
		return nil, types.InternalError("Failed to load order")
	}
	existingSum, _ := s.refundsRepo.SumByOrderID(ctx, ref.OrderId)

	payments, _ := s.ordersRepo.GetPaymentsForOrder(ctx, ref.OrderId)
	if len(payments) > 0 {
		qtx := s.ordersRepo.WithTx(tx)
		payStatus := db.PaymentStatusPARTIALLYREFUNDED
		orderStatus := db.OrderStatus(order.Status)
		if existingSum.GreaterThanOrEqual(order.Total) {
			payStatus = db.PaymentStatusREFUNDED
			orderStatus = db.OrderStatusREFUNDED
		}
		if _, upErr := qtx.UpdatePaymentStatus(ctx, db.UpdatePaymentStatusParams{ID: payments[0].ID, Column2: payStatus}); upErr != nil {
			return nil, types.InternalError("Failed to update payment status")
		}
		if _, upErr := qtx.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{ID: ref.OrderId, Status: orderStatus}); upErr != nil {
			return nil, types.InternalError("Failed to update order status")
		}
	}

	if cErr := tx.Commit(ctx); cErr != nil {
		return nil, types.InternalError("Failed to commit refund completion")
	}

	slog.Info("refunds: manual completion by admin", "refundId", refundID, "adminId", adminUserID)
	return toRefundResponse(&updated), nil
}

func (s *RefundsService) ListByOrderID(ctx context.Context, orderID string) ([]RefundResponse, *types.AppError) {
	rows, err := s.refundsRepo.ListByOrderID(ctx, orderID)
	if err != nil {
		return nil, types.InternalError("Failed to fetch refunds")
	}
	result := make([]RefundResponse, 0, len(rows))
	for i := range rows {
		result = append(result, *toRefundResponse(&rows[i]))
	}
	return result, nil
}

func (s *RefundsService) findRefunder(method db.PaymentMethod) payment.PaymentRefunder {
	for _, p := range s.providers {
		if string(p.Name()) == string(method) {
			if r, ok := p.(payment.PaymentRefunder); ok {
				return r
			}
		}
	}
	return nil
}

func toRefundResponse(r *db.RefundRequest) *RefundResponse {
	f, _ := r.Amount.Float64()
	resp := &RefundResponse{
		ID:             r.ID,
		OrderID:        r.OrderId,
		PaymentID:      r.PaymentId,
		Amount:         f,
		Currency:       r.Currency,
		Reason:         r.Reason,
		Status:         string(r.Status),
		IdempotencyKey: r.IdempotencyKey,
	}
	if r.ProviderRefundId != nil {
		resp.ProviderRefundID = r.ProviderRefundId
	}
	if r.ErrorMessage != nil {
		resp.ErrorMessage = r.ErrorMessage
		resp.IsManualRequired = *r.ErrorMessage == "manual_refund_required"
	}
	if r.ManualReference != nil {
		resp.ManualReference = r.ManualReference
	}
	if r.JustificationUrl != nil {
		resp.JustificationURL = r.JustificationUrl
	}
	return resp
}

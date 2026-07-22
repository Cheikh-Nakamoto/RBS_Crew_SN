package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"
)

// ── Service ───────────────────────────────────────────────────────────────────

type OrdersService struct {
	ordersRepo   *repository.OrdersRepository
	productsRepo *repository.ProductsRepository
	shippingSvc  *ShippingService // optional — nil = no shipping rate calc
}

func NewOrdersService(ordersRepo *repository.OrdersRepository, productsRepo *repository.ProductsRepository, shippingSvc ...*ShippingService) *OrdersService {
	svc := &OrdersService{ordersRepo: ordersRepo, productsRepo: productsRepo}
	if len(shippingSvc) > 0 {
		svc.shippingSvc = shippingSvc[0]
	}
	return svc
}

func (s *OrdersService) Create(ctx context.Context, dto model.CreateOrderDTO, userID *string) (*model.OrderResponse, *types.AppError) {
	if userID == nil && dto.GuestEmail == "" {
		return nil, types.BadRequest("guestEmail is required for guest orders")
	}

	pool := s.ordersRepo.Pool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, types.InternalError("Failed to start transaction")
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtx := s.ordersRepo.WithTx(tx)
	productsTx := s.productsRepo.WithTx(tx)

	// 1. Resolve products server-side (never trust client prices)
	var subtotal decimal.Decimal
	itemsData := make([]db.CreateOrderItemParams, 0, len(dto.Items))

	for _, item := range dto.Items {
		product, err := productsTx.GetProductForOrder(ctx, item.ProductID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, types.NotFound(fmt.Sprintf("Product %s not found", item.ProductID))
			}
			return nil, types.InternalError("Database error")
		}

		// 2. Atomic stock decrement inside the transaction (WHERE stock >= qty — no race condition).
		// If the transaction rolls back, stock is automatically restored.
		if product.ManageStock {
			affected, err := productsTx.DecrementStock(ctx, db.DecrementStockParams{ID: product.ID, Stock: int32(item.Quantity)})
			if err != nil {
				return nil, types.InternalError("Failed to update stock")
			}
			if affected == 0 {
				return nil, types.BadRequest(fmt.Sprintf(
					"Stock insuffisant pour le produit %s. Disponible: %d",
					func() string {
						if product.Sku != nil {
							return *product.Sku
						}
						return product.ID
					}(),
					product.Stock,
				))
			}
		}

		qty := decimal.NewFromInt(int64(item.Quantity))
		unitPrice := product.Price
		totalPrice := unitPrice.Mul(qty)
		subtotal = subtotal.Add(totalPrice)

		productName := product.ID
		if product.Sku != nil {
			productName = *product.Sku
		}

		itemsData = append(itemsData, db.CreateOrderItemParams{
			ID:          uuid.New().String(),
			OrderId:     "", // filled below after order creation
			ProductId:   product.ID,
			VariantId:   item.VariantID,
			Quantity:    int32(item.Quantity),
			UnitPrice:   unitPrice,
			TotalPrice:  totalPrice,
			ProductName: productName,
			ProductSku:  product.Sku,
		})
	}

	// 3. Create order — only set guestEmail when this is a guest order (userID == nil).
	var guestEmail *string
	if userID == nil {
		guestEmail = &dto.GuestEmail
	}
	orderID := uuid.New().String()
	order, err := qtx.CreateOrder(ctx, db.CreateOrderParams{
		ID:                orderID,
		OrderNumber:       generateOrderNumber(),
		UserId:            userID,
		GuestEmail:        guestEmail,
		Subtotal:          subtotal,
		ShippingAddressId: dto.ShippingAddressID,
		BillingAddressId:  dto.BillingAddressID,
		Notes:             dto.Notes,
		CustomerFirstName: dto.CustomerFirstName,
		CustomerLastName:  dto.CustomerLastName,
		CustomerPhone:     dto.CustomerPhone,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create order")
	}

	// 4. Create order items
	items := make([]model.OrderItemResponse, 0, len(itemsData))
	for _, itemParam := range itemsData {
		itemParam.OrderId = order.ID
		created, err := qtx.CreateOrderItem(ctx, itemParam)
		if err != nil {
			slog.Error("orders: CreateOrderItem failed", "error", err)
			return nil, types.InternalError("Failed to create order item")
		}
		items = append(items, model.OrderItemResponse{
			ID: created.ID, ProductID: created.ProductId,
			ProductName: created.ProductName, ProductSKU: created.ProductSku,
			Quantity: created.Quantity, UnitPrice: created.UnitPrice, TotalPrice: created.TotalPrice,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, types.InternalError("Failed to commit transaction")
	}

	// 5. Apply server-side shipping amount (after commit — shipping failure is non-fatal)
	if s.shippingSvc != nil && dto.ShippingMethodID != nil && dto.ShippingCountry != "" {
		shippingOptions, shippingErr := s.shippingSvc.Quote(ctx, dto.ShippingCountry, subtotal)
		if shippingErr == nil {
			for _, opt := range shippingOptions {
				if opt.MethodID == *dto.ShippingMethodID {
					shippingFee := decimal.NewFromFloat(opt.FlatFee)
					updated, repoErr := s.ordersRepo.UpdateOrderShippingAmount(ctx, order.ID, shippingFee)
					if repoErr == nil {
						order = *updated
					}
					// Also set the method on the order
					_, _ = s.ordersRepo.UpdateOrderShipping(ctx, db.UpdateOrderShippingParams{
						ID:               order.ID,
						ShippingMethodId: dto.ShippingMethodID,
					})
					break
				}
			}
		}
	}

	return toOrderResponse(&order, items), nil
}

func (s *OrdersService) FindAll(ctx context.Context, page, limit int) (*types.PaginatedResponse[model.OrderResponse], *types.AppError) {
	rows, err := s.ordersRepo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch orders")
	}
	var total int
	results := make([]model.OrderResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		items, _ := s.ordersRepo.GetItems(ctx, row.ID)
		o := db.Order{
			ID:                    row.ID,
			OrderNumber:           row.OrderNumber,
			UserId:                row.UserId,
			GuestEmail:            row.GuestEmail,
			Status:                row.Status,
			PaymentStatus:         row.PaymentStatus,
			StripePaymentIntentId: row.StripePaymentIntentId,
			Currency:              row.Currency,
			Subtotal:              row.Subtotal,
			TaxAmount:             row.TaxAmount,
			ShippingAmount:        row.ShippingAmount,
			DiscountAmount:        row.DiscountAmount,
			Total:                 row.Total,
			ShippingAddressId:     row.ShippingAddressId,
			BillingAddressId:      row.BillingAddressId,
			Notes:                 row.Notes,
			WcId:                  row.WcId,
			Locale:                row.Locale,
			CreatedAt:             row.CreatedAt,
			UpdatedAt:             row.UpdatedAt,
		}
		results = append(results, toOrderResponseFromRow(&o, toItemResponses(items)))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *OrdersService) FindMy(ctx context.Context, userID string, page, limit int) (*types.PaginatedResponse[model.OrderResponse], *types.AppError) {
	rows, err := s.ordersRepo.ListMy(ctx, userID, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch orders")
	}
	var total int
	results := make([]model.OrderResponse, 0, len(rows))
	for _, row := range rows {
		if total == 0 {
			total = int(row.TotalCount)
		}
		items, _ := s.ordersRepo.GetItems(ctx, row.ID)
		o := db.Order{
			ID:                    row.ID,
			OrderNumber:           row.OrderNumber,
			UserId:                row.UserId,
			GuestEmail:            row.GuestEmail,
			Status:                row.Status,
			PaymentStatus:         row.PaymentStatus,
			StripePaymentIntentId: row.StripePaymentIntentId,
			Currency:              row.Currency,
			Subtotal:              row.Subtotal,
			TaxAmount:             row.TaxAmount,
			ShippingAmount:        row.ShippingAmount,
			DiscountAmount:        row.DiscountAmount,
			Total:                 row.Total,
			ShippingAddressId:     row.ShippingAddressId,
			BillingAddressId:      row.BillingAddressId,
			Notes:                 row.Notes,
			WcId:                  row.WcId,
			Locale:                row.Locale,
			CreatedAt:             row.CreatedAt,
			UpdatedAt:             row.UpdatedAt,
		}
		results = append(results, toOrderResponseFromRow(&o, toItemResponses(items)))
	}
	return types.Paginate(results, total, page, limit), nil
}

func (s *OrdersService) FindOne(ctx context.Context, id, userID, role string) (*model.OrderResponse, *types.AppError) {
	order, err := s.ordersRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Order not found")
		}
		return nil, types.InternalError("Database error")
	}
	if role != "ADMIN" && (order.UserId == nil || *order.UserId != userID) {
		return nil, types.Forbidden("Access denied")
	}
	items, _ := s.ordersRepo.GetItems(ctx, id)
	res := toOrderResponseFromRow(order, toItemResponses(items))
	return &res, nil
}

// UpdateShipping sets tracking/carrier/shipping info on an order (admin + editor).
func (s *OrdersService) UpdateShipping(ctx context.Context, orderID, carrier, trackingNumber string, shippingMethodID *string) (*model.OrderResponse, *types.AppError) {
	params := db.UpdateOrderShippingParams{
		ID:               orderID,
		ShippingMethodId: shippingMethodID,
	}
	if carrier != "" {
		params.ShippingCarrier = &carrier
	}
	if trackingNumber != "" {
		params.TrackingNumber = &trackingNumber
	}
	// Set shippedAt to now if trackingNumber is provided
	if trackingNumber != "" {
		params.ShippedAt = pgtype.Timestamp{Time: time.Now(), Valid: true}
	}
	order, err := s.ordersRepo.UpdateOrderShipping(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Order not found")
		}
		return nil, types.InternalError("Failed to update order shipping")
	}
	items, _ := s.ordersRepo.GetItems(ctx, orderID)
	res := toOrderResponseFromRow(order, toItemResponses(items))
	return &res, nil
}

func (s *OrdersService) AdminDelete(ctx context.Context, id string) *types.AppError {
	if err := s.ordersRepo.Delete(ctx, id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return types.NotFound("Order not found")
		}
		return types.InternalError("Failed to delete order")
	}
	return nil
}

func (s *OrdersService) UpdateStatus(ctx context.Context, id, status string) (*model.OrderResponse, *types.AppError) {
	// Passer une commande en CANCELLED depuis le back-office doit rendre son
	// stock, exactement comme une expiration ou un paiement échoué.
	if status == string(db.OrderStatusCANCELLED) {
		if _, err := s.ReleaseStock(ctx, id, db.OrderStatusCANCELLED, nil); err != nil {
			slog.Error("orders: release stock on admin cancel failed", "orderId", id, "error", err)
			return nil, types.InternalError("Failed to cancel order")
		}
		order, err := s.ordersRepo.GetByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, types.NotFound("Order not found")
			}
			return nil, types.InternalError("Failed to load order")
		}
		items, _ := s.ordersRepo.GetItems(ctx, id)
		return toOrderResponse(order, toItemResponses(items)), nil
	}

	order, err := s.ordersRepo.UpdateStatus(ctx, id, status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Order not found")
		}
		return nil, types.InternalError("Failed to update order")
	}
	items, _ := s.ordersRepo.GetItems(ctx, id)
	res := toOrderResponseFromRow(order, toItemResponses(items))
	return &res, nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func generateOrderNumber() string {
	return "RBS-" + strings.ToUpper(strconv.FormatInt(time.Now().UnixMilli(), 36))
}

func toItemResponses(items []db.OrderItem) []model.OrderItemResponse {
	var result []model.OrderItemResponse
	for _, item := range items {
		result = append(result, model.OrderItemResponse{
			ID: item.ID, ProductID: item.ProductId,
			ProductName: item.ProductName, ProductSKU: item.ProductSku,
			Quantity: item.Quantity, UnitPrice: item.UnitPrice, TotalPrice: item.TotalPrice,
		})
	}
	return result
}

func toOrderResponse(o *db.Order, items []model.OrderItemResponse) *model.OrderResponse {
	r := model.OrderResponse{
		ID: o.ID, OrderNumber: o.OrderNumber,
		Status: string(o.Status), PaymentStatus: string(o.PaymentStatus),
		Currency: o.Currency,
		Subtotal: o.Subtotal, TaxAmount: o.TaxAmount,
		ShippingAmount: o.ShippingAmount, DiscountAmount: o.DiscountAmount,
		Total:           o.Total,
		Items:           items,
		CreatedAt:       o.CreatedAt.Time,
		ShippingCarrier: o.ShippingCarrier,
		TrackingNumber:  o.TrackingNumber,
	}
	if o.ShippedAt.Valid {
		t := o.ShippedAt.Time
		r.ShippedAt = &t
	}
	if o.DeliveredAt.Valid {
		t := o.DeliveredAt.Time
		r.DeliveredAt = &t
	}
	return &r
}

func toOrderResponseFromRow(o *db.Order, items []model.OrderItemResponse) model.OrderResponse {
	r := model.OrderResponse{
		ID: o.ID, OrderNumber: o.OrderNumber,
		Status: string(o.Status), PaymentStatus: string(o.PaymentStatus),
		Currency: o.Currency,
		Subtotal: o.Subtotal, TaxAmount: o.TaxAmount,
		ShippingAmount: o.ShippingAmount, DiscountAmount: o.DiscountAmount,
		Total:           o.Total,
		Items:           items,
		CreatedAt:       o.CreatedAt.Time,
		ShippingCarrier: o.ShippingCarrier,
		TrackingNumber:  o.TrackingNumber,
	}
	if o.ShippedAt.Valid {
		t := o.ShippedAt.Time
		r.ShippedAt = &t
	}
	if o.DeliveredAt.Valid {
		t := o.DeliveredAt.Time
		r.DeliveredAt = &t
	}
	return r
}

// pgtype helper (used in auth.go as well)
func pgTime(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t, Valid: true}
}

// ── Libération du stock ───────────────────────────────────────────────────────

// ReleaseStock fait passer une commande dans un état terminal qui ne consomme
// pas de stock (FAILED, CANCELLED, REFUNDED) et rend les unités décrémentées à
// sa création.
//
// C'est l'action compensatoire du décrément fait dans Create : la commande et le
// stock vivant dans la même base, les deux tiennent dans UNE transaction — il ne
// peut donc pas y avoir de compensation partielle.
//
// L'idempotence vient de la garde SQL sur le statut courant (ReleaseOrderStock
// ignore les commandes déjà terminales) : un webhook rejoué, ou une expiration
// concurrente d'une annulation admin, ne restitue jamais deux fois.
// Renvoie true si cet appel a effectivement libéré le stock.
func (s *OrdersService) ReleaseStock(
	ctx context.Context,
	orderID string,
	newStatus db.OrderStatus,
	paymentStatus *db.PaymentStatus,
) (bool, error) {
	pool := s.ordersRepo.Pool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	qtx := s.ordersRepo.WithTx(tx)

	affected, err := qtx.ReleaseOrderStock(ctx, db.ReleaseOrderStockParams{
		ID:            orderID,
		Column2:       newStatus,
		PaymentStatus: paymentStatus,
	})
	if err != nil {
		return false, fmt.Errorf("release order: %w", err)
	}
	if affected == 0 {
		// Déjà dans un état terminal : rien à restituer.
		return false, nil
	}

	items, err := qtx.GetOrderItems(ctx, orderID)
	if err != nil {
		return false, fmt.Errorf("order items: %w", err)
	}

	productsTx := s.productsRepo.WithTx(tx)
	for _, item := range items {
		if _, err := productsTx.RestoreStock(ctx, db.RestoreStockParams{
			ID:    item.ProductId,
			Stock: item.Quantity,
		}); err != nil {
			return false, fmt.Errorf("restore stock %s: %w", item.ProductId, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("commit: %w", err)
	}

	slog.Info("stock released", "orderId", orderID, "newStatus", newStatus, "items", len(items))
	return true, nil
}

// ExpireUnpaidOrders annule les commandes jamais payées au-delà du délai et rend
// leur stock. Sans ce balayage, un client qui ferme son onglet immobilise du
// stock indéfiniment.
func (s *OrdersService) ExpireUnpaidOrders(ctx context.Context, olderThan time.Duration) (int, error) {
	cutoff := pgtype.Timestamp{Time: time.Now().Add(-olderThan), Valid: true}
	ids, err := s.ordersRepo.Queries().ListExpiredUnpaidOrders(ctx, cutoff)
	if err != nil {
		return 0, fmt.Errorf("list expired: %w", err)
	}

	released := 0
	for _, id := range ids {
		unpaid := db.PaymentStatusUNPAID
		ok, err := s.ReleaseStock(ctx, id, db.OrderStatusCANCELLED, &unpaid)
		if err != nil {
			// Une commande en échec ne doit pas interrompre le balayage.
			slog.Error("expire: release failed", "orderId", id, "error", err)
			continue
		}
		if ok {
			released++
		}
	}
	return released, nil
}

package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/shopspring/decimal"
)

// ── DTOs ─────────────────────────────────────────────────────────────────────

type CreateOrderItemDTO struct {
	ProductID string `json:"productId" validate:"required,uuid"`
	VariantID *string `json:"variantId"`
	Quantity  int    `json:"quantity"  validate:"required,min=1"`
}

type CreateOrderDTO struct {
	Items             []CreateOrderItemDTO `json:"items"      validate:"required,min=1,dive"`
	GuestEmail        string               `json:"guestEmail"`
	ShippingAddressID *string              `json:"shippingAddressId"`
	BillingAddressID  *string              `json:"billingAddressId"`
	Notes             *string              `json:"notes"`
}

// ── Response types ────────────────────────────────────────────────────────────

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

// ── Service ───────────────────────────────────────────────────────────────────

type OrdersService struct {
	ordersRepo   *repository.OrdersRepository
	productsRepo *repository.ProductsRepository
}

func NewOrdersService(ordersRepo *repository.OrdersRepository, productsRepo *repository.ProductsRepository) *OrdersService {
	return &OrdersService{ordersRepo: ordersRepo, productsRepo: productsRepo}
}

func (s *OrdersService) Create(ctx context.Context, dto CreateOrderDTO, userID *string) (*OrderResponse, *types.AppError) {
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

	// 1. Resolve products server-side (never trust client prices)
	var subtotal decimal.Decimal
	itemsData := make([]db.CreateOrderItemParams, 0, len(dto.Items))

	for _, item := range dto.Items {
		product, err := s.productsRepo.GetForOrder(ctx, item.ProductID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, types.NotFound(fmt.Sprintf("Product %s not found", item.ProductID))
			}
			return nil, types.InternalError("Database error")
		}

		// 2. Atomic stock decrement (WHERE stock >= qty — no race condition)
		if product.ManageStock {
			affected, err := s.productsRepo.DecrementStock(ctx, product.ID, int32(item.Quantity))
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

	// 3. Create order
	orderID := uuid.New().String()
	order, err := qtx.CreateOrder(ctx, db.CreateOrderParams{
		ID:                orderID,
		OrderNumber:       generateOrderNumber(),
		UserId:            userID,
		GuestEmail:        &dto.GuestEmail,
		Subtotal:          subtotal,
		ShippingAddressId: dto.ShippingAddressID,
		BillingAddressId:  dto.BillingAddressID,
		Notes:             dto.Notes,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create order")
	}

	// 4. Create order items
	items := make([]OrderItemResponse, 0, len(itemsData))
	for _, itemParam := range itemsData {
		itemParam.OrderId = order.ID
		created, err := qtx.CreateOrderItem(ctx, itemParam)
		if err != nil {
			return nil, types.InternalError("Failed to create order item")
		}
		items = append(items, OrderItemResponse{
			ID: created.ID, ProductID: created.ProductId,
			ProductName: created.ProductName, ProductSKU: created.ProductSku,
			Quantity: created.Quantity, UnitPrice: created.UnitPrice, TotalPrice: created.TotalPrice,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, types.InternalError("Failed to commit transaction")
	}

	return toOrderResponse(&order, items), nil
}

func (s *OrdersService) FindAll(ctx context.Context, page, limit int) (*types.PaginatedResponse[OrderResponse], *types.AppError) {
	rows, err := s.ordersRepo.List(ctx, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch orders")
	}
	var total int
	results := make([]OrderResponse, 0, len(rows))
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

func (s *OrdersService) FindMy(ctx context.Context, userID string, page, limit int) (*types.PaginatedResponse[OrderResponse], *types.AppError) {
	rows, err := s.ordersRepo.ListMy(ctx, userID, int32(limit), int32((page-1)*limit))
	if err != nil {
		return nil, types.InternalError("Failed to fetch orders")
	}
	var total int
	results := make([]OrderResponse, 0, len(rows))
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

func (s *OrdersService) FindOne(ctx context.Context, id, userID, role string) (*OrderResponse, *types.AppError) {
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

func (s *OrdersService) UpdateStatus(ctx context.Context, id, status string) (*OrderResponse, *types.AppError) {
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

func toItemResponses(items []db.OrderItem) []OrderItemResponse {
	var result []OrderItemResponse
	for _, item := range items {
		result = append(result, OrderItemResponse{
			ID: item.ID, ProductID: item.ProductId,
			ProductName: item.ProductName, ProductSKU: item.ProductSku,
			Quantity: item.Quantity, UnitPrice: item.UnitPrice, TotalPrice: item.TotalPrice,
		})
	}
	return result
}

func toOrderResponse(o *db.Order, items []OrderItemResponse) *OrderResponse {
	return &OrderResponse{
		ID: o.ID, OrderNumber: o.OrderNumber,
		Status: string(o.Status), PaymentStatus: string(o.PaymentStatus),
		Currency:       o.Currency,
		Subtotal:       o.Subtotal, TaxAmount: o.TaxAmount,
		ShippingAmount: o.ShippingAmount, DiscountAmount: o.DiscountAmount,
		Total:     o.Total,
		Items:     items,
		CreatedAt: o.CreatedAt.Time,
	}
}

func toOrderResponseFromRow(o *db.Order, items []OrderItemResponse) OrderResponse {
	return OrderResponse{
		ID: o.ID, OrderNumber: o.OrderNumber,
		Status: string(o.Status), PaymentStatus: string(o.PaymentStatus),
		Currency:       o.Currency,
		Subtotal:       o.Subtotal, TaxAmount: o.TaxAmount,
		ShippingAmount: o.ShippingAmount, DiscountAmount: o.DiscountAmount,
		Total:     o.Total,
		Items:     items,
		CreatedAt: o.CreatedAt.Time,
	}
}

// pgtype helper (used in auth.go as well)
func pgTime(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t, Valid: true}
}

package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/model"
	redisclient "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/redis"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/redis/go-redis/v9"
)

const (
	cartTTL       = 30 * 24 * time.Hour
	cartKeyPrefix = "cart:"
)

// ── Service ───────────────────────────────────────────────────────────────────

type CartService struct {
	redis *redisclient.Client
}

func NewCartService(redis *redisclient.Client) *CartService {
	return &CartService{redis: redis}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func cartKey(userID string) string { return cartKeyPrefix + userID }

func buildResponse(items []model.CartItem) *model.CartResponse {
	var total float64
	var count int
	for _, i := range items {
		total += i.Price * float64(i.Quantity)
		count += i.Quantity
	}
	if items == nil {
		items = []model.CartItem{}
	}
	return &model.CartResponse{Items: items, Total: total, Count: count}
}

func (s *CartService) load(ctx context.Context, userID string) ([]model.CartItem, *types.AppError) {
	raw, err := s.redis.Get(ctx, cartKey(userID))
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return []model.CartItem{}, nil
		}
		return nil, types.InternalError("impossible de lire le panier")
	}
	var items []model.CartItem
	if err := json.Unmarshal([]byte(raw), &items); err != nil {
		return []model.CartItem{}, nil
	}
	return items, nil
}

func (s *CartService) save(ctx context.Context, userID string, items []model.CartItem) *types.AppError {
	data, err := json.Marshal(items)
	if err != nil {
		return types.InternalError("impossible de sérialiser le panier")
	}
	if err := s.redis.Set(ctx, cartKey(userID), data, cartTTL); err != nil {
		return types.InternalError("impossible de sauvegarder le panier")
	}
	return nil
}

// ── Public Methods ────────────────────────────────────────────────────────────

// Get returns the current user cart.
func (s *CartService) Get(ctx context.Context, userID string) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}
	return buildResponse(items), nil
}

// AddOrUpdateItem adds an item or increments its quantity (capped at maxStock).
func (s *CartService) AddOrUpdateItem(ctx context.Context, userID string, dto model.UpsertCartItemDTO) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	found := false
	for i, item := range items {
		if item.ProductID == dto.ProductID {
			newQty := item.Quantity + dto.Quantity
			if newQty > dto.MaxStock {
				newQty = dto.MaxStock
			}
			items[i].Quantity = newQty
			found = true
			break
		}
	}
	if !found {
		qty := dto.Quantity
		if qty > dto.MaxStock {
			qty = dto.MaxStock
		}
		items = append(items, model.CartItem{
			ProductID: dto.ProductID,
			Slug:      dto.Slug,
			Name:      dto.Name,
			Price:     dto.Price,
			Quantity:  qty,
			Image:     dto.Image,
			MaxStock:  dto.MaxStock,
		})
	}

	if appErr := s.save(ctx, userID, items); appErr != nil {
		return nil, appErr
	}
	return buildResponse(items), nil
}

// UpdateQuantity sets the quantity of an item (quantity=0 removes it).
func (s *CartService) UpdateQuantity(ctx context.Context, userID, productID string, quantity int) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	if quantity <= 0 {
		filtered := items[:0]
		for _, item := range items {
			if item.ProductID != productID {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	} else {
		for i, item := range items {
			if item.ProductID == productID {
				newQty := quantity
				if newQty > item.MaxStock {
					newQty = item.MaxStock
				}
				items[i].Quantity = newQty
				break
			}
		}
	}

	if appErr := s.save(ctx, userID, items); appErr != nil {
		return nil, appErr
	}
	return buildResponse(items), nil
}

// RemoveItem removes a specific item from the cart.
func (s *CartService) RemoveItem(ctx context.Context, userID, productID string) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	filtered := items[:0]
	for _, item := range items {
		if item.ProductID != productID {
			filtered = append(filtered, item)
		}
	}

	if appErr := s.save(ctx, userID, filtered); appErr != nil {
		return nil, appErr
	}
	return buildResponse(filtered), nil
}

// Clear empties the cart.
func (s *CartService) Clear(ctx context.Context, userID string) *types.AppError {
	if err := s.redis.Delete(ctx, cartKey(userID)); err != nil {
		return types.InternalError("impossible de vider le panier")
	}
	return nil
}

// Sync merges guest cart items into the server cart on login.
// Server-side items take priority on quantity for common products.
func (s *CartService) Sync(ctx context.Context, userID string, guestItems []model.CartItem) (*model.CartResponse, *types.AppError) {
	serverItems, appErr := s.load(ctx, userID)
	if appErr != nil {
		return nil, appErr
	}

	// Index server items by productId
	idx := make(map[string]int, len(serverItems))
	for i, item := range serverItems {
		idx[item.ProductID] = i
	}

	// Merge guest items that are not already in server cart
	for _, gItem := range guestItems {
		if _, exists := idx[gItem.ProductID]; !exists {
			serverItems = append(serverItems, gItem)
		}
	}

	if appErr := s.save(ctx, userID, serverItems); appErr != nil {
		return nil, appErr
	}
	return buildResponse(serverItems), nil
}

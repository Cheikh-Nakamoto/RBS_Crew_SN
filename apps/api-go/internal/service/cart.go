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
	cartTTL        = 30 * 24 * time.Hour
	guestCartTTL   = 7 * 24 * time.Hour
	cartKeyPrefix  = "cart:"
	guestKeyPrefix = "cart:guest:"
)

// ── Service ───────────────────────────────────────────────────────────────────

type CartService struct {
	redis *redisclient.Client
}

func NewCartService(redis *redisclient.Client) *CartService {
	return &CartService{redis: redis}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// cartKey construit la clé Redis du panier. Le préfixe des utilisateurs reste
// inchangé afin que les paniers déjà stockés restent valides.
func cartKey(owner types.CartOwner) string {
	if owner.Kind == types.OwnerGuest {
		return guestKeyPrefix + owner.ID
	}
	return cartKeyPrefix + owner.ID
}

// cartTTLFor : durée de vie plus courte pour les paniers anonymes, rafraîchie à
// chaque écriture — les paniers abandonnés expirent donc d'eux-mêmes.
func cartTTLFor(owner types.CartOwner) time.Duration {
	if owner.Kind == types.OwnerGuest {
		return guestCartTTL
	}
	return cartTTL
}

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

func (s *CartService) load(ctx context.Context, owner types.CartOwner) ([]model.CartItem, *types.AppError) {
	raw, err := s.redis.Get(ctx, cartKey(owner))
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

func (s *CartService) save(ctx context.Context, owner types.CartOwner, items []model.CartItem) *types.AppError {
	data, err := json.Marshal(items)
	if err != nil {
		return types.InternalError("impossible de sérialiser le panier")
	}
	if err := s.redis.Set(ctx, cartKey(owner), data, cartTTLFor(owner)); err != nil {
		return types.InternalError("impossible de sauvegarder le panier")
	}
	return nil
}

// ── Public Methods ────────────────────────────────────────────────────────────

// Get returns the current user cart.
func (s *CartService) Get(ctx context.Context, owner types.CartOwner) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, owner)
	if appErr != nil {
		return nil, appErr
	}
	return buildResponse(items), nil
}

// AddOrUpdateItem adds an item or increments its quantity (capped at maxStock).
func (s *CartService) AddOrUpdateItem(ctx context.Context, owner types.CartOwner, dto model.UpsertCartItemDTO) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, owner)
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

	if appErr := s.save(ctx, owner, items); appErr != nil {
		return nil, appErr
	}
	return buildResponse(items), nil
}

// UpdateQuantity sets the quantity of an item (quantity=0 removes it).
func (s *CartService) UpdateQuantity(ctx context.Context, owner types.CartOwner, productID string, quantity int) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, owner)
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

	if appErr := s.save(ctx, owner, items); appErr != nil {
		return nil, appErr
	}
	return buildResponse(items), nil
}

// RemoveItem removes a specific item from the cart.
func (s *CartService) RemoveItem(ctx context.Context, owner types.CartOwner, productID string) (*model.CartResponse, *types.AppError) {
	items, appErr := s.load(ctx, owner)
	if appErr != nil {
		return nil, appErr
	}

	filtered := items[:0]
	for _, item := range items {
		if item.ProductID != productID {
			filtered = append(filtered, item)
		}
	}

	if appErr := s.save(ctx, owner, filtered); appErr != nil {
		return nil, appErr
	}
	return buildResponse(filtered), nil
}

// Clear empties the cart.
func (s *CartService) Clear(ctx context.Context, owner types.CartOwner) *types.AppError {
	if err := s.redis.Delete(ctx, cartKey(owner)); err != nil {
		return types.InternalError("impossible de vider le panier")
	}
	return nil
}

// mergeItems ajoute les articles absents du panier cible. Les quantités ne sont
// jamais additionnées : si le produit est déjà au panier du compte, c'est cette
// quantité qui fait foi (pas de double comptage).
func mergeItems(target, incoming []model.CartItem) []model.CartItem {
	idx := make(map[string]struct{}, len(target))
	for _, item := range target {
		idx[item.ProductID] = struct{}{}
	}
	for _, item := range incoming {
		if _, exists := idx[item.ProductID]; !exists {
			target = append(target, item)
			idx[item.ProductID] = struct{}{}
		}
	}
	return target
}

// MergeGuestIntoUser verse le panier anonyme dans celui du compte puis supprime
// la clé invité. Appelé à la première requête panier portant à la fois un JWT
// valide et un cookie invité valide.
func (s *CartService) MergeGuestIntoUser(ctx context.Context, guestID, userID string) (*model.CartResponse, *types.AppError) {
	guestOwner := types.CartOwner{Kind: types.OwnerGuest, ID: guestID}
	userOwner := types.CartOwner{Kind: types.OwnerUser, ID: userID}

	guestItems, appErr := s.load(ctx, guestOwner)
	if appErr != nil {
		return nil, appErr
	}
	userItems, appErr := s.load(ctx, userOwner)
	if appErr != nil {
		return nil, appErr
	}

	if len(guestItems) > 0 {
		userItems = mergeItems(userItems, guestItems)
		if appErr := s.save(ctx, userOwner, userItems); appErr != nil {
			return nil, appErr
		}
	}

	// Best-effort : si la suppression échoue, la clé expirera d'elle-même et le
	// cookie est de toute façon effacé côté client.
	_ = s.redis.Delete(ctx, cartKey(guestOwner))

	return buildResponse(userItems), nil
}

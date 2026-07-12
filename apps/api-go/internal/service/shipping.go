package service

import (
	"context"
	"errors"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/types"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"
)

// ShippingOption is returned by Quote — one row per available shipping method.
type ShippingOption struct {
	MethodID         string            `json:"methodId"`
	MethodCode       string            `json:"methodCode"`
	Name             map[string]string `json:"name"` // locale → display name
	FlatFee          float64           `json:"flatFee"`
	Currency         string            `json:"currency"`
	IsFree           bool              `json:"isFree"`
	EstimatedDaysMin *int32            `json:"estimatedDaysMin,omitempty"`
	EstimatedDaysMax *int32            `json:"estimatedDaysMax,omitempty"`
}

type ShippingZoneResponse struct {
	ID         string            `json:"id"`
	Code       string            `json:"code"`
	IsDefault  bool              `json:"isDefault"`
	Priority   int32             `json:"priority"`
	Names      map[string]string `json:"names"`
}

type ShippingMethodResponse struct {
	ID               string            `json:"id"`
	Code             string            `json:"code"`
	IsPickup         bool              `json:"isPickup"`
	Enabled          bool              `json:"enabled"`
	EstimatedDaysMin *int32            `json:"estimatedDaysMin,omitempty"`
	EstimatedDaysMax *int32            `json:"estimatedDaysMax,omitempty"`
	Names            map[string]string `json:"names"`
}

type ShippingService struct {
	repo *repository.ShippingRepository
}

func NewShippingService(repo *repository.ShippingRepository) *ShippingService {
	return &ShippingService{repo: repo}
}

// ── Quote ─────────────────────────────────────────────────────────────────────

// Quote returns the available shipping options for the given country + order total.
// The orderTotal is calculated server-side — never trust a client-supplied value.
func (s *ShippingService) Quote(ctx context.Context, country string, orderTotal decimal.Decimal) ([]ShippingOption, *types.AppError) {
	rates, err := s.repo.GetRatesForCountry(ctx, country)
	if err != nil {
		return nil, types.InternalError("Failed to calculate shipping rates")
	}

	options := make([]ShippingOption, 0, len(rates))
	for _, rate := range rates {
		method, err := s.repo.GetMethodByID(ctx, rate.MethodId)
		if err != nil || !method.Enabled {
			continue
		}

		names, _ := s.repo.GetMethodTranslationMap(ctx, method.ID)

		flatFee, _ := rate.FlatFee.Float64()
		isFree := false
		if rate.FreeAbove.Valid && orderTotal.GreaterThanOrEqual(rate.FreeAbove.Decimal) {
			flatFee = 0
			isFree = true
		}

		options = append(options, ShippingOption{
			MethodID:         method.ID,
			MethodCode:       method.Code,
			Name:             names,
			FlatFee:          flatFee,
			Currency:         rate.Currency,
			IsFree:           isFree,
			EstimatedDaysMin: method.EstimatedDaysMin,
			EstimatedDaysMax: method.EstimatedDaysMax,
		})
	}

	return options, nil
}

// ── Zones ─────────────────────────────────────────────────────────────────────

func (s *ShippingService) ListZones(ctx context.Context) ([]ShippingZoneResponse, *types.AppError) {
	zones, err := s.repo.ListZones(ctx)
	if err != nil {
		return nil, types.InternalError("Failed to fetch shipping zones")
	}
	result := make([]ShippingZoneResponse, 0, len(zones))
	for _, z := range zones {
		names, _ := s.repo.GetZoneTranslationMap(ctx, z.ID)
		result = append(result, ShippingZoneResponse{
			ID:        z.ID,
			Code:      z.Code,
			IsDefault: z.IsDefault,
			Priority:  z.Priority,
			Names:     names,
		})
	}
	return result, nil
}

func (s *ShippingService) CreateZone(ctx context.Context, code string, isDefault bool, priority int32, names map[string]string) (*ShippingZoneResponse, *types.AppError) {
	z, err := s.repo.CreateZone(ctx, db.CreateShippingZoneParams{
		ID:        uuid.New().String(),
		Code:      code,
		IsDefault: isDefault,
		Priority:  priority,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create shipping zone")
	}

	for locale, name := range names {
		_, _ = s.repo.UpsertZoneTranslation(ctx, db.UpsertShippingZoneTranslationParams{
			ID:     uuid.New().String(),
			ZoneId: z.ID,
			Locale: db.Locale(locale),
			Name:   name,
		})
	}

	finalNames, _ := s.repo.GetZoneTranslationMap(ctx, z.ID)
	return &ShippingZoneResponse{ID: z.ID, Code: z.Code, IsDefault: z.IsDefault, Priority: z.Priority, Names: finalNames}, nil
}

func (s *ShippingService) UpdateZone(ctx context.Context, id, code string, isDefault bool, priority int32, names map[string]string) (*ShippingZoneResponse, *types.AppError) {
	z, err := s.repo.UpdateZone(ctx, db.UpdateShippingZoneParams{
		ID:        id,
		Code:      code,
		IsDefault: isDefault,
		Priority:  priority,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Shipping zone not found")
		}
		return nil, types.InternalError("Failed to update shipping zone")
	}

	for locale, name := range names {
		_, _ = s.repo.UpsertZoneTranslation(ctx, db.UpsertShippingZoneTranslationParams{
			ID:     uuid.New().String(),
			ZoneId: z.ID,
			Locale: db.Locale(locale),
			Name:   name,
		})
	}

	finalNames, _ := s.repo.GetZoneTranslationMap(ctx, z.ID)
	return &ShippingZoneResponse{ID: z.ID, Code: z.Code, IsDefault: z.IsDefault, Priority: z.Priority, Names: finalNames}, nil
}

func (s *ShippingService) DeleteZone(ctx context.Context, id string) *types.AppError {
	if err := s.repo.DeleteZone(ctx, id); err != nil {
		return types.InternalError("Failed to delete shipping zone")
	}
	return nil
}

// ── Methods ───────────────────────────────────────────────────────────────────

func (s *ShippingService) ListMethods(ctx context.Context) ([]ShippingMethodResponse, *types.AppError) {
	methods, err := s.repo.ListMethods(ctx)
	if err != nil {
		return nil, types.InternalError("Failed to fetch shipping methods")
	}
	result := make([]ShippingMethodResponse, 0, len(methods))
	for _, m := range methods {
		names, _ := s.repo.GetMethodTranslationMap(ctx, m.ID)
		result = append(result, toMethodResponse(&m, names))
	}
	return result, nil
}

func (s *ShippingService) CreateMethod(ctx context.Context, code string, isPickup, enabled bool, minDays, maxDays *int32, names map[string]string) (*ShippingMethodResponse, *types.AppError) {
	m, err := s.repo.CreateMethod(ctx, db.CreateShippingMethodParams{
		ID:               uuid.New().String(),
		Code:             code,
		IsPickup:         isPickup,
		Enabled:          enabled,
		EstimatedDaysMin: minDays,
		EstimatedDaysMax: maxDays,
	})
	if err != nil {
		return nil, types.InternalError("Failed to create shipping method")
	}
	for locale, name := range names {
		_, _ = s.repo.UpsertMethodTranslation(ctx, db.UpsertShippingMethodTranslationParams{
			ID:       uuid.New().String(),
			MethodId: m.ID,
			Locale:   db.Locale(locale),
			Name:     name,
		})
	}
	finalNames, _ := s.repo.GetMethodTranslationMap(ctx, m.ID)
	resp := toMethodResponse(m, finalNames)
	return &resp, nil
}

func (s *ShippingService) UpdateMethod(ctx context.Context, id, code string, isPickup, enabled bool, minDays, maxDays *int32, names map[string]string) (*ShippingMethodResponse, *types.AppError) {
	m, err := s.repo.UpdateMethod(ctx, db.UpdateShippingMethodParams{
		ID:               id,
		Code:             code,
		IsPickup:         isPickup,
		Enabled:          enabled,
		EstimatedDaysMin: minDays,
		EstimatedDaysMax: maxDays,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, types.NotFound("Shipping method not found")
		}
		return nil, types.InternalError("Failed to update shipping method")
	}
	for locale, name := range names {
		_, _ = s.repo.UpsertMethodTranslation(ctx, db.UpsertShippingMethodTranslationParams{
			ID:       uuid.New().String(),
			MethodId: m.ID,
			Locale:   db.Locale(locale),
			Name:     name,
		})
	}
	finalNames, _ := s.repo.GetMethodTranslationMap(ctx, m.ID)
	resp := toMethodResponse(m, finalNames)
	return &resp, nil
}

func (s *ShippingService) DeleteMethod(ctx context.Context, id string) *types.AppError {
	if err := s.repo.DeleteMethod(ctx, id); err != nil {
		return types.InternalError("Failed to delete shipping method")
	}
	return nil
}

// ── Rates ─────────────────────────────────────────────────────────────────────

func (s *ShippingService) UpsertRate(ctx context.Context, zoneID, methodID string, flatFee float64, freeAbove *float64, currency string) *types.AppError {
	params := db.UpsertShippingRateParams{
		ID:       uuid.New().String(),
		ZoneId:   zoneID,
		MethodId: methodID,
		FlatFee:  decimal.NewFromFloat(flatFee),
		Currency: currency,
	}
	if freeAbove != nil {
		params.FreeAbove = decimal.NewNullDecimal(decimal.NewFromFloat(*freeAbove))
	}
	if _, err := s.repo.UpsertRate(ctx, params); err != nil {
		return types.InternalError("Failed to upsert shipping rate")
	}
	return nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func toMethodResponse(m *db.ShippingMethod, names map[string]string) ShippingMethodResponse {
	return ShippingMethodResponse{
		ID:               m.ID,
		Code:             m.Code,
		IsPickup:         m.IsPickup,
		Enabled:          m.Enabled,
		EstimatedDaysMin: m.EstimatedDaysMin,
		EstimatedDaysMax: m.EstimatedDaysMax,
		Names:            names,
	}
}

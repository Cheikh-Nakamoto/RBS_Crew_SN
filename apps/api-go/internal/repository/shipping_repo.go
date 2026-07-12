package repository

import (
	"context"

	db "github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/db/queries"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type ShippingRepository struct {
	q    *db.Queries
	pool *pgxpool.Pool
}

func NewShippingRepository(pool *pgxpool.Pool) *ShippingRepository {
	return &ShippingRepository{q: db.New(pool), pool: pool}
}

// ── Zones ─────────────────────────────────────────────────────────────────────

func (r *ShippingRepository) ListZones(ctx context.Context) ([]db.ShippingZone, error) {
	return r.q.ListShippingZones(ctx)
}

func (r *ShippingRepository) GetZoneByID(ctx context.Context, id string) (*db.ShippingZone, error) {
	z, err := r.q.GetShippingZoneByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &z, nil
}

func (r *ShippingRepository) CreateZone(ctx context.Context, params db.CreateShippingZoneParams) (*db.ShippingZone, error) {
	z, err := r.q.CreateShippingZone(ctx, params)
	if err != nil {
		return nil, err
	}
	return &z, nil
}

func (r *ShippingRepository) UpdateZone(ctx context.Context, params db.UpdateShippingZoneParams) (*db.ShippingZone, error) {
	z, err := r.q.UpdateShippingZone(ctx, params)
	if err != nil {
		return nil, err
	}
	return &z, nil
}

func (r *ShippingRepository) DeleteZone(ctx context.Context, id string) error {
	return r.q.DeleteShippingZone(ctx, id)
}

func (r *ShippingRepository) ListZoneRules(ctx context.Context, zoneID string) ([]db.ShippingZoneRule, error) {
	return r.q.ListShippingZoneRules(ctx, zoneID)
}

func (r *ShippingRepository) CreateZoneRule(ctx context.Context, params db.CreateShippingZoneRuleParams) (*db.ShippingZoneRule, error) {
	z, err := r.q.CreateShippingZoneRule(ctx, params)
	if err != nil {
		return nil, err
	}
	return &z, nil
}

func (r *ShippingRepository) DeleteZoneRule(ctx context.Context, id string) error {
	return r.q.DeleteShippingZoneRule(ctx, id)
}

// ── Methods ───────────────────────────────────────────────────────────────────

func (r *ShippingRepository) ListMethods(ctx context.Context) ([]db.ShippingMethod, error) {
	return r.q.ListShippingMethods(ctx)
}

func (r *ShippingRepository) GetMethodByID(ctx context.Context, id string) (*db.ShippingMethod, error) {
	m, err := r.q.GetShippingMethodByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ShippingRepository) CreateMethod(ctx context.Context, params db.CreateShippingMethodParams) (*db.ShippingMethod, error) {
	m, err := r.q.CreateShippingMethod(ctx, params)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ShippingRepository) UpdateMethod(ctx context.Context, params db.UpdateShippingMethodParams) (*db.ShippingMethod, error) {
	m, err := r.q.UpdateShippingMethod(ctx, params)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ShippingRepository) DeleteMethod(ctx context.Context, id string) error {
	return r.q.DeleteShippingMethod(ctx, id)
}

// ── Rates ─────────────────────────────────────────────────────────────────────

func (r *ShippingRepository) ListRates(ctx context.Context, zoneID string) ([]db.ShippingRate, error) {
	return r.q.ListShippingRates(ctx, zoneID)
}

func (r *ShippingRepository) UpsertRate(ctx context.Context, params db.UpsertShippingRateParams) (*db.ShippingRate, error) {
	rate, err := r.q.UpsertShippingRate(ctx, params)
	if err != nil {
		return nil, err
	}
	return &rate, nil
}

// ── Quote helpers ─────────────────────────────────────────────────────────────

// GetRatesForCountry returns shipping rates available for a given country.
// Falls back to default zone rates when no country-specific zone matches.
func (r *ShippingRepository) GetRatesForCountry(ctx context.Context, country string) ([]db.ShippingRate, error) {
	rates, err := r.q.GetShippingRatesForCountry(ctx, country)
	if err != nil {
		return nil, err
	}
	if len(rates) > 0 {
		return rates, nil
	}
	// Fallback: default zone
	return r.q.GetDefaultShippingRates(ctx)
}

// GetMethodTranslations returns translations for a shipping method.
func (r *ShippingRepository) GetMethodTranslations(ctx context.Context, methodID string) ([]db.ShippingMethodTranslation, error) {
	return r.q.ListShippingMethodTranslations(ctx, methodID)
}

// GetZoneTranslations returns translations for a shipping zone.
func (r *ShippingRepository) GetZoneTranslations(ctx context.Context, zoneID string) ([]db.ShippingZoneTranslation, error) {
	return r.q.ListShippingZoneTranslations(ctx, zoneID)
}

// UpsertZoneTranslation upserts a zone translation.
func (r *ShippingRepository) UpsertZoneTranslation(ctx context.Context, params db.UpsertShippingZoneTranslationParams) (*db.ShippingZoneTranslation, error) {
	t, err := r.q.UpsertShippingZoneTranslation(ctx, params)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// UpsertMethodTranslation upserts a method translation.
func (r *ShippingRepository) UpsertMethodTranslation(ctx context.Context, params db.UpsertShippingMethodTranslationParams) (*db.ShippingMethodTranslation, error) {
	t, err := r.q.UpsertShippingMethodTranslation(ctx, params)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetZoneTranslationMap returns a map[locale]name for a zone.
func (r *ShippingRepository) GetZoneTranslationMap(ctx context.Context, zoneID string) (map[string]string, error) {
	rows, err := r.q.ListShippingZoneTranslations(ctx, zoneID)
	if err != nil {
		return nil, err
	}
	m := make(map[string]string, len(rows))
	for _, t := range rows {
		m[string(t.Locale)] = t.Name
	}
	return m, nil
}

// GetMethodTranslationMap returns a map[locale]name for a method.
func (r *ShippingRepository) GetMethodTranslationMap(ctx context.Context, methodID string) (map[string]string, error) {
	rows, err := r.q.ListShippingMethodTranslations(ctx, methodID)
	if err != nil {
		return nil, err
	}
	m := make(map[string]string, len(rows))
	for _, t := range rows {
		m[string(t.Locale)] = t.Name
	}
	return m, nil
}

// Pool exposes the connection pool for transaction control.
func (r *ShippingRepository) Pool() *pgxpool.Pool { return r.pool }

// decimalToFloat64 converts decimal.Decimal to float64 for use in service layer.
func DecimalToFloat64(d decimal.Decimal) float64 {
	f, _ := d.Float64()
	return f
}

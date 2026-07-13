package service

import (
	"context"
	"testing"

	"github.com/Cheikh-Nakamoto/RBS_Crew_SN/apps/api-go/internal/repository"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

// truncateShipping clears shipping tables between tests.
// CASCADE handles ShippingZoneRule, ShippingZoneTranslation, ShippingMethodTranslation, ShippingRate.
func truncateShipping(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	if _, err := pool.Exec(ctx,
		`TRUNCATE TABLE "ShippingRate","ShippingZoneRule","ShippingMethodTranslation","ShippingMethod","ShippingZoneTranslation","ShippingZone" RESTART IDENTITY CASCADE`,
	); err != nil {
		t.Logf("truncateShipping warning: %v", err)
	}
}

// newShippingService returns a ShippingService backed by the shared testcontainer pool.
func newShippingService(t *testing.T) (*ShippingService, *pgxpool.Pool) {
	t.Helper()
	pool := getTestPool(t)
	truncateShipping(t, pool)
	return NewShippingService(repository.NewShippingRepository(pool)), pool
}

// seedCountryZone inserts a zone + rule for a specific country, one method, and one rate.
// Returns (zoneID, methodID).
func seedCountryZone(t *testing.T, pool *pgxpool.Pool, country string, flatFee string, freeAbove *string) (string, string) {
	t.Helper()

	zoneID := uuid.NewString()
	mustExec(t, pool,
		`INSERT INTO "ShippingZone" ("id","code","isDefault","priority","createdAt","updatedAt")
		 VALUES ($1,$2,false,10,NOW(),NOW())`,
		zoneID, "ZONE_"+country,
	)

	ruleID := uuid.NewString()
	mustExec(t, pool,
		`INSERT INTO "ShippingZoneRule" ("id","zoneId","country") VALUES ($1,$2,$3)`,
		ruleID, zoneID, country,
	)

	methodID := uuid.NewString()
	mustExec(t, pool,
		`INSERT INTO "ShippingMethod" ("id","code","isPickup","enabled","estimatedDaysMin","estimatedDaysMax","createdAt","updatedAt")
		 VALUES ($1,'STANDARD_'||$2,false,true,2,5,NOW(),NOW())`,
		methodID, country,
	)

	rateID := uuid.NewString()
	if freeAbove != nil {
		mustExec(t, pool,
			`INSERT INTO "ShippingRate" ("id","zoneId","methodId","flatFee","freeAbove","currency")
			 VALUES ($1,$2,$3,$4,$5,'XOF')`,
			rateID, zoneID, methodID, flatFee, *freeAbove,
		)
	} else {
		mustExec(t, pool,
			`INSERT INTO "ShippingRate" ("id","zoneId","methodId","flatFee","currency")
			 VALUES ($1,$2,$3,$4,'XOF')`,
			rateID, zoneID, methodID, flatFee,
		)
	}

	return zoneID, methodID
}

// seedDefaultZone inserts a default zone (no country rules) + method + rate.
func seedDefaultZone(t *testing.T, pool *pgxpool.Pool, flatFee string) (string, string) {
	t.Helper()

	zoneID := uuid.NewString()
	mustExec(t, pool,
		`INSERT INTO "ShippingZone" ("id","code","isDefault","priority","createdAt","updatedAt")
		 VALUES ($1,'DEFAULT_ZONE',true,0,NOW(),NOW())`,
		zoneID,
	)

	methodID := uuid.NewString()
	mustExec(t, pool,
		`INSERT INTO "ShippingMethod" ("id","code","isPickup","enabled","createdAt","updatedAt")
		 VALUES ($1,'DEFAULT_SHIPPING',false,true,NOW(),NOW())`,
		methodID,
	)

	mustExec(t, pool,
		`INSERT INTO "ShippingRate" ("id","zoneId","methodId","flatFee","currency")
		 VALUES ($1,$2,$3,$4,'XOF')`,
		uuid.NewString(), zoneID, methodID, flatFee,
	)

	return zoneID, methodID
}

// TestShippingService_ZoneCRUD verifies create → list → update → delete for zones.
func TestShippingService_ZoneCRUD(t *testing.T) {
	svc, _ := newShippingService(t)
	ctx := context.Background()

	zone, appErr := svc.CreateZone(ctx, "SN_DAKAR", false, 10, map[string]string{"fr": "Dakar", "en": "Dakar"})
	if appErr != nil {
		t.Fatalf("CreateZone: %v", appErr)
	}
	if zone.Code != "SN_DAKAR" {
		t.Errorf("code = %s want SN_DAKAR", zone.Code)
	}
	if zone.Names["fr"] != "Dakar" {
		t.Errorf("name fr = %q want Dakar", zone.Names["fr"])
	}

	list, appErr := svc.ListZones(ctx)
	if appErr != nil {
		t.Fatalf("ListZones: %v", appErr)
	}
	if len(list) != 1 {
		t.Fatalf("list len = %d want 1", len(list))
	}

	updated, appErr := svc.UpdateZone(ctx, zone.ID, "SN_DAKAR_UPDATED", true, 5, map[string]string{"fr": "Grand Dakar"})
	if appErr != nil {
		t.Fatalf("UpdateZone: %v", appErr)
	}
	if updated.Code != "SN_DAKAR_UPDATED" || !updated.IsDefault {
		t.Errorf("update mismatch: %+v", updated)
	}

	if appErr := svc.DeleteZone(ctx, zone.ID); appErr != nil {
		t.Fatalf("DeleteZone: %v", appErr)
	}

	after, appErr := svc.ListZones(ctx)
	if appErr != nil {
		t.Fatalf("ListZones after delete: %v", appErr)
	}
	if len(after) != 0 {
		t.Errorf("expected 0 zones after delete, got %d", len(after))
	}
	t.Log("✓ zone CRUD")
}

// TestShippingService_MethodCRUD verifies create → list → update → delete for methods.
func TestShippingService_MethodCRUD(t *testing.T) {
	svc, _ := newShippingService(t)
	ctx := context.Background()

	min2, max5 := int32(2), int32(5)
	m, appErr := svc.CreateMethod(ctx, "STANDARD", false, true, &min2, &max5, map[string]string{"fr": "Livraison standard"})
	if appErr != nil {
		t.Fatalf("CreateMethod: %v", appErr)
	}
	if m.Code != "STANDARD" || !m.Enabled {
		t.Errorf("create mismatch: %+v", m)
	}
	if *m.EstimatedDaysMin != 2 || *m.EstimatedDaysMax != 5 {
		t.Errorf("days min/max wrong: %v / %v", m.EstimatedDaysMin, m.EstimatedDaysMax)
	}

	list, appErr := svc.ListMethods(ctx)
	if appErr != nil {
		t.Fatalf("ListMethods: %v", appErr)
	}
	if len(list) != 1 {
		t.Fatalf("list len = %d want 1", len(list))
	}

	updated, appErr := svc.UpdateMethod(ctx, m.ID, "EXPRESS", false, true, nil, nil, map[string]string{"fr": "Livraison express"})
	if appErr != nil {
		t.Fatalf("UpdateMethod: %v", appErr)
	}
	if updated.Code != "EXPRESS" {
		t.Errorf("code after update = %s want EXPRESS", updated.Code)
	}

	if appErr := svc.DeleteMethod(ctx, m.ID); appErr != nil {
		t.Fatalf("DeleteMethod: %v", appErr)
	}
	after, _ := svc.ListMethods(ctx)
	if len(after) != 0 {
		t.Errorf("expected 0 methods after delete, got %d", len(after))
	}
	t.Log("✓ method CRUD")
}

// TestShippingService_Quote_StandardFee verifies flatFee is returned when order total
// is below the freeAbove threshold.
func TestShippingService_Quote_StandardFee(t *testing.T) {
	svc, pool := newShippingService(t)
	ctx := context.Background()

	freeAbove := "50000"
	_, _ = seedCountryZone(t, pool, "SN", "2500", &freeAbove)

	opts, appErr := svc.Quote(ctx, "SN", decimal.NewFromInt(10000))
	if appErr != nil {
		t.Fatalf("Quote: %v", appErr)
	}
	if len(opts) == 0 {
		t.Fatal("expected at least 1 shipping option, got 0")
	}
	opt := opts[0]
	if opt.IsFree {
		t.Error("expected IsFree=false for total below threshold")
	}
	if opt.FlatFee != 2500 {
		t.Errorf("flatFee = %v want 2500", opt.FlatFee)
	}
	if opt.Currency != "XOF" {
		t.Errorf("currency = %s want XOF", opt.Currency)
	}
	t.Logf("✓ standard fee: flatFee=%v isFree=%v", opt.FlatFee, opt.IsFree)
}

// TestShippingService_Quote_FreeAboveThreshold verifies that when the order total meets
// or exceeds freeAbove, the fee is 0 and IsFree is true.
func TestShippingService_Quote_FreeAboveThreshold(t *testing.T) {
	svc, pool := newShippingService(t)
	ctx := context.Background()

	freeAbove := "50000"
	_, _ = seedCountryZone(t, pool, "SN", "2500", &freeAbove)

	// Exactly at threshold
	opts, appErr := svc.Quote(ctx, "SN", decimal.NewFromInt(50000))
	if appErr != nil {
		t.Fatalf("Quote at threshold: %v", appErr)
	}
	if len(opts) == 0 {
		t.Fatal("expected options, got 0")
	}
	if !opts[0].IsFree {
		t.Error("expected IsFree=true at threshold")
	}
	if opts[0].FlatFee != 0 {
		t.Errorf("flatFee should be 0 when free, got %v", opts[0].FlatFee)
	}

	// Above threshold
	opts2, appErr := svc.Quote(ctx, "SN", decimal.NewFromInt(75000))
	if appErr != nil {
		t.Fatalf("Quote above threshold: %v", appErr)
	}
	if !opts2[0].IsFree {
		t.Error("expected IsFree=true above threshold")
	}
	t.Log("✓ free shipping threshold")
}

// TestShippingService_Quote_DisabledMethodExcluded verifies that disabled methods
// are not returned in the quote.
func TestShippingService_Quote_DisabledMethodExcluded(t *testing.T) {
	svc, pool := newShippingService(t)
	ctx := context.Background()

	_, methodID := seedCountryZone(t, pool, "SN", "2500", nil)

	// Disable the method
	mustExec(t, pool, `UPDATE "ShippingMethod" SET "enabled"=false WHERE "id"=$1`, methodID)

	opts, appErr := svc.Quote(ctx, "SN", decimal.NewFromInt(10000))
	if appErr != nil {
		t.Fatalf("Quote: %v", appErr)
	}
	if len(opts) != 0 {
		t.Errorf("expected 0 options for disabled method, got %d", len(opts))
	}
	t.Log("✓ disabled method excluded from quote")
}

// TestShippingService_Quote_DefaultZoneFallback verifies that when no zone rule
// matches the requested country, the default zone's rates are returned.
func TestShippingService_Quote_DefaultZoneFallback(t *testing.T) {
	svc, pool := newShippingService(t)
	ctx := context.Background()

	// SN has an explicit zone; CI falls back to default
	freeAbove := "100000"
	_, _ = seedCountryZone(t, pool, "SN", "2500", &freeAbove)
	_, _ = seedDefaultZone(t, pool, "4000")

	// CI not in any zone → should use default zone
	opts, appErr := svc.Quote(ctx, "CI", decimal.NewFromInt(10000))
	if appErr != nil {
		t.Fatalf("Quote(CI): %v", appErr)
	}
	if len(opts) == 0 {
		t.Fatal("expected default zone options for unknown country, got 0")
	}
	if opts[0].FlatFee != 4000 {
		t.Errorf("default zone flatFee = %v want 4000", opts[0].FlatFee)
	}

	// SN still hits its own zone (not the default)
	snOpts, appErr := svc.Quote(ctx, "SN", decimal.NewFromInt(10000))
	if appErr != nil {
		t.Fatalf("Quote(SN): %v", appErr)
	}
	if len(snOpts) == 0 {
		t.Fatal("expected SN zone options, got 0")
	}
	if snOpts[0].FlatFee != 2500 {
		t.Errorf("SN flatFee = %v want 2500", snOpts[0].FlatFee)
	}
	t.Logf("✓ default zone fallback: CI=%v SN=%v", opts[0].FlatFee, snOpts[0].FlatFee)
}

// TestShippingService_UpsertRate verifies that upsert creates on first call and
// updates (not duplicates) on second call.
func TestShippingService_UpsertRate(t *testing.T) {
	svc, pool := newShippingService(t)
	ctx := context.Background()

	_, methodID := seedCountryZone(t, pool, "SN", "2500", nil)

	// Get the zone ID from DB
	var zoneID string
	if err := pool.QueryRow(ctx, `SELECT "id" FROM "ShippingZone" WHERE "code"='ZONE_SN'`).Scan(&zoneID); err != nil {
		t.Fatalf("get zone: %v", err)
	}

	// Upsert with new flatFee=3000
	freeAbove := float64(50000)
	if appErr := svc.UpsertRate(ctx, zoneID, methodID, 3000, &freeAbove, "XOF"); appErr != nil {
		t.Fatalf("UpsertRate: %v", appErr)
	}

	// Rate count should still be 1 (upsert, not insert)
	var count int
	if err := pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM "ShippingRate" WHERE "zoneId"=$1 AND "methodId"=$2`,
		zoneID, methodID,
	).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 rate row after upsert, got %d", count)
	}

	// Quote should now reflect the upserted fee
	opts, appErr := svc.Quote(ctx, "SN", decimal.NewFromInt(10000))
	if appErr != nil {
		t.Fatalf("Quote after upsert: %v", appErr)
	}
	if len(opts) == 0 || opts[0].FlatFee != 3000 {
		t.Errorf("expected flatFee=3000 after upsert, got %v", opts)
	}
	t.Log("✓ rate upsert: second call updates, not duplicates")
}

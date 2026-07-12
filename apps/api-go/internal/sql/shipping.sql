-- name: ListShippingZones :many
SELECT * FROM "ShippingZone" ORDER BY "priority" ASC, "code" ASC;

-- name: GetShippingZoneByID :one
SELECT * FROM "ShippingZone" WHERE "id" = $1;

-- name: CreateShippingZone :one
INSERT INTO "ShippingZone" ("id", "code", "isDefault", "priority", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, NOW(), NOW())
RETURNING *;

-- name: UpdateShippingZone :one
UPDATE "ShippingZone"
SET "code" = $2, "isDefault" = $3, "priority" = $4, "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteShippingZone :exec
DELETE FROM "ShippingZone" WHERE "id" = $1;

-- name: ListShippingZoneTranslations :many
SELECT * FROM "ShippingZoneTranslation" WHERE "zoneId" = $1;

-- name: UpsertShippingZoneTranslation :one
INSERT INTO "ShippingZoneTranslation" ("id", "zoneId", "locale", "name")
VALUES ($1, $2, $3, $4)
ON CONFLICT ("zoneId", "locale") DO UPDATE SET "name" = EXCLUDED."name"
RETURNING *;

-- name: ListShippingZoneRules :many
SELECT * FROM "ShippingZoneRule" WHERE "zoneId" = $1;

-- name: CreateShippingZoneRule :one
INSERT INTO "ShippingZoneRule" ("id", "zoneId", "country", "region", "postalCodePattern")
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: DeleteShippingZoneRule :exec
DELETE FROM "ShippingZoneRule" WHERE "id" = $1;

-- name: ListShippingMethods :many
SELECT * FROM "ShippingMethod" ORDER BY "code" ASC;

-- name: GetShippingMethodByID :one
SELECT * FROM "ShippingMethod" WHERE "id" = $1;

-- name: CreateShippingMethod :one
INSERT INTO "ShippingMethod" ("id", "code", "isPickup", "enabled", "estimatedDaysMin", "estimatedDaysMax", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
RETURNING *;

-- name: UpdateShippingMethod :one
UPDATE "ShippingMethod"
SET "code" = $2, "isPickup" = $3, "enabled" = $4,
    "estimatedDaysMin" = $5, "estimatedDaysMax" = $6, "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteShippingMethod :exec
DELETE FROM "ShippingMethod" WHERE "id" = $1;

-- name: ListShippingMethodTranslations :many
SELECT * FROM "ShippingMethodTranslation" WHERE "methodId" = $1;

-- name: UpsertShippingMethodTranslation :one
INSERT INTO "ShippingMethodTranslation" ("id", "methodId", "locale", "name", "description")
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT ("methodId", "locale") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description"
RETURNING *;

-- name: ListShippingRates :many
SELECT * FROM "ShippingRate" WHERE "zoneId" = $1;

-- name: UpsertShippingRate :one
INSERT INTO "ShippingRate" ("id", "zoneId", "methodId", "flatFee", "freeAbove", "currency")
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT ("zoneId", "methodId") DO UPDATE
  SET "flatFee" = EXCLUDED."flatFee", "freeAbove" = EXCLUDED."freeAbove", "currency" = EXCLUDED."currency"
RETURNING *;

-- name: GetShippingRatesForCountry :many
-- Returns all enabled ShippingRates for zones matching the given country.
SELECT sr.*
FROM "ShippingRate" sr
JOIN "ShippingMethod" sm ON sm."id" = sr."methodId"
JOIN "ShippingZone" sz ON sz."id" = sr."zoneId"
JOIN "ShippingZoneRule" szr ON szr."zoneId" = sz."id"
WHERE sm."enabled" = true
  AND szr."country" = $1
ORDER BY sz."priority" ASC, sm."code" ASC;

-- name: GetDefaultShippingRates :many
-- Returns all enabled ShippingRates for the default zone (fallback).
SELECT sr.*
FROM "ShippingRate" sr
JOIN "ShippingMethod" sm ON sm."id" = sr."methodId"
JOIN "ShippingZone" sz ON sz."id" = sr."zoneId"
WHERE sm."enabled" = true
  AND sz."isDefault" = true
ORDER BY sm."code" ASC;

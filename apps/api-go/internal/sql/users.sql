-- name: ListUsers :many
SELECT "id", "email", "firstName", "lastName", "role", "preferredLocale", "phone", "createdAt",
       "emailVerified",
       COUNT(*) OVER() AS total_count
FROM "User"
WHERE (sqlc.narg('search')::text IS NULL OR
       "email" ILIKE '%' || sqlc.narg('search')::text || '%' OR
       "firstName" ILIKE '%' || sqlc.narg('search')::text || '%' OR
       "lastName" ILIKE '%' || sqlc.narg('search')::text || '%')
ORDER BY "createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetUserByIDFull :one
SELECT "id", "email", "firstName", "lastName", "role", "preferredLocale", "phone", "createdAt",
       "artistClaimStatus", "emailVerified"
FROM "User" WHERE "id" = $1;

-- name: UpdateUser :one
UPDATE "User"
SET "firstName" = COALESCE(sqlc.narg('first_name'), "firstName"),
    "lastName" = COALESCE(sqlc.narg('last_name'), "lastName"),
    "phone" = COALESCE(sqlc.narg('phone'), "phone"),
    "role" = COALESCE(sqlc.narg('role')::"UserRole", "role"),
    "preferredLocale" = COALESCE(sqlc.narg('preferred_locale')::"Locale", "preferredLocale"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING "id", "email", "firstName", "lastName", "role", "preferredLocale", "phone", "createdAt";

-- name: DeleteUser :exec
DELETE FROM "User" WHERE "id" = $1;

-- name: GetUserAddresses :many
SELECT * FROM "Address"
WHERE "userId" = $1
ORDER BY "isDefault" DESC, "id" ASC;

-- name: GetAddressByID :one
SELECT * FROM "Address" WHERE "id" = $1;

-- name: CreateAddress :one
INSERT INTO "Address" ("id", "userId", "label", "firstName", "lastName", "company", "line1", "line2", "city", "postalCode", "country", "isDefault")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: UpdateAddress :one
UPDATE "Address"
SET "label" = sqlc.narg('label'),
    "firstName" = COALESCE(sqlc.narg('first_name'), "firstName"),
    "lastName" = COALESCE(sqlc.narg('last_name'), "lastName"),
    "company" = sqlc.narg('company'),
    "line1" = COALESCE(sqlc.narg('line1'), "line1"),
    "line2" = sqlc.narg('line2'),
    "city" = COALESCE(sqlc.narg('city'), "city"),
    "postalCode" = COALESCE(sqlc.narg('postal_code'), "postalCode"),
    "country" = COALESCE(sqlc.narg('country'), "country"),
    "isDefault" = COALESCE(sqlc.narg('is_default')::bool, "isDefault")
WHERE "id" = $1
RETURNING *;

-- name: DeleteAddress :exec
DELETE FROM "Address" WHERE "id" = $1;

-- name: UnsetDefaultAddresses :exec
UPDATE "Address" SET "isDefault" = false WHERE "userId" = $1;

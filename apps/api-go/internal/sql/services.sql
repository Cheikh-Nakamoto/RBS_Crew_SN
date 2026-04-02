-- name: ListServices :many
SELECT s.*, COUNT(*) OVER() AS total_count
FROM "Service" s
WHERE s."status" = 'PUBLISHED'::"ProductStatus"
ORDER BY s."menuOrder" ASC, s."createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetServiceBySlug :one
SELECT * FROM "Service" WHERE "slug" = $1;

-- name: GetServiceByID :one
SELECT * FROM "Service" WHERE "id" = $1;

-- name: GetServiceTranslations :many
SELECT * FROM "ServiceTranslation" WHERE "serviceId" = $1;

-- name: CreateService :one
INSERT INTO "Service" ("id", "slug", "icon", "status", "menuOrder", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
RETURNING *;

-- name: UpsertServiceTranslation :one
INSERT INTO "ServiceTranslation" ("id", "serviceId", "locale", "title", "description", "metaTitle", "metaDescription")
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT ("serviceId", "locale") DO UPDATE
  SET "title" = EXCLUDED."title", "description" = EXCLUDED."description",
      "metaTitle" = EXCLUDED."metaTitle", "metaDescription" = EXCLUDED."metaDescription"
RETURNING *;

-- name: UpdateService :one
UPDATE "Service"
SET "icon" = COALESCE(sqlc.narg('icon'), "icon"),
    "status" = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "menuOrder" = COALESCE(sqlc.narg('menu_order')::int, "menuOrder"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteService :exec
DELETE FROM "Service" WHERE "id" = $1;

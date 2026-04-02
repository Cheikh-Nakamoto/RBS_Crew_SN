-- name: ListFestivalEditions :many
SELECT f.*, COUNT(*) OVER() AS total_count
FROM "FestivalEdition" f
WHERE f."status" = 'PUBLISHED'::"ProductStatus"
ORDER BY f."year" DESC, f."editionNumber" DESC
LIMIT $1 OFFSET $2;

-- name: GetFestivalBySlug :one
SELECT * FROM "FestivalEdition" WHERE "slug" = $1;

-- name: GetFestivalByID :one
SELECT * FROM "FestivalEdition" WHERE "id" = $1;

-- name: GetFestivalTranslations :many
SELECT * FROM "FestivalTranslation" WHERE "festivalEditionId" = $1;

-- name: CreateFestivalEdition :one
INSERT INTO "FestivalEdition" ("id", "slug", "editionNumber", "year", "city", "country", "status", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
RETURNING *;

-- name: UpsertFestivalTranslation :one
INSERT INTO "FestivalTranslation" ("id", "festivalEditionId", "locale", "themeName", "summary", "content")
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT ("festivalEditionId", "locale") DO UPDATE
  SET "themeName" = EXCLUDED."themeName", "summary" = EXCLUDED."summary", "content" = EXCLUDED."content"
RETURNING *;

-- name: UpdateFestivalEdition :one
UPDATE "FestivalEdition"
SET "city" = COALESCE(sqlc.narg('city'), "city"),
    "country" = COALESCE(sqlc.narg('country'), "country"),
    "status" = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteFestivalEdition :exec
DELETE FROM "FestivalEdition" WHERE "id" = $1;

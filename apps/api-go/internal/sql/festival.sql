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
INSERT INTO "FestivalEdition" (
    "id", "slug", "editionNumber", "year", "city", "country", "status",
    "mainImage", "heroImage", "gallery", "typography",
    "startDate", "endDate", "venue", "venueAddress", "ticketUrl", "videoUrl",
    "createdAt", "updatedAt"
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
RETURNING *;

-- name: UpsertFestivalTranslation :one
INSERT INTO "FestivalTranslation" ("id", "festivalEditionId", "locale", "themeName", "summary", "content")
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT ("festivalEditionId", "locale") DO UPDATE
  SET "themeName" = EXCLUDED."themeName", "summary" = EXCLUDED."summary", "content" = EXCLUDED."content"
RETURNING *;

-- name: UpdateFestivalEdition :one
UPDATE "FestivalEdition"
SET "editionNumber" = COALESCE(sqlc.narg('edition_number'), "editionNumber"),
    "year"          = COALESCE(sqlc.narg('year'), "year"),
    "city"          = COALESCE(sqlc.narg('city'), "city"),
    "country"       = COALESCE(sqlc.narg('country'), "country"),
    "status"        = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "mainImage"     = COALESCE(sqlc.narg('mainImage'), "mainImage"),
    "heroImage"     = COALESCE(sqlc.narg('heroImage'), "heroImage"),
    "gallery"       = COALESCE(sqlc.narg('gallery'), "gallery"),
    "typography"    = COALESCE(sqlc.narg('typography'), "typography"),
    "startDate"     = COALESCE(sqlc.narg('startDate'), "startDate"),
    "endDate"       = COALESCE(sqlc.narg('endDate'), "endDate"),
    "venue"         = COALESCE(sqlc.narg('venue'), "venue"),
    "venueAddress"  = COALESCE(sqlc.narg('venueAddress'), "venueAddress"),
    "ticketUrl"     = COALESCE(sqlc.narg('ticketUrl'), "ticketUrl"),
    "videoUrl"      = COALESCE(sqlc.narg('videoUrl'), "videoUrl"),
    "updatedAt"     = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteFestivalEdition :exec
DELETE FROM "FestivalEdition" WHERE "id" = $1;

-- name: ListFestivalArtists :many
SELECT
    fa."id", fa."festivalEditionId", fa."artistId",
    fa."performanceDate", fa."stageOrder", fa."role",
    a."slug" AS "artistSlug",
    a."avatarUrl" AS "artistAvatarUrl",
    a."featuredImageUrl" AS "artistFeaturedImageUrl",
    at2."name" AS "artistName"
FROM "FestivalArtist" fa
JOIN "Artist" a ON a."id" = fa."artistId"
LEFT JOIN "ArtistTranslation" at2 ON at2."artistId" = fa."artistId" AND at2."locale" = 'fr'
WHERE fa."festivalEditionId" = $1
ORDER BY fa."stageOrder" ASC, fa."createdAt" ASC;

-- name: AddFestivalArtist :one
INSERT INTO "FestivalArtist" ("id", "festivalEditionId", "artistId", "performanceDate", "stageOrder", "role")
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT ("festivalEditionId", "artistId") DO UPDATE
  SET "role" = EXCLUDED."role", "stageOrder" = EXCLUDED."stageOrder", "performanceDate" = EXCLUDED."performanceDate"
RETURNING *;

-- name: RemoveFestivalArtist :exec
DELETE FROM "FestivalArtist" WHERE "festivalEditionId" = $1 AND "artistId" = $2;

-- name: ClearFestivalArtists :exec
DELETE FROM "FestivalArtist" WHERE "festivalEditionId" = $1;

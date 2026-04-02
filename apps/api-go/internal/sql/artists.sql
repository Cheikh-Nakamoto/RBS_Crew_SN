-- name: ListArtists :many
SELECT a.*, COUNT(*) OVER() AS total_count
FROM "Artist" a
WHERE a."status" = 'PUBLISHED'::"ProductStatus"
ORDER BY a."createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetArtistBySlug :one
SELECT * FROM "Artist" WHERE "slug" = $1;

-- name: GetArtistByID :one
SELECT * FROM "Artist" WHERE "id" = $1;

-- name: GetArtistTranslations :many
SELECT * FROM "ArtistTranslation" WHERE "artistId" = $1;

-- name: GetArtistArtworks :many
SELECT * FROM "ArtistArtwork" WHERE "artistId" = $1 ORDER BY "position" ASC;

-- name: CreateArtist :one
INSERT INTO "Artist" ("id", "slug", "city", "country", "featuredImageUrl", "avatarUrl", "status", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
RETURNING *;

-- name: UpsertArtistTranslation :one
INSERT INTO "ArtistTranslation" ("id", "artistId", "locale", "name", "bio")
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT ("artistId", "locale") DO UPDATE
  SET "name" = EXCLUDED."name", "bio" = EXCLUDED."bio"
RETURNING *;

-- name: UpdateArtist :one
UPDATE "Artist"
SET "city" = COALESCE(sqlc.narg('city'), "city"),
    "country" = COALESCE(sqlc.narg('country'), "country"),
    "featuredImageUrl" = COALESCE(sqlc.narg('featured_image_url'), "featuredImageUrl"),
    "avatarUrl" = COALESCE(sqlc.narg('avatar_url'), "avatarUrl"),
    "status" = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteArtist :exec
DELETE FROM "Artist" WHERE "id" = $1;

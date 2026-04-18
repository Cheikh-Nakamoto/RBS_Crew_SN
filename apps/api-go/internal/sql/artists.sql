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

-- name: AddArtistArtwork :exec
INSERT INTO "ArtistArtwork" ("id", "artistId", "imageUrl", "position")
VALUES ($1, $2, $3, $4);

-- name: ClearArtistArtworks :exec
DELETE FROM "ArtistArtwork" WHERE "artistId" = $1;

-- name: CreateArtist :one
INSERT INTO "Artist" (
    "id", "slug", "city", "country", "featuredImageUrl", "avatarUrl", "status",
    "genre", "nationality", "facebookUrl", "twitterUrl", "youtubeUrl",
    "tiktokUrl", "websiteUrl", "spotifyUrl", "soundcloudUrl", "videoUrl",
    "createdAt", "updatedAt"
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
RETURNING *;

-- name: UpsertArtistTranslation :one
INSERT INTO "ArtistTranslation" ("id", "artistId", "locale", "name", "bio")
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT ("artistId", "locale") DO UPDATE
  SET "name" = EXCLUDED."name", "bio" = EXCLUDED."bio"
RETURNING *;

-- name: UpdateArtist :one
UPDATE "Artist"
SET "slug"          = COALESCE(sqlc.narg('slug'), "slug"),
    "city"          = COALESCE(sqlc.narg('city'), "city"),
    "country"       = COALESCE(sqlc.narg('country'), "country"),
    "featuredImageUrl" = COALESCE(sqlc.narg('featured_image_url'), "featuredImageUrl"),
    "avatarUrl"     = COALESCE(sqlc.narg('avatar_url'), "avatarUrl"),
    "instagramUrl"  = COALESCE(sqlc.narg('instagram_url'), "instagramUrl"),
    "genre"         = COALESCE(sqlc.narg('genre'), "genre"),
    "nationality"   = COALESCE(sqlc.narg('nationality'), "nationality"),
    "facebookUrl"   = COALESCE(sqlc.narg('facebookUrl'), "facebookUrl"),
    "twitterUrl"    = COALESCE(sqlc.narg('twitterUrl'), "twitterUrl"),
    "youtubeUrl"    = COALESCE(sqlc.narg('youtubeUrl'), "youtubeUrl"),
    "tiktokUrl"     = COALESCE(sqlc.narg('tiktokUrl'), "tiktokUrl"),
    "websiteUrl"    = COALESCE(sqlc.narg('websiteUrl'), "websiteUrl"),
    "spotifyUrl"    = COALESCE(sqlc.narg('spotifyUrl'), "spotifyUrl"),
    "soundcloudUrl" = COALESCE(sqlc.narg('soundcloudUrl'), "soundcloudUrl"),
    "videoUrl"      = COALESCE(sqlc.narg('videoUrl'), "videoUrl"),
    "status"        = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "updatedAt"     = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteArtist :exec
DELETE FROM "Artist" WHERE "id" = $1;

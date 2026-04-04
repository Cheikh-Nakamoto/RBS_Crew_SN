-- name: ListPressMentions :many
SELECT *, COUNT(*) OVER() AS total_count
FROM "PressMention"
ORDER BY "date" DESC NULLS LAST, "createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetPressMentionByID :one
SELECT * FROM "PressMention" WHERE "id" = $1;

-- name: CreatePressMention :one
INSERT INTO "PressMention" ("id", "title", "source", "sourceUrl", "logoUrl", "featuredImageUrl", "excerpt", "date", "createdAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
RETURNING *;

-- name: UpdatePressMention :one
UPDATE "PressMention"
SET "title" = COALESCE(sqlc.narg('title'), "title"),
    "source" = COALESCE(sqlc.narg('source'), "source"),
    "sourceUrl" = COALESCE(sqlc.narg('source_url'), "sourceUrl"),
    "logoUrl" = sqlc.narg('logo_url'),
    "featuredImageUrl" = sqlc.narg('featured_image_url'),
    "excerpt" = sqlc.narg('excerpt'),
    "date" = sqlc.narg('date')
WHERE "id" = $1
RETURNING *;

-- name: DeletePressMention :exec
DELETE FROM "PressMention" WHERE "id" = $1;

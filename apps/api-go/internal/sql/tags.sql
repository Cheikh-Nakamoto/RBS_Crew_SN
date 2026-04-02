-- name: ListTags :many
SELECT t.*, COUNT(*) OVER() AS total_count
FROM "Tag" t
ORDER BY t."createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetTagByID :one
SELECT * FROM "Tag" WHERE "id" = $1;

-- name: GetTagBySlug :one
SELECT * FROM "Tag" WHERE "slug" = $1;

-- name: GetTagTranslations :many
SELECT * FROM "TagTranslation" WHERE "tagId" = $1 AND "locale" = $2;

-- name: CreateTag :one
INSERT INTO "Tag" ("id", "slug", "createdAt")
VALUES ($1, $2, NOW())
RETURNING *;

-- name: UpdateTag :one
UPDATE "Tag" SET "slug" = $2 WHERE "id" = $1 RETURNING *;

-- name: DeleteTag :exec
DELETE FROM "Tag" WHERE "id" = $1;

-- name: UpsertTagTranslation :one
INSERT INTO "TagTranslation" ("id", "tagId", "locale", "name")
VALUES ($1, $2, $3, $4)
ON CONFLICT ("tagId", "locale") DO UPDATE
  SET "name" = EXCLUDED."name"
RETURNING *;

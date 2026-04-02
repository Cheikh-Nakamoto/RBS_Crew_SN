-- name: ListCategories :many
SELECT c.*, COUNT(*) OVER() AS total_count
FROM "Category" c
ORDER BY c."createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetCategoryTranslations :many
SELECT * FROM "CategoryTranslation"
WHERE "categoryId" = $1 AND "locale" = $2;

-- name: GetCategoryBySlug :one
SELECT * FROM "Category" WHERE "slug" = $1;

-- name: GetCategoryByID :one
SELECT * FROM "Category" WHERE "id" = $1;

-- name: GetChildCategories :many
SELECT c.* FROM "Category" c WHERE c."parentId" = $1;

-- name: CreateCategory :one
INSERT INTO "Category" ("id", "slug", "parentId", "createdAt", "updatedAt")
VALUES ($1, $2, $3, NOW(), NOW())
RETURNING *;

-- name: UpdateCategory :one
UPDATE "Category"
SET "slug" = COALESCE(sqlc.narg('slug'), "slug"),
    "parentId" = sqlc.narg('parentId'),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM "Category" WHERE "id" = $1;

-- name: UpsertCategoryTranslation :one
INSERT INTO "CategoryTranslation" ("id", "categoryId", "locale", "name", "description")
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT ("categoryId", "locale") DO UPDATE
  SET "name" = EXCLUDED."name", "description" = EXCLUDED."description"
RETURNING *;

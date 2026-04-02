-- name: ListPages :many
SELECT p.*, COUNT(*) OVER() AS total_count
FROM "Page" p
WHERE p."status" = 'PUBLISHED'::"ProductStatus"
ORDER BY p."menuOrder" ASC, p."createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetPageBySlug :one
SELECT * FROM "Page" WHERE "slug" = $1;

-- name: GetPageByID :one
SELECT * FROM "Page" WHERE "id" = $1;

-- name: GetPageTranslations :many
SELECT * FROM "PageTranslation" WHERE "pageId" = $1;

-- name: GetPageTranslationByLocale :one
SELECT * FROM "PageTranslation" WHERE "pageId" = $1 AND "locale" = $2;

-- name: CreatePage :one
INSERT INTO "Page" ("id", "slug", "template", "status", "parentId", "menuOrder", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
RETURNING *;

-- name: UpsertPageTranslation :one
INSERT INTO "PageTranslation" ("id", "pageId", "locale", "title", "slug", "content", "excerpt", "metaTitle", "metaDescription")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT ("pageId", "locale") DO UPDATE
  SET "title" = EXCLUDED."title", "slug" = EXCLUDED."slug",
      "content" = EXCLUDED."content", "excerpt" = EXCLUDED."excerpt",
      "metaTitle" = EXCLUDED."metaTitle", "metaDescription" = EXCLUDED."metaDescription"
RETURNING *;

-- name: UpdatePage :one
UPDATE "Page"
SET "template" = COALESCE(sqlc.narg('template'), "template"),
    "status" = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "menuOrder" = COALESCE(sqlc.narg('menu_order')::int, "menuOrder"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeletePage :exec
DELETE FROM "Page" WHERE "id" = $1;

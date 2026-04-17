-- name: ListProjects :many
SELECT p.*, COUNT(*) OVER() AS total_count
FROM "Project" p
WHERE p."status" = 'PUBLISHED'::"ProductStatus"
ORDER BY p."completedAt" DESC NULLS LAST, p."createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetProjectBySlug :one
SELECT * FROM "Project" WHERE "slug" = $1;

-- name: GetProjectByID :one
SELECT * FROM "Project" WHERE "id" = $1;

-- name: GetProjectTranslations :many
SELECT * FROM "ProjectTranslation" WHERE "projectId" = $1;

-- name: CreateProject :one
INSERT INTO "Project" ("id", "slug", "featuredImageUrl", "gallery", "completedAt", "clientName", "country", "status", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, sqlc.narg('country'), $7, NOW(), NOW())
RETURNING *;

-- name: UpsertProjectTranslation :one
INSERT INTO "ProjectTranslation" ("id", "projectId", "locale", "title", "summary", "content", "metaTitle", "metaDescription")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT ("projectId", "locale") DO UPDATE
  SET "title" = EXCLUDED."title", "summary" = EXCLUDED."summary",
      "content" = EXCLUDED."content", "metaTitle" = EXCLUDED."metaTitle",
      "metaDescription" = EXCLUDED."metaDescription"
RETURNING *;

-- name: UpdateProject :one
UPDATE "Project"
SET "featuredImageUrl" = COALESCE(sqlc.narg('featured_image_url'), "featuredImageUrl"),
    "gallery" = COALESCE(sqlc.narg('gallery'), "gallery"),
    "completedAt" = sqlc.narg('completed_at'),
    "clientName" = COALESCE(sqlc.narg('client_name'), "clientName"),
    "country" = COALESCE(sqlc.narg('country'), "country"),
    "status" = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteProject :exec
DELETE FROM "Project" WHERE "id" = $1;

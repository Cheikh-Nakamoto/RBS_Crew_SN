-- name: ListProducts :many
SELECT p.*, COUNT(*) OVER() AS total_count
FROM "Product" p
WHERE p."status" = COALESCE(sqlc.narg('status')::"ProductStatus", 'PUBLISHED'::"ProductStatus")
  AND (COALESCE(sqlc.narg('min_price')::numeric, 0) = 0 OR p."price" >= sqlc.narg('min_price')::numeric)
  AND (COALESCE(sqlc.narg('max_price')::numeric, 0) = 0 OR p."price" <= sqlc.narg('max_price')::numeric)
  AND (sqlc.narg('category_slug')::text IS NULL OR EXISTS (
      SELECT 1 FROM "ProductCategory" pc
      JOIN "Category" c ON c."id" = pc."categoryId"
      WHERE pc."productId" = p."id" AND c."slug" = sqlc.narg('category_slug')::text
  ))
  AND (sqlc.narg('tag_slug')::text IS NULL OR EXISTS (
      SELECT 1 FROM "ProductTag" pt
      JOIN "Tag" t ON t."id" = pt."tagId"
      WHERE pt."productId" = p."id" AND t."slug" = sqlc.narg('tag_slug')::text
  ))
  AND (sqlc.narg('search')::text IS NULL OR EXISTS (
      SELECT 1 FROM "ProductTranslation" pt
      WHERE pt."productId" = p."id" AND (
          pt."name" ILIKE '%' || sqlc.narg('search')::text || '%'
          OR pt."description" ILIKE '%' || sqlc.narg('search')::text || '%'
      )
  ))
ORDER BY
  CASE WHEN sqlc.narg('order_by')::text = 'asc' THEN p."createdAt" END ASC,
  CASE WHEN sqlc.narg('order_by')::text != 'asc' OR sqlc.narg('order_by') IS NULL THEN p."createdAt" END DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: GetProductByID :one
SELECT * FROM "Product" WHERE "id" = $1;

-- name: GetProductBySlug :one
SELECT p.* FROM "Product" p
JOIN "ProductTranslation" pt ON pt."productId" = p."id"
WHERE pt."slug" = $1 AND pt."locale" = $2;

-- name: GetProductTranslations :many
SELECT * FROM "ProductTranslation"
WHERE "productId" = $1;

-- name: GetProductImages :many
SELECT * FROM "ProductImage"
WHERE "productId" = $1
ORDER BY "position" ASC;

-- name: AddProductImage :exec
INSERT INTO "ProductImage" ("id", "productId", "imageUrl", "position")
VALUES ($1, $2, $3, $4);

-- name: ClearProductImages :exec
DELETE FROM "ProductImage" WHERE "productId" = $1;

-- name: GetProductCategories :many
SELECT c."id", c."slug", ct."name"
FROM "ProductCategory" pc
JOIN "Category" c ON c."id" = pc."categoryId"
LEFT JOIN "CategoryTranslation" ct ON ct."categoryId" = c."id" AND ct."locale" = $2
WHERE pc."productId" = $1;

-- name: GetProductTags :many
SELECT t."id", t."slug", tt."name"
FROM "ProductTag" pt
JOIN "Tag" t ON t."id" = pt."tagId"
LEFT JOIN "TagTranslation" tt ON tt."tagId" = t."id" AND tt."locale" = $2
WHERE pt."productId" = $1;

-- name: GetProductVariants :many
SELECT * FROM "ProductVariant" WHERE "productId" = $1;

-- name: CreateProduct :one
INSERT INTO "Product" ("id", "slug", "sku", "price", "compareAtPrice", "stock", "status", "featuredImageUrl", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
RETURNING *;

-- name: UpsertProductTranslation :one
INSERT INTO "ProductTranslation" ("id", "productId", "locale", "name", "slug", "description", "shortDescription", "metaTitle", "metaDescription")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT ("productId", "locale") DO UPDATE
  SET "name" = EXCLUDED."name", "slug" = EXCLUDED."slug",
      "description" = EXCLUDED."description", "shortDescription" = EXCLUDED."shortDescription",
      "metaTitle" = EXCLUDED."metaTitle", "metaDescription" = EXCLUDED."metaDescription"
RETURNING *;

-- name: UpdateProduct :one
UPDATE "Product"
SET "sku" = COALESCE(sqlc.narg('sku'), "sku"),
    "price" = COALESCE(sqlc.narg('price')::numeric, "price"),
    "compareAtPrice" = sqlc.narg('compare_at_price')::numeric,
    "stock" = COALESCE(sqlc.narg('stock')::int, "stock"),
    "status" = COALESCE(sqlc.narg('status')::"ProductStatus", "status"),
    "featuredImageUrl" = COALESCE(sqlc.narg('featured_image_url'), "featuredImageUrl"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: DeleteProduct :exec
DELETE FROM "Product" WHERE "id" = $1;

-- name: DeleteProductTranslations :exec
DELETE FROM "ProductTranslation" WHERE "productId" = $1;

-- name: AddProductCategory :exec
INSERT INTO "ProductCategory" ("productId", "categoryId") VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: AddProductTag :exec
INSERT INTO "ProductTag" ("productId", "tagId") VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DecrementStock :execrows
UPDATE "Product" SET "stock" = "stock" - $2, "updatedAt" = NOW()
WHERE "id" = $1 AND "stock" >= $2;

-- name: CreateProductVariant :one
INSERT INTO "ProductVariant" ("id", "productId", "sku", "price", "stock", "options")
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- Pendant de DecrementStock : rend les unités d'une commande qui n'aboutira pas
-- (paiement échoué, annulation, remboursement, expiration).
-- Le filtre manageStock reflète celui du décrément : un produit non géré en
-- stock n'a jamais été décrémenté, il ne doit pas être incrémenté.
-- name: RestoreStock :execrows
UPDATE "Product" SET "stock" = "stock" + $2, "updatedAt" = NOW()
WHERE "id" = $1 AND "manageStock" = true;

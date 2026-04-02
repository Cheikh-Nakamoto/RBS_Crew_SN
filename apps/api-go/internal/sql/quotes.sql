-- name: ListQuotes :many
SELECT *, COUNT(*) OVER() AS total_count
FROM "Quote"
ORDER BY "createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: GetQuoteByID :one
SELECT * FROM "Quote" WHERE "id" = $1;

-- name: CreateQuote :one
INSERT INTO "Quote" ("id", "name", "surname", "email", "phone", "company", "orderType", "quantity", "deliveryDate", "message", "status", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'NEW', NOW(), NOW())
RETURNING *;

-- name: UpdateQuoteStatus :one
UPDATE "Quote" SET "status" = $2, "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

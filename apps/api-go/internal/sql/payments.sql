-- name: GetOrderByStripeSession :one
SELECT * FROM "Order" WHERE "stripePaymentIntentId" = $1;

-- name: UpdateOrderPaymentStatus :one
UPDATE "Order"
SET "paymentStatus" = $2::"PaymentStatus",
    "status" = COALESCE(sqlc.narg('status')::"OrderStatus", "status"),
    "stripePaymentIntentId" = COALESCE(sqlc.narg('stripePaymentIntentId')::text, "stripePaymentIntentId"),
    "paymentMethod" = COALESCE(sqlc.narg('paymentMethod')::"PaymentMethod", "paymentMethod"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- Mise à jour du SEUL moyen de paiement. UpdateOrderPaymentStatus exige un
-- "paymentStatus" non nul : l'appeler pour ne renseigner que la méthode
-- envoyait une chaîne vide et Postgres rejetait la requête.
-- name: UpdateOrderPaymentMethodOnly :one
UPDATE "Order"
SET "paymentMethod" = $2::"PaymentMethod",
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: CreatePayment :one
INSERT INTO "Payment" ("id", "orderId", "method", "externalId", "amount", "currency", "status", "metadata")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdatePaymentStatus :one
UPDATE "Payment"
SET "status" = $2::"PaymentStatus",
    "externalId" = COALESCE(sqlc.narg('externalId')::text, "externalId"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: GetPaymentByExternalID :one
SELECT * FROM "Payment" WHERE "externalId" = $1;

-- name: GetPaymentsByOrderID :many
SELECT * FROM "Payment" WHERE "orderId" = $1 ORDER BY "createdAt" DESC;

-- name: GetOrderByPaymentExternalID :one
SELECT o.* FROM "Order" o
JOIN "Payment" p ON p."orderId" = o."id"
WHERE p."externalId" = $1;

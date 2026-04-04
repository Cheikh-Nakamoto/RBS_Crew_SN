-- name: GetOrderByStripeSession :one
SELECT * FROM "Order" WHERE "stripePaymentIntentId" = $1;

-- name: UpdateOrderPaymentStatus :one
UPDATE "Order"
SET "paymentStatus" = $2::"PaymentStatus",
    "status" = COALESCE(sqlc.narg('status')::"OrderStatus", "status"),
    "stripePaymentIntentId" = COALESCE(sqlc.narg('stripePaymentIntentId')::text, "stripePaymentIntentId"),
    "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

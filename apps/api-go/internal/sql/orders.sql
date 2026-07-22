-- name: CreateOrder :one
INSERT INTO "Order" ("id", "orderNumber", "userId", "guestEmail", "status", "paymentStatus",
                     "currency", "subtotal", "taxAmount", "shippingAmount", "discountAmount",
                     "total", "shippingAddressId", "billingAddressId", "notes", "locale", "createdAt", "updatedAt",
                     "customerFirstName", "customerLastName", "customerPhone")
VALUES ($1, $2, $3, $4, 'PENDING'::"OrderStatus", 'UNPAID'::"PaymentStatus",
        'XOF', $5, 0, 0, 0, $5, $6, $7, $8, 'fr'::"Locale", NOW(), NOW(), $9, $10, $11)
RETURNING *;

-- name: CreateOrderItem :one
INSERT INTO "OrderItem" ("id", "orderId", "productId", "variantId", "quantity", "unitPrice", "totalPrice", "productName", "productSku")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetOrderByID :one
SELECT * FROM "Order" WHERE "id" = $1;

-- name: ListOrders :many
SELECT *, COUNT(*) OVER() AS total_count
FROM "Order"
ORDER BY "createdAt" DESC
LIMIT $1 OFFSET $2;

-- name: ListMyOrders :many
SELECT *, COUNT(*) OVER() AS total_count
FROM "Order"
WHERE "userId" = $1
ORDER BY "createdAt" DESC
LIMIT $2 OFFSET $3;

-- name: GetOrderItems :many
SELECT * FROM "OrderItem" WHERE "orderId" = $1;

-- name: GetProductForOrder :one
SELECT "id", "sku", "price", "stock", "manageStock" FROM "Product" WHERE "id" = $1;

-- name: UpdateOrderStatus :one
UPDATE "Order"
SET "status" = sqlc.arg('status')::"OrderStatus", "updatedAt" = NOW()
WHERE "id" = $1
RETURNING *;

-- name: UpdateOrderShipping :one
UPDATE "Order"
SET "shippingMethodId" = sqlc.narg('shippingMethodId')::text,
    "shippingCarrier"  = sqlc.narg('shippingCarrier')::text,
    "trackingNumber"   = sqlc.narg('trackingNumber')::text,
    "shippedAt"        = sqlc.narg('shippedAt')::timestamp,
    "updatedAt"        = NOW()
WHERE "id" = $1
RETURNING *;

-- name: UpdateOrderShippingAmount :one
UPDATE "Order"
SET "shippingAmount" = $2,
    "total"          = "subtotal" + "taxAmount" + $2 - "discountAmount",
    "updatedAt"      = NOW()
WHERE "id" = $1
RETURNING *;

-- Transition vers un état terminal qui LIBÈRE le stock. La garde sur le statut
-- courant rend l'opération idempotente : un webhook rejoué, ou une expiration
-- concurrente d'une annulation admin, ne touche aucune ligne et ne restitue donc
-- pas le stock une seconde fois.
-- name: ReleaseOrderStock :execrows
UPDATE "Order"
SET "status" = $2::"OrderStatus",
    "paymentStatus" = COALESCE(sqlc.narg('paymentStatus')::"PaymentStatus", "paymentStatus"),
    "updatedAt" = NOW()
WHERE "id" = $1
  AND "status" NOT IN ('FAILED', 'CANCELLED', 'REFUNDED');

-- Commandes jamais payées, candidates à l'expiration.
-- name: ListExpiredUnpaidOrders :many
SELECT "id" FROM "Order"
WHERE "status" = 'PENDING' AND "paymentStatus" = 'UNPAID' AND "createdAt" < $1
ORDER BY "createdAt";

-- name: CreateOrder :one
INSERT INTO "Order" ("id", "orderNumber", "userId", "guestEmail", "status", "paymentStatus",
                     "currency", "subtotal", "taxAmount", "shippingAmount", "discountAmount",
                     "total", "shippingAddressId", "billingAddressId", "notes", "locale", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, 'PENDING'::"OrderStatus", 'UNPAID'::"PaymentStatus",
        'XOF', $5, 0, 0, 0, $5, $6, $7, $8, 'fr'::"Locale", NOW(), NOW())
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

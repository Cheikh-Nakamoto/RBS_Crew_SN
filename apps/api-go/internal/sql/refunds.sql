-- name: CreateRefundRequest :one
INSERT INTO "RefundRequest" (
    "id", "orderId", "paymentId", "amount", "currency", "reason",
    "status", "idempotencyKey", "requestedBy", "requestedAt"
) VALUES (
    $1, $2, $3, $4, $5, $6,
    'PENDING'::"RefundStatus", $7, $8, NOW()
)
RETURNING *;

-- name: GetRefundRequestByID :one
SELECT * FROM "RefundRequest" WHERE "id" = $1;

-- name: GetRefundRequestByIdempotencyKey :one
SELECT * FROM "RefundRequest" WHERE "idempotencyKey" = $1;

-- name: ListRefundsByOrderID :many
SELECT * FROM "RefundRequest" WHERE "orderId" = $1 ORDER BY "requestedAt" DESC;

-- name: UpdateRefundStatus :one
UPDATE "RefundRequest"
SET "status" = sqlc.arg('status')::"RefundStatus",
    "providerRefundId" = COALESCE(sqlc.narg('providerRefundId')::text, "providerRefundId"),
    "errorMessage"     = COALESCE(sqlc.narg('errorMessage')::text, "errorMessage"),
    "completedAt"      = CASE WHEN sqlc.arg('status')::text IN ('SUCCEEDED','FAILED','CANCELLED') THEN NOW() ELSE "completedAt" END
WHERE "id" = $1
RETURNING *;

-- name: MarkRefundManualCompleted :one
UPDATE "RefundRequest"
SET "status"          = 'SUCCEEDED'::"RefundStatus",
    "manualReference" = $2,
    "justificationUrl"= $3,
    "completedAt"     = NOW()
WHERE "id" = $1
RETURNING *;

-- name: SumRefundsByOrderID :one
-- Sum of PENDING + SUCCEEDED refunds for cap check.
SELECT COALESCE(SUM("amount"), 0)::DECIMAL(10,2) AS total
FROM "RefundRequest"
WHERE "orderId" = $1
  AND "status" IN ('PENDING','SUCCEEDED');

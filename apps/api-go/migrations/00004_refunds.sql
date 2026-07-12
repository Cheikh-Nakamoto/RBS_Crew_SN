-- +goose Up
-- +goose StatementBegin
CREATE TYPE "RefundStatus" AS ENUM ('PENDING','SUCCEEDED','FAILED','CANCELLED');

CREATE TABLE "RefundRequest" (
    "id"               TEXT NOT NULL,
    "orderId"          TEXT NOT NULL,
    "paymentId"        TEXT NOT NULL,
    "amount"           DECIMAL(10,2) NOT NULL,
    "currency"         TEXT NOT NULL,
    "reason"           TEXT NOT NULL,
    "status"           "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "providerRefundId" TEXT,
    "idempotencyKey"   TEXT NOT NULL,
    "requestedBy"      TEXT NOT NULL,
    "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"      TIMESTAMP(3),
    "errorMessage"     TEXT,
    "manualReference"  TEXT,
    "justificationUrl" TEXT,
    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefundRequest_idempotencyKey_key" ON "RefundRequest"("idempotencyKey");
CREATE INDEX "RefundRequest_orderId_idx" ON "RefundRequest"("orderId");
CREATE INDEX "RefundRequest_paymentId_idx" ON "RefundRequest"("paymentId");
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_requestedBy_fkey"
  FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "RefundRequest";
DROP TYPE IF EXISTS "RefundStatus";
-- +goose StatementEnd

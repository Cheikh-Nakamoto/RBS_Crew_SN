-- +goose Up
-- +goose StatementBegin
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingMethodId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCarrier"  TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber"   TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippedAt"        TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt"      TIMESTAMP(3);
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingMethodId_fkey"
  FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber") WHERE "trackingNumber" IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS "Order_trackingNumber_idx";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_shippingMethodId_fkey";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "deliveredAt";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "shippedAt";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "trackingNumber";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "shippingCarrier";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "shippingMethodId";
-- +goose StatementEnd

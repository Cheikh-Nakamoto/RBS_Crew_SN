-- +goose Up
-- +goose StatementBegin
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerFirstName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerLastName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE "Order" DROP COLUMN IF EXISTS "customerPhone";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "customerLastName";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "customerFirstName";
-- +goose StatementEnd

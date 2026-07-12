-- +goose Up
-- +goose StatementBegin
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "country" TEXT;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE "Project" DROP COLUMN IF EXISTS "country";
-- +goose StatementEnd

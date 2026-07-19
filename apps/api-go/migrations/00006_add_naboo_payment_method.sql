-- +goose Up
-- +goose StatementBegin
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'NABOO';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Postgres ne permet pas de retirer une valeur d'un type enum.
-- Un vrai rollback nécessiterait de recréer le type sans 'NABOO'
-- après avoir migré les lignes existantes qui l'utilisent.
-- +goose StatementEnd

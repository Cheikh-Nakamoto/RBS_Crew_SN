-- name: GetUserByEmail :one
SELECT * FROM "User" WHERE "email" = $1;

-- name: CreateUser :one
INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName", "phone", "role", "preferredLocale", "createdAt", "updatedAt", "emailVerified")
VALUES ($1, $2, $3, $4, $5, $6, 'CUSTOMER'::"UserRole", 'fr'::"Locale", NOW(), NOW(), false)
RETURNING *;

-- name: GetUserByID :one
SELECT "id", "email", "firstName", "lastName", "role", "preferredLocale", "createdAt"
FROM "User" WHERE "id" = $1;

-- name: CreateSession :one
INSERT INTO "UserSession" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
VALUES ($1, $2, $3, $4, NOW())
RETURNING *;

-- name: GetActiveSessionsByUser :many
SELECT * FROM "UserSession"
WHERE "userId" = $1 AND "expiresAt" > NOW();

-- name: DeleteUserSessions :exec
DELETE FROM "UserSession" WHERE "userId" = $1;

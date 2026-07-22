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

-- name: SetPasswordResetToken :exec
UPDATE "User" SET "resetToken" = $2, "resetTokenExpiry" = $3, "updatedAt" = NOW()
WHERE "email" = $1;

-- name: GetUserByResetToken :one
SELECT "id", "email", "role", "resetToken", "resetTokenExpiry", "emailVerified"
FROM "User" WHERE "resetToken" = $1 AND "resetTokenExpiry" > NOW();

-- name: ClearResetToken :exec
UPDATE "User"
SET "resetToken" = NULL, "resetTokenExpiry" = NULL, "passwordHash" = $2, "updatedAt" = NOW()
WHERE "id" = $1;

-- name: SetEmailVerificationToken :exec
UPDATE "User"
SET "emailVerificationToken" = $2, "emailVerificationTokenExpiry" = $3, "updatedAt" = NOW()
WHERE "id" = $1;

-- name: GetUserByEmailVerificationToken :one
SELECT "id", "email", "emailVerified"
FROM "User"
WHERE "emailVerificationToken" = $1
  AND "emailVerificationTokenExpiry" > NOW();

-- name: SetEmailVerified :exec
UPDATE "User"
SET "emailVerified" = true,
    "emailVerificationToken" = NULL,
    "emailVerificationTokenExpiry" = NULL,
    "updatedAt" = NOW()
WHERE "id" = $1;

-- CreateUser fige le rôle CUSTOMER ; cette variante sert au provisionnement des
-- comptes artiste par un administrateur.
-- name: CreateUserWithRole :one
INSERT INTO "User" ("id", "email", "passwordHash", "firstName", "lastName", "phone", "role", "preferredLocale", "createdAt", "updatedAt", "emailVerified")
VALUES ($1, $2, $3, $4, $5, $6, $7::"UserRole", 'fr'::"Locale", NOW(), NOW(), false)
RETURNING *;

-- name: UpdateUserRole :one
UPDATE "User" SET "role" = $2::"UserRole", "updatedAt" = NOW() WHERE "id" = $1 RETURNING *;

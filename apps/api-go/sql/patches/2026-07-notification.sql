-- Patch idempotent : table Notification (notifications in-app).
--
-- Le schéma de référence reste sql/schema.sql (jamais d'ALTER là-bas). Ce
-- fichier existe pour UNE seule raison : ajouter la table à une base déjà
-- initialisée (prod), que db-push refuse et que db-reset détruirait.
-- Chaque instruction est rejouable sans effet si l'objet existe déjà.
-- Appliquer avec : make db-patch   (ou DATABASE_URL=... make db-patch)

CREATE TABLE IF NOT EXISTS "Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "linkUrl" text,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY (id),
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt" DESC);

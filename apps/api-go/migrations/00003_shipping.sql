-- +goose Up
-- +goose StatementBegin
CREATE TABLE "ShippingZone" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "priority"  INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingZone_code_key" ON "ShippingZone"("code");
CREATE UNIQUE INDEX "ShippingZone_isDefault_key" ON "ShippingZone"("isDefault") WHERE "isDefault" = true;

CREATE TABLE "ShippingZoneTranslation" (
    "id"     TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name"   TEXT NOT NULL,
    CONSTRAINT "ShippingZoneTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingZoneTranslation_zoneId_locale_key" ON "ShippingZoneTranslation"("zoneId","locale");
ALTER TABLE "ShippingZoneTranslation" ADD CONSTRAINT "ShippingZoneTranslation_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShippingZoneRule" (
    "id"                TEXT NOT NULL,
    "zoneId"            TEXT NOT NULL,
    "country"           TEXT NOT NULL,
    "region"            TEXT,
    "postalCodePattern" TEXT,
    CONSTRAINT "ShippingZoneRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShippingZoneRule_country_idx" ON "ShippingZoneRule"("country");
ALTER TABLE "ShippingZoneRule" ADD CONSTRAINT "ShippingZoneRule_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShippingMethod" (
    "id"               TEXT NOT NULL,
    "code"             TEXT NOT NULL,
    "isPickup"         BOOLEAN NOT NULL DEFAULT false,
    "enabled"          BOOLEAN NOT NULL DEFAULT true,
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingMethod_code_key" ON "ShippingMethod"("code");

CREATE TABLE "ShippingMethodTranslation" (
    "id"          TEXT NOT NULL,
    "methodId"    TEXT NOT NULL,
    "locale"      "Locale" NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "ShippingMethodTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingMethodTranslation_methodId_locale_key" ON "ShippingMethodTranslation"("methodId","locale");
ALTER TABLE "ShippingMethodTranslation" ADD CONSTRAINT "ShippingMethodTranslation_methodId_fkey"
  FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShippingRate" (
    "id"        TEXT NOT NULL,
    "zoneId"    TEXT NOT NULL,
    "methodId"  TEXT NOT NULL,
    "flatFee"   DECIMAL(10,2) NOT NULL,
    "freeAbove" DECIMAL(10,2),
    "currency"  TEXT NOT NULL DEFAULT 'XOF',
    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingRate_zoneId_methodId_key" ON "ShippingRate"("zoneId","methodId");
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_methodId_fkey"
  FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "ShippingRate";
DROP TABLE IF EXISTS "ShippingMethodTranslation";
DROP TABLE IF EXISTS "ShippingMethod";
DROP TABLE IF EXISTS "ShippingZoneRule";
DROP TABLE IF EXISTS "ShippingZoneTranslation";
DROP TABLE IF EXISTS "ShippingZone";
-- +goose StatementEnd

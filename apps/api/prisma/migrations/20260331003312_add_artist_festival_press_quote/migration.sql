-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "featuredImageId" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PUBLISHED',
    "wpId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistTranslation" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,

    CONSTRAINT "ArtistTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalEdition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "editionNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'SN',
    "status" "ProductStatus" NOT NULL DEFAULT 'PUBLISHED',
    "wpId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalTranslation" (
    "id" TEXT NOT NULL,
    "festivalEditionId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "themeName" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,

    CONSTRAINT "FestivalTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PressMention" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "logoUrl" TEXT,
    "excerpt" TEXT,
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PressMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "orderType" TEXT NOT NULL,
    "quantity" INTEGER,
    "deliveryDate" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_wpId_key" ON "Artist"("wpId");

-- CreateIndex
CREATE INDEX "ArtistTranslation_locale_idx" ON "ArtistTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistTranslation_artistId_locale_key" ON "ArtistTranslation"("artistId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalEdition_slug_key" ON "FestivalEdition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalEdition_wpId_key" ON "FestivalEdition"("wpId");

-- CreateIndex
CREATE INDEX "FestivalTranslation_locale_idx" ON "FestivalTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalTranslation_festivalEditionId_locale_key" ON "FestivalTranslation"("festivalEditionId", "locale");

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistTranslation" ADD CONSTRAINT "ArtistTranslation_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalTranslation" ADD CONSTRAINT "FestivalTranslation_festivalEditionId_fkey" FOREIGN KEY ("festivalEditionId") REFERENCES "FestivalEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

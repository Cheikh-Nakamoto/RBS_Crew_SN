-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "avatarId" TEXT;

-- CreateTable
CREATE TABLE "ArtistArtwork" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArtistArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistArtwork_artistId_mediaId_key" ON "ArtistArtwork"("artistId", "mediaId");

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistArtwork" ADD CONSTRAINT "ArtistArtwork_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistArtwork" ADD CONSTRAINT "ArtistArtwork_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

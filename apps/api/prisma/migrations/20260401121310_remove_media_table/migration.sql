/*
  Warnings:

  - You are about to drop the column `avatarId` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `featuredImageId` on the `Artist` table. All the data in the column will be lost.
  - You are about to drop the column `mediaId` on the `ArtistArtwork` table. All the data in the column will be lost.
  - You are about to drop the column `featuredImageId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `mediaId` on the `ProductImage` table. All the data in the column will be lost.
  - You are about to drop the column `featuredImageId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `Media` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[artistId,imageUrl]` on the table `ArtistArtwork` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,imageUrl]` on the table `ProductImage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `imageUrl` to the `ArtistArtwork` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `ProductImage` table without a default value. This is not possible if the table is not empty.

*/
-- Clear join tables temporarily to avoid constraint issues during column drop/add
TRUNCATE TABLE "ArtistArtwork", "ProductImage" CASCADE;

-- DropForeignKey
ALTER TABLE "Artist" DROP CONSTRAINT "Artist_avatarId_fkey";

-- DropForeignKey
ALTER TABLE "Artist" DROP CONSTRAINT "Artist_featuredImageId_fkey";

-- DropForeignKey
ALTER TABLE "ArtistArtwork" DROP CONSTRAINT "ArtistArtwork_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_featuredImageId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_featuredImageId_fkey";

-- DropIndex
DROP INDEX "ArtistArtwork_artistId_mediaId_key";

-- DropIndex
DROP INDEX "ProductImage_productId_mediaId_key";

-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "avatarId",
DROP COLUMN "featuredImageId",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "featuredImageUrl" TEXT;

-- AlterTable
ALTER TABLE "ArtistArtwork" DROP COLUMN "mediaId",
ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "featuredImageId",
ADD COLUMN     "featuredImageUrl" TEXT;

-- AlterTable
ALTER TABLE "ProductImage" DROP COLUMN "mediaId",
ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "featuredImageId",
ADD COLUMN     "featuredImageUrl" TEXT;

-- DropTable
DROP TABLE "Media";

-- CreateIndex
CREATE UNIQUE INDEX "ArtistArtwork_artistId_imageUrl_key" ON "ArtistArtwork"("artistId", "imageUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_imageUrl_key" ON "ProductImage"("productId", "imageUrl");

/**
 * import-db.ts — Import extracted JSON data into PostgreSQL using raw pg queries.
 * 
 * This script reads the JSON files from data/raw/ (after upload-s3.ts has populated 
 * cloud URLs) and upserts everything into the database matching the Go API schema.
 *
 * Tables populated:
 *   - Artist, ArtistTranslation, ArtistArtwork
 *   - Product, ProductTranslation, ProductImage
 *   - Project, ProjectTranslation
 *   - FestivalEdition, FestivalTranslation
 *   - PressMention
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Load env from the root directory where DATABASE_URL lives
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also load local .env for R2 URLs etc.
dotenv.config();

const EXTRACT_DIR = path.resolve(__dirname, process.env.EXTRACT_DIR || '../data/raw');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function uid(): string {
  return crypto.randomUUID();
}

// =====================================================================
//  ARTISTS
// =====================================================================
async function importArtists() {
  const filePath = path.join(EXTRACT_DIR, 'artists.json');
  if (!fs.existsSync(filePath)) { console.log('⏭️  artists.json introuvable, skipped.'); return; }
  console.log('🎨 Importation Artistes...');

  const artists = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const client = await pool.connect();

  try {
    for (const a of artists) {
      const featuredImageUrl = a.featuredImage?.cloudUrl ?? null;
      const avatarUrl = a.avatar?.cloudUrl ?? null;

      // Upsert Artist
      const existing = await client.query('SELECT "id" FROM "Artist" WHERE "slug" = $1', [a.slug]);
      let artistId: string;

      if (existing.rows.length > 0) {
        artistId = existing.rows[0].id;
        await client.query(`
          UPDATE "Artist" SET
            "country" = COALESCE($2, "country"),
            "featuredImageUrl" = COALESCE($3, "featuredImageUrl"),
            "avatarUrl" = COALESCE($4, "avatarUrl"),
            "instagramUrl" = COALESCE($5, "instagramUrl"),
            "status" = 'PUBLISHED'::"ProductStatus",
            "updatedAt" = NOW()
          WHERE "id" = $1
        `, [artistId, a.country || 'SN', featuredImageUrl, avatarUrl, a.instagramUrl || null]);
      } else {
        artistId = uid();
        await client.query(`
          INSERT INTO "Artist" ("id", "slug", "country", "featuredImageUrl", "avatarUrl", "instagramUrl", "status", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED'::"ProductStatus", NOW(), NOW())
        `, [artistId, a.slug, a.country || 'SN', featuredImageUrl, avatarUrl, a.instagramUrl || null]);
      }

      // Upsert Translation
      await client.query(`
        INSERT INTO "ArtistTranslation" ("id", "artistId", "locale", "name", "bio")
        VALUES ($1, $2, 'fr'::"Locale", $3, $4)
        ON CONFLICT ("artistId", "locale") DO UPDATE
          SET "name" = EXCLUDED."name", "bio" = EXCLUDED."bio"
      `, [uid(), artistId, a.name, a.bio || null]);

      // Artworks gallery
      if (Array.isArray(a.artworks) && a.artworks.length > 0) {
        await client.query('DELETE FROM "ArtistArtwork" WHERE "artistId" = $1', [artistId]);
        let position = 0;
        for (const artwork of a.artworks) {
          const imageUrl = artwork?.cloudUrl;
          if (imageUrl) {
            await client.query(`
              INSERT INTO "ArtistArtwork" ("id", "artistId", "imageUrl", "position")
              VALUES ($1, $2, $3, $4)
            `, [uid(), artistId, imageUrl, position]);
            position++;
          }
        }
      }

      console.log(`  ✅ Artiste: ${a.name} (${position_count(a.artworks)} artworks)`);
    }
  } finally {
    client.release();
  }
}

// =====================================================================
//  PRODUCTS
// =====================================================================
async function importProducts() {
  const filePath = path.join(EXTRACT_DIR, 'products.json');
  if (!fs.existsSync(filePath)) { console.log('⏭️  products.json introuvable, skipped.'); return; }
  console.log('🛒 Importation Produits...');

  const products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const client = await pool.connect();

  try {
    for (const p of products) {
      const featuredImageUrl = p.featuredImage?.cloudUrl ?? null;
      const slugStr = p.slug || `product-${p.wcId}`;

      // Upsert Product by wcId
      const existing = await client.query('SELECT "id" FROM "Product" WHERE "wcId" = $1', [p.wcId]);
      let productId: string;

      if (existing.rows.length > 0) {
        productId = existing.rows[0].id;
        await client.query(`
          UPDATE "Product" SET
            "slug" = $2, "sku" = $3, "price" = $4, "compareAtPrice" = $5,
            "stock" = $6, "manageStock" = $7, "status" = 'PUBLISHED'::"ProductStatus",
            "featuredImageUrl" = COALESCE($8, "featuredImageUrl"), "updatedAt" = NOW()
          WHERE "id" = $1
        `, [productId, slugStr, p.sku || null, p.price || 0, p.compareAtPrice || null,
            p.stock || 0, p.manageStock ?? true, featuredImageUrl]);
      } else {
        productId = uid();
        await client.query(`
          INSERT INTO "Product" ("id", "slug", "wcId", "sku", "price", "compareAtPrice", "stock", "manageStock", "status", "featuredImageUrl", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PUBLISHED'::"ProductStatus", $9, NOW(), NOW())
        `, [productId, slugStr, p.wcId, p.sku || null, p.price || 0, p.compareAtPrice || null,
            p.stock || 0, p.manageStock ?? true, featuredImageUrl]);
      }

      // Upsert Translation
      await client.query(`
        INSERT INTO "ProductTranslation" ("id", "productId", "locale", "name", "description", "shortDescription", "slug")
        VALUES ($1, $2, 'fr'::"Locale", $3, $4, $5, $6)
        ON CONFLICT ("productId", "locale") DO UPDATE
          SET "name" = EXCLUDED."name", "description" = EXCLUDED."description",
              "shortDescription" = EXCLUDED."shortDescription", "slug" = EXCLUDED."slug"
      `, [uid(), productId, p.name, p.description || null, p.shortDescription || null, slugStr]);

      // Gallery images
      if (Array.isArray(p.gallery) && p.gallery.length > 0) {
        await client.query('DELETE FROM "ProductImage" WHERE "productId" = $1', [productId]);
        for (const img of p.gallery) {
          const imageUrl = img?.cloudUrl;
          if (imageUrl) {
            await client.query(`
              INSERT INTO "ProductImage" ("id", "productId", "imageUrl", "position")
              VALUES ($1, $2, $3, $4)
            `, [uid(), productId, imageUrl, img.position || 0]);
          }
        }
      }

      console.log(`  ✅ Produit: ${p.name} (wcId: ${p.wcId})`);
    }
  } finally {
    client.release();
  }
}

// =====================================================================
//  PROJECTS
// =====================================================================
async function importProjects() {
  const filePath = path.join(EXTRACT_DIR, 'projects.json');
  if (!fs.existsSync(filePath)) { console.log('⏭️  projects.json introuvable, skipped.'); return; }
  console.log('🖼️  Importation Projets...');

  const projects = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const client = await pool.connect();

  try {
    for (const p of projects) {
      const featuredImageUrl = p.featuredImage?.cloudUrl ?? null;
      let completedAt = null;
      if (p.completedAt) completedAt = new Date(p.completedAt);

      // Gallery: array of R2 URLs (strings after upload-s3 processing)
      const gallery = Array.isArray(p.gallery) ? JSON.stringify(p.gallery) : '[]';

      // Upsert Project
      const existing = await client.query('SELECT "id" FROM "Project" WHERE "slug" = $1', [p.slug]);
      let projectId: string;

      if (existing.rows.length > 0) {
        projectId = existing.rows[0].id;
        await client.query(`
          UPDATE "Project" SET
            "featuredImageUrl" = COALESCE($2, "featuredImageUrl"),
            "gallery" = $3::jsonb,
            "completedAt" = COALESCE($4, "completedAt"),
            "status" = 'PUBLISHED'::"ProductStatus",
            "updatedAt" = NOW()
          WHERE "id" = $1
        `, [projectId, featuredImageUrl, gallery, completedAt]);
      } else {
        projectId = uid();
        await client.query(`
          INSERT INTO "Project" ("id", "slug", "featuredImageUrl", "gallery", "completedAt", "status", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4::jsonb, $5, 'PUBLISHED'::"ProductStatus", NOW(), NOW())
        `, [projectId, p.slug, featuredImageUrl, gallery, completedAt]);
      }

      // Upsert Translation
      // Use the scraped description as content (clean text), WP content as fallback
      const content = p.description || p.content || null;
      const summary = p.summary || null;
      const metaTitle = p.metaTitle || p.title;
      const metaDescription = p.metaDescription || (summary ? summary.substring(0, 160) : null);

      await client.query(`
        INSERT INTO "ProjectTranslation" ("id", "projectId", "locale", "title", "summary", "content", "metaTitle", "metaDescription")
        VALUES ($1, $2, 'fr'::"Locale", $3, $4, $5, $6, $7)
        ON CONFLICT ("projectId", "locale") DO UPDATE
          SET "title" = EXCLUDED."title", "summary" = EXCLUDED."summary",
              "content" = EXCLUDED."content", "metaTitle" = EXCLUDED."metaTitle",
              "metaDescription" = EXCLUDED."metaDescription"
      `, [uid(), projectId, p.title, summary, content, metaTitle, metaDescription]);

      const galleryCount = Array.isArray(p.gallery) ? p.gallery.length : 0;
      console.log(`  ✅ Projet: ${p.title} (${galleryCount} gallery images)`);
    }
  } finally {
    client.release();
  }
}

// =====================================================================
//  FESTIVAL
// =====================================================================
async function importFestival() {
  const filePath = path.join(EXTRACT_DIR, 'festival.json');
  if (!fs.existsSync(filePath)) { console.log('⏭️  festival.json introuvable, skipped.'); return; }
  console.log('🎪 Importation Festival...');

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const editions = data.editions || data;  // Handle both { editions: [...] } and [...] formats
  const client = await pool.connect();

  try {
    for (const f of editions) {
      const mainImage = f.image || null;
      const heroImage = f.editionHeroImage || null;
      const gallery = Array.isArray(f.gallery) ? JSON.stringify(f.gallery) : null;
      const typography = Array.isArray(f.typography) ? JSON.stringify(f.typography) : null;

      // Handle null year — try to extract from summary or default to current year
      let year = f.year;
      if (!year && f.summary) {
        const yearMatch = f.summary.match(/(\d{4})/);
        if (yearMatch) year = parseInt(yearMatch[1], 10);
      }
      if (!year) {
        console.log(`  ⚠️  Skipping "${f.themeName}" — no year found`);
        continue;
      }

      const editionNumber = f.edition || 1;

      // Upsert FestivalEdition
      const existing = await client.query('SELECT "id" FROM "FestivalEdition" WHERE "slug" = $1', [f.slug]);
      let festivalId: string;

      if (existing.rows.length > 0) {
        festivalId = existing.rows[0].id;
        await client.query(`
          UPDATE "FestivalEdition" SET
            "editionNumber" = $2, "year" = $3, "city" = $4, "country" = 'SN',
            "status" = 'PUBLISHED'::"ProductStatus",
            "mainImage" = COALESCE($5, "mainImage"),
            "heroImage" = COALESCE($6, "heroImage"),
            "gallery" = COALESCE($7::jsonb, "gallery"),
            "typography" = COALESCE($8::jsonb, "typography"),
            "updatedAt" = NOW()
          WHERE "id" = $1
        `, [festivalId, editionNumber, year, f.city || null, mainImage, heroImage, gallery, typography]);
      } else {
        festivalId = uid();
        await client.query(`
          INSERT INTO "FestivalEdition" ("id", "slug", "editionNumber", "year", "city", "country", "status", "mainImage", "heroImage", "gallery", "typography", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, 'SN', 'PUBLISHED'::"ProductStatus", $6, $7, $8::jsonb, $9::jsonb, NOW(), NOW())
        `, [festivalId, f.slug, editionNumber, year, f.city || null, mainImage, heroImage, gallery, typography]);
      }

      // Upsert Translation
      await client.query(`
        INSERT INTO "FestivalTranslation" ("id", "festivalEditionId", "locale", "themeName", "summary", "content")
        VALUES ($1, $2, 'fr'::"Locale", $3, $4, $5)
        ON CONFLICT ("festivalEditionId", "locale") DO UPDATE
          SET "themeName" = EXCLUDED."themeName", "summary" = EXCLUDED."summary", "content" = EXCLUDED."content"
      `, [uid(), festivalId, f.themeName, f.summary || null, f.bio || null]);

      const galleryCount = Array.isArray(f.gallery) ? f.gallery.length : 0;
      console.log(`  ✅ Festival: ${f.themeName} (${f.year}) - ${galleryCount} gallery images`);
    }
  } finally {
    client.release();
  }
}

// =====================================================================
//  PRESS
// =====================================================================
async function importPress() {
  const filePath = path.join(EXTRACT_DIR, 'press.json');
  if (!fs.existsSync(filePath)) { console.log('⏭️  press.json introuvable, skipped.'); return; }
  console.log('📰 Importation Presse...');

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const client = await pool.connect();

  try {
    // Clear existing press mentions and re-insert
    await client.query('DELETE FROM "PressMention"');

    for (const p of items) {
      let date = null;
      if (p.date) date = new Date(p.date);

      await client.query(`
        INSERT INTO "PressMention" ("id", "title", "source", "sourceUrl", "logoUrl", "featuredImageUrl", "excerpt", "date", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [uid(), p.title, p.source, p.sourceUrl, p.logoUrl || null, p.featuredImageUrl || null, p.excerpt || null, date]);

      console.log(`  ✅ Presse: ${p.title}`);
    }
  } finally {
    client.release();
  }
}

// =====================================================================
//  HELPERS
// =====================================================================
function position_count(items: any[] | undefined): number {
  if (!items) return 0;
  return items.filter((i: any) => i?.cloudUrl).length;
}

// =====================================================================
//  MAIN
// =====================================================================
async function main() {
  console.log('🚀 Début de la migration JSON → PostgreSQL...');
  console.log(`📁 Répertoire source: ${EXTRACT_DIR}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
  
  // Test connection
  try {
    const res = await pool.query('SELECT NOW() as now');
    console.log(`✅ Connexion DB OK (${res.rows[0].now})\n`);
  } catch (err: any) {
    console.error('❌ Impossible de se connecter à la base de données:', err.message);
    process.exit(1);
  }

  await importArtists();
  await importProducts();
  await importProjects();
  await importFestival();
  await importPress();

  console.log('\n🎉 Base de données peuplée avec succès !');
}

main()
  .catch(e => {
    console.error('❌ ERREUR FATALE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

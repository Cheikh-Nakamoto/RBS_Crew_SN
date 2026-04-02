// @ts-ignore : Bypass TS resolution for monorepo workspace hoisting limitations
import { PrismaClient, Locale, ProductStatus } from '../node_modules/.prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const adapter = new PrismaPg(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });
const EXTRACT_DIR = path.resolve(__dirname, '../data/raw');

async function importArtists() {
  const filePath = path.join(EXTRACT_DIR, 'artists.json');
  if (!fs.existsSync(filePath)) return;
  console.log('🌟 Importation Artistes...');
  
  const artists = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const a of artists) {
    const featuredImageUrl = a.featuredImage?.cloudUrl ?? null;
    const avatarUrl = a.avatar?.cloudUrl ?? null;
    
    const artistRecord = await prisma.artist.upsert({
      where: { slug: a.slug },
      update: {
        wpId: a.wpId,
        country: a.country || 'SN',
        featuredImageUrl,
        avatarUrl,
        instagramUrl: a.instagramUrl,
        status: ProductStatus.PUBLISHED,
      },
      create: {
        slug: a.slug,
        wpId: a.wpId,
        country: a.country || 'SN',
        featuredImageUrl,
        avatarUrl,
        instagramUrl: a.instagramUrl,
        status: ProductStatus.PUBLISHED,
      }
    });

    // Upsert Translations
    await prisma.artistTranslation.upsert({
      where: { artistId_locale: { artistId: artistRecord.id, locale: Locale.fr } },
      update: { name: a.name, bio: a.bio },
      create: { artistId: artistRecord.id, locale: Locale.fr, name: a.name, bio: a.bio }
    });

    // Artworks — directly store the R2 URL
    if (a.artworks && Array.isArray(a.artworks)) {
      await prisma.artistArtwork.deleteMany({ where: { artistId: artistRecord.id } });
      
      let position = 0;
      for (const artwork of a.artworks) {
        const imageUrl = artwork?.cloudUrl;
        if (imageUrl) {
          await prisma.artistArtwork.create({
            data: { artistId: artistRecord.id, imageUrl, position }
          });
          position++;
        }
      }
    }
    console.log(`✅ Artiste inséré: ${a.name}`);
  }
}

async function importProjects() {
  const filePath = path.join(EXTRACT_DIR, 'projects.json');
  if (!fs.existsSync(filePath)) return;
  console.log('🌟 Importation Projets...');

  const projects = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const p of projects) {
    const featuredImageUrl = p.featuredImage?.cloudUrl ?? null;
    
    let completedAt = null;
    if (p.date) completedAt = new Date(p.date);

    const projectRecord = await prisma.project.upsert({
      where: { slug: p.slug },
      update: {
        featuredImageUrl,
        completedAt,
        status: ProductStatus.PUBLISHED,
      },
      create: {
        slug: p.slug,
        featuredImageUrl,
        completedAt,
        status: ProductStatus.PUBLISHED,
      }
    });

    await prisma.projectTranslation.upsert({
      where: { projectId_locale: { projectId: projectRecord.id, locale: Locale.fr } },
      update: { title: p.title, summary: p.excerpt, content: p.content },
      create: { projectId: projectRecord.id, locale: Locale.fr, title: p.title, summary: p.excerpt, content: p.content }
    });
    console.log(`✅ Projet inséré: ${p.title}`);
  }
}

async function importPress() {
  const filePath = path.join(EXTRACT_DIR, 'press.json');
  if (!fs.existsSync(filePath)) return;
  console.log('🌟 Importation Presse...');

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const p of items) {
    let date = null;
    if (p.date) date = new Date(p.date);

    await prisma.pressMention.create({
      data: {
        title: p.title,
        source: p.source,
        sourceUrl: p.sourceUrl,
        logoUrl: p.logoUrl,
        date: date
      }
    });
    console.log(`✅ Presse insérée: ${p.title}`);
  }
}

async function importFestival() {
  const filePath = path.join(EXTRACT_DIR, 'festival.json');
  if (!fs.existsSync(filePath)) return;
  console.log('🌟 Importation Festival...');

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const f of items) {
    const festRecord = await prisma.festivalEdition.upsert({
      where: { slug: f.slug },
      update: { editionNumber: f.edition, year: f.year, city: f.city, country: 'SN', wpId: f.wpId, status: ProductStatus.PUBLISHED },
      create: { slug: f.slug, editionNumber: f.edition, year: f.year, city: f.city, country: 'SN', wpId: f.wpId, status: ProductStatus.PUBLISHED }
    });

    await prisma.festivalTranslation.upsert({
      where: { festivalEditionId_locale: { festivalEditionId: festRecord.id, locale: Locale.fr } },
      update: { themeName: f.themeName, summary: f.summary, content: f.content },
      create: { festivalEditionId: festRecord.id, locale: Locale.fr, themeName: f.themeName, summary: f.summary, content: f.content }
    });
    console.log(`✅ Festival inséré: ${f.themeName} (${f.year})`);
  }
}

async function importProducts() {
  const filePath = path.join(EXTRACT_DIR, 'products.json');
  if (!fs.existsSync(filePath)) return;
  console.log('🌟 Importation Produits...');

  const products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const p of products) {
    const featuredImageUrl = p.featuredImage?.cloudUrl ?? null;
    let slugStr = p.slug;
    if (!slugStr || slugStr === '') {
      slugStr = `product-${p.wcId}`;
    }

    const prodRecord = await prisma.product.upsert({
      where: { wcId: p.wcId },
      update: {
        slug: slugStr,
        sku: p.sku || null,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
        manageStock: p.manageStock,
        status: ProductStatus.PUBLISHED,
        featuredImageUrl: featuredImageUrl,
      },
      create: {
        slug: slugStr,
        wcId: p.wcId,
        sku: p.sku || null,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        stock: p.stock,
        manageStock: p.manageStock,
        status: ProductStatus.PUBLISHED,
        featuredImageUrl: featuredImageUrl,
      }
    });

    await prisma.productTranslation.upsert({
      where: { productId_locale: { productId: prodRecord.id, locale: Locale.fr } },
      update: { name: p.name, description: p.description, shortDescription: p.shortDescription, slug: slugStr },
      create: { productId: prodRecord.id, locale: Locale.fr, name: p.name, description: p.description, shortDescription: p.shortDescription, slug: slugStr }
    });

    // Gallery
    if (p.gallery && Array.isArray(p.gallery)) {
      await prisma.productImage.deleteMany({ where: { productId: prodRecord.id } });
      
      for (const img of p.gallery) {
        if (img?.cloudUrl) {
          await prisma.productImage.create({
            data: { productId: prodRecord.id, imageUrl: img.cloudUrl, position: img.position || 0 }
          });
        }
      }
    }
  }
  console.log('✅ Importation des produits et de leurs images terminée !');
}

async function main() {
  console.log('🚀 Début de la migration des fichiers JSON vers PostgreSQL...');
  
  await prisma.pressMention.deleteMany({});
  
  await importArtists();
  await importProducts();
  await importProjects();
  await importFestival();
  await importPress();
  
  console.log('\n🎉 Base de données peuplée avec succès ! (Uniquement avec des liens Cloudflare)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

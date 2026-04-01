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

/**
 * 💡 RÈGLE CRITIQUE : Retourne NULL (ignore la création du Média)
 * SI ET SEULEMENT SI le script Cloudflare n'a pas traité l'image (`cloudUrl` absent).
 * Résultat : Seules les URLs Cloudflare S3 seront insérées dans la base de données.
 */
async function getOrCreateMedia(imageObj: any): Promise<string | null> {
  if (!imageObj || !imageObj.cloudUrl) return null;

  try {
    const url = imageObj.cloudUrl;
    // On cherche si l'image existe déjà via son URL exacte Cloudflare
    const existing = await prisma.media.findFirst({ where: { url } });
    if (existing) return existing.id;

    // Déduit filename et mimetype du lien cloud
    const filename = path.basename(new URL(url).pathname);
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'gif') mimeType = 'image/gif';

    const media = await prisma.media.create({
      data: {
        url,
        filename,
        mimeType,
        size: 0, // Inconnu localement, mis à 0 par défaut
        altText: imageObj.alt || imageObj.name || filename,
      }
    });
    return media.id;
  } catch (err) {
    console.error(`❌ Erreur Media creation: ${err}`);
    return null;
  }
}

async function importArtists() {
  const filePath = path.join(EXTRACT_DIR, 'artists.json');
  if (!fs.existsSync(filePath)) return;
  console.log('🌟 Importation Artisites...');
  
  const artists = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const a of artists) {
    // Media Links
    const featuredImageId = await getOrCreateMedia(a.featuredImage);
    const avatarId = await getOrCreateMedia(a.avatar);
    
    // Upsert Artist
    const artistRecord = await prisma.artist.upsert({
      where: { slug: a.slug },
      update: {
        wpId: a.wpId,
        country: a.country || 'SN',
        featuredImageId,
        avatarId, // Nouveau champ ajouté !
        status: ProductStatus.PUBLISHED,
      },
      create: {
        slug: a.slug,
        wpId: a.wpId,
        country: a.country || 'SN',
        featuredImageId,
        avatarId, // Nouveau champ ajouté !
        status: ProductStatus.PUBLISHED,
      }
    });

    // Upsert Translations
    await prisma.artistTranslation.upsert({
      where: { artistId_locale: { artistId: artistRecord.id, locale: Locale.fr } },
      update: { name: a.name, bio: a.bio },
      create: { artistId: artistRecord.id, locale: Locale.fr, name: a.name, bio: a.bio }
    });

    // Artworks logic
    if (a.artworks && Array.isArray(a.artworks)) {
      // Clear existants pour éviter duplication
      await prisma.artistArtwork.deleteMany({ where: { artistId: artistRecord.id } });
      
      let position = 0;
      for (const artwork of a.artworks) {
        const mediaId = await getOrCreateMedia(artwork);
        if (mediaId) {
          await prisma.artistArtwork.create({
            data: { artistId: artistRecord.id, mediaId, position }
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
    const featuredImageId = await getOrCreateMedia(p.featuredImage);
    
    let completedAt = null;
    if (p.date) completedAt = new Date(p.date);

    const projectRecord = await prisma.project.upsert({
      where: { slug: p.slug },
      update: {
        featuredImageId,
        completedAt,
        status: ProductStatus.PUBLISHED,
      },
      create: {
        slug: p.slug,
        featuredImageId,
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

async function main() {
  console.log('🚀 Début de la migration des fichiers JSON vers PostgreSQL...');
  
  // Suppression manuelle de la presse pour éviter les doublons successifs vu qu'il n'y a pas d'upsert slug dessus
  await prisma.pressMention.deleteMany({});
  
  await importArtists();
  await importProjects();
  await importFestival();
  await importPress();
  
  // Products a son propre script ou sera intégré si demandé
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

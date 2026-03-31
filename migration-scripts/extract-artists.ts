import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.WP_BASE_URL || 'https://rbsakademya.com/wp-json';
const WP_USER = process.env.WP_USER as string;
const WP_PASS = process.env.WP_APP_PASSWORD as string;
const wpAuth  = { username: WP_USER, password: WP_PASS };

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://rbs:password@localhost:5432/rbs_db' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function stripHtml(h: string) { return (h || '').replace(/<[^>]*>?/gm, '').trim(); }

const ARTIST_SLUGS = [
  'mad-zoo','diablos','xalima','nohine','akonga','beau-graff',
  'o-b','freemind','seika','zeuss','krafts','art-ona','refa-one',
  'elmemf-rbs','thiat','mora','daiinzo','bk-rbs','eldo',
];

async function fetchPageBySlug(slug: string): Promise<any | null> {
  try {
    const r1 = await axios.get(`${API_URL}/wp/v2/pages`, {
      auth: wpAuth,
      params: { slug, _fields: 'id,slug,title,content,excerpt,featured_media' },
    });
    if (r1.data.length > 0) return r1.data[0];
    const r2 = await axios.get(`${API_URL}/wp/v2/posts`, {
      auth: wpAuth,
      params: { slug, _fields: 'id,slug,title,content,excerpt,featured_media' },
    });
    return r2.data.length > 0 ? r2.data[0] : null;
  } catch { return null; }
}

async function upsertMediaFromId(mediaId: number, fallbackSlug: string): Promise<string | null> {
  if (!mediaId || mediaId === 0) return null;
  const existing = await prisma.media.findUnique({ where: { wpId: mediaId } });
  if (existing) return existing.id;
  try {
    const { data } = await axios.get(`${API_URL}/wp/v2/media/${mediaId}`, { auth: wpAuth });
    const created = await prisma.media.create({
      data: {
        wpId    : mediaId,
        filename: data.slug || fallbackSlug,
        mimeType: data.mime_type || 'image/jpeg',
        size    : data.media_details?.filesize || 0,
        url     : data.source_url || '',
        altText : data.alt_text || fallbackSlug,
      },
    });
    return created.id;
  } catch { return null; }
}

async function migrateArtists() {
  console.log('🎨 Extraction artistes RBS Crew...');
  let success = 0, skipped = 0;

  for (const slug of ARTIST_SLUGS) {
    const wpPage = await fetchPageBySlug(slug);
    if (!wpPage) {
      console.warn(`⚠️  Introuvable: "${slug}"`);
      skipped++;
      await delay(300);
      continue;
    }

    const featuredImageId = await upsertMediaFromId(wpPage.featured_media, slug);
    const name = stripHtml(wpPage.title?.rendered || slug);
    const bio  = stripHtml(wpPage.content?.rendered || '');

    const artist = await prisma.artist.upsert({
      where : { slug },
      update: { featuredImageId, wpId: wpPage.id },
      create: { slug, country: 'SN', featuredImageId, wpId: wpPage.id, status: 'PUBLISHED' },
    });

    await prisma.artistTranslation.upsert({
      where : { artistId_locale: { artistId: artist.id, locale: 'fr' } },
      update: { name, bio },
      create: { artistId: artist.id, locale: 'fr', name, bio },
    });

    console.log(`✅ "${name}"`);
    success++;
    await delay(400);
  }

  console.log(`\n🏁 ${success} artistes migrés, ${skipped} ignorés.`);
  await prisma.$disconnect();
}

migrateArtists();

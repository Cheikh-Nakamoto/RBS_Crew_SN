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

const PROJECT_SLUGS = [
  'penco',
  'ubuntu-cypher',
  'emission-rts-ecole-des-arts-a-rbs-akademya',
  'rbs-aerosoul-for-kingmakers-center',
  'ifc-banque-mondiale-dakar-senegal',
  'spray-4-congo',
  'musee-des-civilisations-noires',
  'les-grands-moulins',
  'biennale-de-dakar-15e-edition',
  'battle-rbs-crew',
  'a-queenz-joint',
  'canadian-embassy-by-rbs-crew',
  'universite-amadou-mahtar-mbow',
  'universite-cheikh-anta-diop',
];

async function fetchPageBySlug(slug: string): Promise<any | null> {
  try {
    const r1 = await axios.get(`${API_URL}/wp/v2/pages`, {
      auth: wpAuth,
      params: { slug, _fields: 'id,slug,title,content,excerpt,featured_media,date' },
    });
    if (r1.data.length > 0) return r1.data[0];
    const r2 = await axios.get(`${API_URL}/wp/v2/posts`, {
      auth: wpAuth,
      params: { slug, _fields: 'id,slug,title,content,excerpt,featured_media,date' },
    });
    return r2.data.length > 0 ? r2.data[0] : null;
  } catch { return null; }
}

async function upsertMedia(mediaId: number, fallbackSlug: string): Promise<string | null> {
  if (!mediaId || mediaId === 0) return null;
  const existing = await prisma.media.findUnique({ where: { wpId: mediaId } });
  if (existing) return existing.id;
  try {
    const { data } = await axios.get(`${API_URL}/wp/v2/media/${mediaId}`, { auth: wpAuth });
    return (await prisma.media.create({
      data: {
        wpId: mediaId, filename: data.slug || fallbackSlug,
        mimeType: data.mime_type || 'image/jpeg',
        size: data.media_details?.filesize || 0,
        url: data.source_url || '', altText: data.alt_text || fallbackSlug,
      },
    })).id;
  } catch { return null; }
}

async function migrateProjects() {
  console.log('🖼️  Extraction projets...');
  let success = 0, skipped = 0;

  for (const slug of PROJECT_SLUGS) {
    const wpPage = await fetchPageBySlug(slug);
    if (!wpPage) { skipped++; console.warn(`⚠️  Introuvable: "${slug}"`); await delay(300); continue; }

    const featuredImageId = await upsertMedia(wpPage.featured_media, slug);
    const completedAt     = wpPage.date ? new Date(wpPage.date) : null;
    const title           = stripHtml(wpPage.title?.rendered || slug);
    const summary         = stripHtml(wpPage.excerpt?.rendered || '');
    const content         = stripHtml(wpPage.content?.rendered || '');

    const project = await prisma.project.upsert({
      where : { slug },
      update: { featuredImageId, completedAt },
      create: { slug, featuredImageId, completedAt, status: 'PUBLISHED' },
    });

    await prisma.projectTranslation.upsert({
      where : { projectId_locale: { projectId: project.id, locale: 'fr' } },
      update: { title, summary, content },
      create: {
        projectId: project.id, locale: 'fr', title, summary, content,
        metaTitle: title, metaDescription: summary.substring(0, 160),
      },
    });

    console.log(`✅ "${title}"`);
    success++;
    await delay(400);
  }

  console.log(`\n🏁 ${success} projets migrés, ${skipped} ignorés.`);
  await prisma.$disconnect();
}

migrateProjects();

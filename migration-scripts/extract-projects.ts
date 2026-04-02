import axios from 'axios';
import * as dotenv from 'dotenv';
import { saveJson, downloadImage, stripHtml, cleanWordPressContent, delay } from './utils';
dotenv.config();

const API_URL = process.env.WP_BASE_URL || 'https://rbsakademya.com/wp-json';
const WP_USER = process.env.WP_USER as string;
const WP_PASS = process.env.WP_APP_PASSWORD as string;
const wpAuth  = { username: WP_USER, password: WP_PASS };

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

async function getMediaData(mediaId: number): Promise<{ url: string, alt: string, mime: string } | null> {
  if (!mediaId || mediaId === 0) return null;
  try {
    const { data } = await axios.get(`${API_URL}/wp/v2/media/${mediaId}`, { auth: wpAuth });
    return {
      url: data.source_url || '',
      alt: data.alt_text || '',
      mime: data.mime_type || 'image/jpeg',
    };
  } catch { return null; }
}

async function migrateProjects() {
  console.log('🖼️  Extraction projets vers JSON...');
  let success = 0, skipped = 0;
  const projectsData = [];

  for (const slug of PROJECT_SLUGS) {
    const wpPage = await fetchPageBySlug(slug);
    if (!wpPage) { skipped++; console.warn(`⚠️  Introuvable: "${slug}"`); await delay(300); continue; }

    const completedAt     = wpPage.date ? new Date(wpPage.date).toISOString() : null;
    const title           = stripHtml(wpPage.title?.rendered || slug);
    const summary         = stripHtml(wpPage.excerpt?.rendered || '');
    const content         = cleanWordPressContent(wpPage.content?.rendered || '');

    let localImagePath = null;
    let altText = slug;
    
    // Download featured image
    const media = await getMediaData(wpPage.featured_media);
    if (media && media.url) {
      localImagePath = await downloadImage(media.url, `project-${slug}`);
      if (media.alt) altText = media.alt;
    }

    projectsData.push({
      wpId: wpPage.id,
      slug,
      title,
      summary,
      content,
      completedAt,
      status: 'PUBLISHED',
      metaTitle: title,
      metaDescription: summary.substring(0, 160),
      featuredImage: localImagePath ? {
        path: localImagePath,
        alt: altText,
        originalUrl: media?.url
      } : null
    });

    console.log(`✅ "${title}" extrait`);
    success++;
    await delay(400);
  }

  saveJson('projects.json', projectsData);
  console.log(`\n🏁 ${success} projets extraits, ${skipped} ignorés.`);
}

migrateProjects();

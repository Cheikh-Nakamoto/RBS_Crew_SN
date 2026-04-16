import axios from 'axios';
import * as cheerio from 'cheerio';
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

/**
 * Scrape the actual rendered page to extract gallery images and structured text
 * that the WP REST API doesn't provide cleanly.
 */
async function scrapeProjectPage(slug: string): Promise<{ gallery: string[], description: string }> {
  const pageUrl = `https://rbsakademya.com/${slug}/`;
  const gallery: string[] = [];
  let description = '';

  try {
    console.log(`  📥 Scraping page: ${pageUrl}`);
    const { data: html } = await axios.get(pageUrl, { timeout: 15000 });
    const $ = cheerio.load(html);

    // ===== Extract gallery images =====
    // Images are in et_pb_image modules, either with lightbox links or plain img tags.
    // We collect all img[src] from the page body, filtering out logos, favicons, and duplicates.
    const seenBasenames = new Set<string>();

    $('img').each((_, imgEl) => {
      const src = $(imgEl).attr('src');
      if (!src) return;

      // Skip data URIs, logos, favicons, and sprite/theme assets
      if (src.includes('data:image')) return;
      if (src.includes('logo') || src.includes('favicon')) return;
      if (src.includes('cropped-RBS')) return;
      if (src.includes('fond-noir') || src.includes('spray')) return;

      // Normalize for dedup: remove -WIDTHxHEIGHT and -scaled suffixes
      const baseUrl = src.replace(/-\d+x\d+(\.\w+)$/, '$1').replace(/-scaled(\.\w+)$/, '$1');

      if (!seenBasenames.has(baseUrl)) {
        seenBasenames.add(baseUrl);
        gallery.push(src);
      }
    });

    // ===== Extract structured text =====
    // The main content lives in .et_pb_text_inner containers,
    // typically with <p>, <h2>, <h4> children.
    const textParts: string[] = [];
    
    // Get the page title from the hero section
    const pageTitle = $('.et_pb_text_inner h1, .et_pb_text_inner h2').first().text().trim();
    
    // Get all meaningful text paragraphs from the body (not footer)
    $('.et_pb_text_inner p').each((_, p) => {
      const pTxt = $(p).text().replace(/\s+/g, ' ').trim();
      // Filter out short meta text, footer/copyright, and contact info
      if (
        pTxt.length > 30 &&
        !pTxt.toLowerCase().includes('droits d\'auteur') &&
        !pTxt.toLowerCase().includes('more than a school') &&
        !pTxt.includes('contact@') &&
        !pTxt.includes('RBS LABZ') &&
        !pTxt.includes('Guédiewaye')
      ) {
        textParts.push(pTxt);
      }
    });

    description = textParts.join('\n\n').trim();
    console.log(`  ✅ Gallery: ${gallery.length} images, Description: ${description.length} chars`);
  } catch (e: any) {
    console.log(`  ⚠️  Failed to scrape ${pageUrl}: ${e.message}`);
  }

  return { gallery, description };
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

    // ===== NEW: Scrape the actual page for gallery + structured text =====
    const { gallery, description } = await scrapeProjectPage(slug);

    projectsData.push({
      wpId: wpPage.id,
      slug,
      title,
      summary,
      content,
      // Use the scraped description if the WP content is mostly HTML garbage
      description: description || null,
      completedAt,
      status: 'PUBLISHED',
      metaTitle: title,
      metaDescription: summary.substring(0, 160),
      featuredImage: localImagePath ? {
        path: localImagePath,
        alt: altText,
        originalUrl: media?.url
      } : null,
      // Gallery images scraped from the actual page
      gallery: gallery.length > 0 ? gallery.slice(0, 20) : [],
    });

    console.log(`✅ "${title}" extrait (${gallery.length} gallery images)`);
    success++;
    await delay(400);
  }

  saveJson('projects.json', projectsData);
  console.log(`\n🏁 ${success} projets extraits, ${skipped} ignorés.`);
}

migrateProjects();

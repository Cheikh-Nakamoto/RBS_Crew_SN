import axios from 'axios';
import * as dotenv from 'dotenv';
import { saveJson, downloadImage, stripHtml, delay } from './utils';
dotenv.config();

const API_URL = process.env.WP_BASE_URL || 'https://rbsakademya.com/wp-json';
const WP_USER = process.env.WP_USER as string;
const WP_PASS = process.env.WP_APP_PASSWORD as string;
const wpAuth  = { username: WP_USER, password: WP_PASS };

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

async function migrateArtists() {
  console.log('🎨 Extraction artistes RBS Crew vers JSON...');
  let success = 0, skipped = 0;
  const artistsData = [];

  // Parse avatars from parent page "rbs-crew"
  const avatarMap: Record<string, string> = {};
  const parentPage = await fetchPageBySlug('rbs-crew');
  if (parentPage?.content?.rendered) {
    const blurbs = parentPage.content.rendered.match(/\[et_pb_blurb[^\]]*\]/gi) || [];
    for (const blurb of blurbs) {
      const urlMatch = blurb.match(/url=[\s"'\u00BB]*(https?:\/\/[^\s"']+)[\s"']/i);
      const imgMatch = blurb.match(/image=[\s"'\u00BB]*(https?:\/\/[^\s"']+\.(?:jpg|png|jpeg|webp))[\s"']/i);
      if (urlMatch && imgMatch) {
        const cleanUrlMatch = urlMatch[1].match(/rbsakademya\.com\/(?:rbs-crew\/)?([^\/]+)\/?/);
        if (cleanUrlMatch) {
          avatarMap[cleanUrlMatch[1]] = imgMatch[1];
        }
      }
    }
  }

  for (const slug of ARTIST_SLUGS) {
    const wpPage = await fetchPageBySlug(slug);
    if (!wpPage) {
      console.warn(`⚠️  Introuvable: "${slug}"`);
      skipped++;
      await delay(300);
      continue;
    }

    const name = stripHtml(wpPage.title?.rendered || slug);
    let localImagePath = null;
    let altText = slug;
    
    // Fallback: search for all images embedded in Divi content
    const rawContent = wpPage.content?.rendered || '';
    const matches = rawContent.match(/https?:\/\/[^"'\s\u00A0\u00BB]+\.(?:jpg|jpeg|png|webp|gif)/gi);
    const embeddedImageUrls: string[] = matches ? Array.from(new Set(matches)) : [];
    
    // Clean the bio from Divi shortcodes [et_pb_...]
    const cleanBioText = rawContent.replace(/\[\/?et_pb_[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    // Use utils stripHtml to remove remaining tags
    const bio = stripHtml(cleanBioText);
    
    // Try to get featured media from native WP meta
    const media = await getMediaData(wpPage.featured_media);
    if (media && media.url) {
      localImagePath = await downloadImage(media.url, `artist-${slug}`);
      if (media.alt) altText = media.alt;
    } else {
      if (embeddedImageUrls.length > 0) {
        // use the first image as featured image fallback
        localImagePath = await downloadImage(embeddedImageUrls[0], `artist-${slug}`);
      }
    }

    let localAvatarPath = null;
    if (avatarMap[slug]) {
      localAvatarPath = await downloadImage(avatarMap[slug], `artist-avatar-${slug}`);
    }

    const artworks = [];
    for (let i = 0; i < embeddedImageUrls.length; i++) {
      const url = embeddedImageUrls[i];
      const artworkPath = await downloadImage(url, `artist-artwork-${slug}-${i+1}`);
      if (artworkPath) {
        artworks.push({ path: artworkPath, originalUrl: url });
      }
    }

    const igMatch = rawContent.match(/https?:\/\/(?:www\.)?instagram\.com\/([^"'\s\u00A0\u00BB\/]+)/i);
    const instagramUrl = igMatch ? `https://instagram.com/${igMatch[1]}` : null;

    artistsData.push({
      wpId: wpPage.id,
      slug,
      name,
      bio,
      country: 'SN',
      status: 'PUBLISHED',
      instagramUrl,
      avatar: localAvatarPath ? {
        path: localAvatarPath,
        originalUrl: avatarMap[slug]
      } : null, // Modifié: remplit automatiquement
      artworks: artworks, // Downloaded embedded images
      featuredImage: localImagePath ? {
        path: localImagePath,
        alt: altText,
        originalUrl: media?.url || (localImagePath ? localImagePath : null)
      } : null
    });

    console.log(`✅ "${name}" extrait`);
    success++;
    await delay(400);
  }

  saveJson('artists.json', artistsData);
  console.log(`\n🏁 ${success} artistes extraits, ${skipped} ignorés.`);
}

migrateArtists();

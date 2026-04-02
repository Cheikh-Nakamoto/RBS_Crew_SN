import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const DATA_DIR = path.resolve(__dirname, '../data/raw');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

export function saveJson(filename: string, data: any) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 Saved ${data.length} records to ${filePath}`);
}

export async function downloadImage(url: string, filename: string): Promise<string | null> {
  if (!url) return null;
  
  // Basic sanity check and sanitize filename
  const safeFilename = filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
  
  // Extension check
  let ext = path.extname(new URL(url).pathname) || '.jpg';
  const finalFilename = safeFilename.endsWith(ext) ? safeFilename : `${safeFilename}${ext}`;
  const filePath = path.join(IMAGES_DIR, finalFilename);
  
  // Always return relative path from data/raw
  const relPath = `images/${finalFilename}`;

  if (fs.existsSync(filePath)) {
    return relPath;
  }

  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(relPath));
      writer.on('error', reject);
    });
  } catch (error: any) {
    console.error(`❌ Failed to download image ${url}:`, error.message);
    return null;
  }
}

export function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  const entities: { [key: string]: string } = {
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8216;': '‘',
    '&#8217;': '’',
    '&#8220;': '“',
    '&#8221;': '”',
    '&#8230;': '...',
    '&nbsp;': ' ',
    '&amp;': '&',
    '&#038;': '&',
    '&quot;': '"',
    '&#039;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#39;': "'",
    '&apos;': "'",
    '&Prime;': '"',
    '&rsquo;': "’",
    '&lsquo;': "‘",
    '&ldquo;': "“",
    '&rdquo;': "”",
    '&hellip;': "...",
    '&ndash;': "–",
    '&mdash;': "—"
  };
  return text.replace(/&#?\w+;/g, match => entities[match] || match);
}

export function cleanWordPressContent(content: string): string {
  if (!content) return '';
  let cleaned = content;
  
  // 1. Decode basic entities first
  cleaned = decodeHTMLEntities(cleaned);

  // 2. Fix weird french quotes used by Divi/wptexturize
  cleaned = cleaned.replace(/ »/g, '"').replace(/« /g, '"');

  // 3. Remove all Divi and WordPress shortcodes like [et_pb_text ...] or [/et_pb_text]
  cleaned = cleaned.replace(/\[\/?et_pb_[^\]]+\]/g, '');
  
  // 4. Clean up leftover shortcode closing brackets if any
  cleaned = cleaned.replace(/\[\/?et_pb_[^\]]+$/g, '');

  return cleaned.trim();
}

export function stripHtml(h: string): string { 
  if (!h) return '';
  let noHtm = h.replace(/<[^>]*>?/gm, '').trim().replace(/\n/g, ' '); 
  noHtm = decodeHTMLEntities(noHtm);
  return cleanWordPressContent(noHtm);
}

export function delay(ms: number) { 
  return new Promise(r => setTimeout(r, ms)); 
}

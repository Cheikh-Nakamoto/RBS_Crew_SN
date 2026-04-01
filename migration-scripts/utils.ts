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

export function stripHtml(h: string) { 
  return (h || '').replace(/<[^>]*>?/gm, '').trim().replace(/\n/g, ' '); 
}

export function delay(ms: number) { 
  return new Promise(r => setTimeout(r, ms)); 
}

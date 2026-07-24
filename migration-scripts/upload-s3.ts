import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { delay } from './utils';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://media.rbscrew.com

const EXTRACT_DIR = path.resolve(__dirname, process.env.EXTRACT_DIR || '../data/raw');

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error("❌ Identifiants Cloudflare R2 manquants dans le .env");
  console.error("Veuillez configurer R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, et R2_PUBLIC_URL.");
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function getMimeType(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

/**
 * Upload a local file to R2 and return the public URL.
 */
async function uploadLocalFile(localPath: string): Promise<string | null> {
  const absolutePath = path.resolve(EXTRACT_DIR, localPath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`⚠️  Fichier introuvable en local: ${absolutePath}`);
    return null;
  }
  
  const fileName = path.basename(localPath);
  const fileContent = fs.readFileSync(absolutePath);
  const mimeType = getMimeType(fileName);

  try {
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: fileContent,
      ContentType: mimeType,
    }));
    
    return `${R2_PUBLIC_URL!.replace(/\/$/, '')}/${fileName}`;
  } catch (err: any) {
    console.error(`❌ Erreur lors de l'upload de ${fileName}:`, err?.message);
    return null;
  }
}

/**
 * Download a remote image URL, upload to R2, and return the public R2 URL.
 * Uses a content-based hash for the filename to avoid duplicates.
 * Returns null if the URL is already an R2 URL or download fails.
 */
async function uploadRemoteUrl(remoteUrl: string, prefix: string = ''): Promise<string | null> {
  if (!remoteUrl) return null;
  
  // Already an R2 URL? Skip.
  if (remoteUrl.includes('r2.dev') || remoteUrl.includes('rbscrew.com')) {
    return remoteUrl;
  }

  try {
    // Derive a consistent filename from the URL
    const urlPath = new URL(remoteUrl).pathname;
    const ext = path.extname(urlPath) || '.jpg';
    // Use the original filename from the URL for readability
    let baseName = path.basename(urlPath, ext).replace(/-scaled$/, '').replace(/-\d+x\d+$/, '');
    if (prefix) baseName = `${prefix}-${baseName}`;
    const r2Key = `${baseName}${ext}`.toLowerCase().replace(/[^a-z0-9._-]/g, '_');

    // Check if this key already exists in R2 to avoid re-uploading
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }));
      // Already uploaded
      return `${R2_PUBLIC_URL!.replace(/\/$/, '')}/${r2Key}`;
    } catch {
      // Not found, proceed with upload
    }
    
    // Download the image
    const response = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const buffer = Buffer.from(response.data);
    const mimeType = getMimeType(r2Key);

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: mimeType,
    }));

    return `${R2_PUBLIC_URL!.replace(/\/$/, '')}/${r2Key}`;
  } catch (err: any) {
    console.error(`❌ Erreur download/upload ${remoteUrl}:`, err?.message);
    return null;
  }
}

/**
 * Process local image objects (path-based, from artists/products extraction).
 * These have a { path, cloudUrl? } structure.
 */
async function processObjectImages(obj: any): Promise<void> {
  if (!obj) return;
  
  // Handle arrays of image objects with { path, cloudUrl }
  const arrayFields = ['artworks', 'images'];
  for (const field of arrayFields) {
    if (Array.isArray(obj[field])) {
      for (const item of obj[field]) {
        if (item && item.path && !item.cloudUrl) {
          console.log(`☁️  Upload local: ${item.path}...`);
          const cloudUrl = await uploadLocalFile(item.path);
          if (cloudUrl) {
            item.cloudUrl = cloudUrl;
            console.log(`✅ ${cloudUrl}`);
            await delay(100);
          }
        }
      }
    }
  }

  // Handle single image objects with { path, cloudUrl, originalUrl }
  const objectFields = ['featuredImage', 'avatar'];
  for (const field of objectFields) {
    const img = obj[field];
    if (!img || img.cloudUrl) continue;
    let cloudUrl: string | null = null;
    if (img.path) {
      console.log(`☁️  Upload local: ${img.path}...`);
      cloudUrl = await uploadLocalFile(img.path);
    }
    // Le fichier local a pu être purgé après l'extraction : on retombe sur
    // l'URL source WordPress, toujours référencée dans le JSON.
    if (!cloudUrl && img.originalUrl) {
      console.log(`☁️  Upload distant (fallback): ${img.originalUrl}...`);
      cloudUrl = await uploadRemoteUrl(img.originalUrl, obj.slug || '');
    }
    if (cloudUrl) {
      img.cloudUrl = cloudUrl;
      console.log(`✅ ${cloudUrl}`);
      await delay(100);
    }
  }

  // Handle gallery arrays of raw URL strings (from projects/festivals)
  // Convert them to R2 URLs in-place
  if (Array.isArray(obj.gallery)) {
    const uploadedGallery: string[] = [];
    for (const item of obj.gallery) {
      if (typeof item === 'string') {
        // Raw URL from festival/project scraping
        const cloudUrl = await uploadRemoteUrl(item, obj.slug || '');
        if (cloudUrl) {
          uploadedGallery.push(cloudUrl);
          console.log(`✅ Gallery: ${cloudUrl}`);
        }
        await delay(80);
      } else if (item && typeof item === 'object') {
        // { path, cloudUrl } from products
        if (item.cloudUrl) {
          uploadedGallery.push(item.cloudUrl);
        } else if (item.path) {
          const cloudUrl = await uploadLocalFile(item.path);
          if (cloudUrl) {
            item.cloudUrl = cloudUrl;
            uploadedGallery.push(cloudUrl);
            console.log(`✅ Gallery: ${cloudUrl}`);
          }
          await delay(80);
        }
      }
    }
    // For string-array galleries (festivals/projects), replace the array
    if (obj.gallery.length > 0 && typeof obj.gallery[0] === 'string') {
      obj.gallery = uploadedGallery;
    }
  }

  // Handle top-level image URL strings (festival editions: image, editionHeroImage)
  const urlFields = ['image', 'editionHeroImage', 'heroImage', 'mainImage'];
  for (const field of urlFields) {
    if (obj[field] && typeof obj[field] === 'string' && !obj[field].includes('r2.dev') && !obj[field].includes('rbscrew.com')) {
      console.log(`☁️  Upload URL (${field}): ${obj[field].substring(0, 60)}...`);
      const cloudUrl = await uploadRemoteUrl(obj[field], obj.slug || '');
      if (cloudUrl) {
        obj[field] = cloudUrl;
        console.log(`✅ ${field}: ${cloudUrl}`);
        await delay(80);
      }
    }
  }
}

async function main() {
  console.log('🚀 Début de l\'upload en masse vers Cloudflare R2 S3');
  
  // ===== 1. Artists (local files) =====
  const artistsPath = path.join(EXTRACT_DIR, 'artists.json');
  if (fs.existsSync(artistsPath)) {
    console.log('\n📂 Artists...');
    const data = JSON.parse(fs.readFileSync(artistsPath, 'utf-8'));
    for (const item of data) {
      await processObjectImages(item);
    }
    fs.writeFileSync(artistsPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 artists.json mis à jour (${data.length} artistes).`);
  }

  // ===== 2. Products (local files + gallery objects) =====
  const productsPath = path.join(EXTRACT_DIR, 'products.json');
  if (fs.existsSync(productsPath)) {
    console.log('\n📂 Products...');
    const data = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    for (const item of data) {
      await processObjectImages(item);
    }
    fs.writeFileSync(productsPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 products.json mis à jour (${data.length} produits).`);
  }

  // ===== 3. Projects (remote URL gallery + featuredImage object) =====
  const projectsPath = path.join(EXTRACT_DIR, 'projects.json');
  if (fs.existsSync(projectsPath)) {
    console.log('\n📂 Projects...');
    const data = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    for (const item of data) {
      await processObjectImages(item);
    }
    fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 projects.json mis à jour (${data.length} projets).`);
  }

  // ===== 4. Festival (remote URL gallery + image/hero strings) =====
  const festivalPath = path.join(EXTRACT_DIR, 'festival.json');
  if (fs.existsSync(festivalPath)) {
    console.log('\n📂 Festival...');
    const data = JSON.parse(fs.readFileSync(festivalPath, 'utf-8'));
    
    // Process projectInfo-level images
    if (data.projectInfo) {
      if (data.projectInfo.heroImage) {
        const url = await uploadRemoteUrl(data.projectInfo.heroImage, 'festival');
        if (url) data.projectInfo.heroImage = url;
      }
      if (data.projectInfo.logo) {
        const url = await uploadRemoteUrl(data.projectInfo.logo, 'festival');
        if (url) data.projectInfo.logo = url;
      }
      if (Array.isArray(data.projectInfo.partners)) {
        for (let i = 0; i < data.projectInfo.partners.length; i++) {
          const url = await uploadRemoteUrl(data.projectInfo.partners[i], 'partner');
          if (url) data.projectInfo.partners[i] = url;
          await delay(80);
        }
      }
    }
    
    // Process each edition
    if (Array.isArray(data.editions)) {
      for (const edition of data.editions) {
        await processObjectImages(edition);
      }
    }
    
    fs.writeFileSync(festivalPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 festival.json mis à jour (${data.editions?.length || 0} éditions).`);
  }

  console.log('\n🏁 Opération d\'Upload Cloudflare terminée.');
}

main().catch(console.error);

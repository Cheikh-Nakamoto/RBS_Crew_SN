import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
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

async function uploadFile(localPath: string): Promise<string | null> {
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
      Key: fileName, // On uploade directement à la racine du bucket
      Body: fileContent,
      ContentType: mimeType,
    }));
    
    // Génération de l'URL finale avec le custom domain R2
    return `${R2_PUBLIC_URL!.replace(/\/$/, '')}/${fileName}`;
  } catch (err: any) {
    console.error(`❌ Erreur lors de l'upload de ${fileName}:`, err?.message);
    return null;
  }
}

async function processObjectImages(obj: any): Promise<void> {
  if (!obj) return;
  
  // Mettre à jour les tableaux d'images (ex: artworks, images de produits)
  const arrayFields = ['artworks', 'images'];
  for (const field of arrayFields) {
    if (Array.isArray(obj[field])) {
      for (const item of obj[field]) {
        // Seulement s'il y a un chemin local et pas encore de lien cloud
        if (item && item.path && !item.cloudUrl) {
          console.log(`☁️  Upload: ${item.path}...`);
          const cloudUrl = await uploadFile(item.path);
          if (cloudUrl) {
            item.cloudUrl = cloudUrl;
            console.log(`✅ Cloud URL: ${cloudUrl}`);
            await delay(100); // Éviter de surcharger l'API R2 (Rate limiting)
          }
        }
      }
    }
  }

  // Mettre à jour les objets d'images (ex: featuredImage, avatar)
  const objectFields = ['featuredImage', 'avatar'];
  for (const field of objectFields) {
    if (obj[field] && obj[field].path && !obj[field].cloudUrl) {
      console.log(`☁️  Upload: ${obj[field].path}...`);
      const cloudUrl = await uploadFile(obj[field].path);
      if (cloudUrl) {
        obj[field].cloudUrl = cloudUrl;
        console.log(`✅ Cloud URL: ${cloudUrl}`);
        await delay(100);
      }
    }
  }
}

async function main() {
  console.log('🚀 Début de l\'upload en masse vers Cloudflare R2 S3');
  
  const filesToProcess = ['artists.json', 'projects.json', 'products.json'];

  for (const filename of filesToProcess) {
    const filePath = path.join(EXTRACT_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    console.log(`\n📂 Scan du fichier JSON: ${filename}`);
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // Parcourir chaque entrée du JSON
    let c = 0;
    for (const item of data) {
      await processObjectImages(item);
      c++;
    }
    
    // Sauvegarder le JSON modifié
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Fichier JSON mis à jour après la vérification de ${c} entrées: ${filename}`);
  }
  
  console.log('\n🏁 Opération d\'Upload Cloudflare terminée.');
}

main().catch(console.error);

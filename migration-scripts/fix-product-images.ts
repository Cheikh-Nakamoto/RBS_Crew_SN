/**
 * Réparation ciblée des images produits.
 *
 * Contexte : les produits ont été importés sans image car, au moment de
 * l'import, `featuredImage.cloudUrl` était null (l'étape upload-s3 n'avait pas
 * tourné, et les fichiers locaux ont depuis été purgés). Le JSON conserve
 * cependant `featuredImage.originalUrl` (URL WordPress source).
 *
 * Ce script, pour chaque produit de data/raw/products.json :
 *   1. télécharge l'image depuis originalUrl et la pousse vers R2,
 *   2. réécrit cloudUrl dans products.json,
 *   3. met à jour "Product"."featuredImageUrl" en base (clé = wcId).
 *
 * Idempotent : HeadObject évite un ré-upload, et l'UPDATE ne touche que les
 * lignes ciblées. N'écrase jamais une image déjà présente en base.
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
  console.error('❌ Identifiants Cloudflare R2 manquants dans le .env');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://rbs:password@localhost:5435/rbs_db');
const isLocal = ['localhost', '127.0.0.1'].includes(dbUrl.hostname);
const pool = new Pool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 5432,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.substring(1),
  // Railway (et tout Postgres managé) impose TLS ; le certificat n'est pas
  // vérifiable côté client via l'URL proxy, d'où rejectUnauthorized:false.
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

function getMimeType(fileName: string): string {
  switch (fileName.toLowerCase().split('.').pop()) {
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'image/jpeg';
  }
}

async function uploadRemoteUrl(remoteUrl: string, prefix = ''): Promise<string | null> {
  if (!remoteUrl) return null;
  if (remoteUrl.includes('r2.dev') || remoteUrl.includes('rbscrew.com')) return remoteUrl;

  const urlPath = new URL(remoteUrl).pathname;
  const ext = path.extname(urlPath) || '.jpg';
  let baseName = path.basename(urlPath, ext).replace(/-scaled$/, '').replace(/-\d+x\d+$/, '');
  if (prefix) baseName = `${prefix}-${baseName}`;
  const r2Key = `${baseName}${ext}`.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  const publicUrl = `${R2_PUBLIC_URL!.replace(/\/$/, '')}/${r2Key}`;

  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }));
    return publicUrl; // déjà présent
  } catch {
    // pas trouvé → upload
  }

  try {
    const res = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 30000 });
    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: Buffer.from(res.data),
      ContentType: getMimeType(r2Key),
    }));
    return publicUrl;
  } catch (err: any) {
    console.error(`❌ Upload échoué ${remoteUrl}:`, err?.message);
    return null;
  }
}

async function main() {
  const productsPath = path.resolve(__dirname, '../data/raw/products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  let updated = 0;
  const client = await pool.connect();
  try {
    for (const p of products) {
      const fi = p.featuredImage;
      if (!fi) {
        console.log(`⏭️  ${p.wcId} (${p.sku}) — pas de featuredImage`);
        continue;
      }

      let cloudUrl: string | null = fi.cloudUrl ?? null;
      if (!cloudUrl && fi.originalUrl) {
        cloudUrl = await uploadRemoteUrl(fi.originalUrl, p.slug || String(p.wcId));
        if (cloudUrl) fi.cloudUrl = cloudUrl;
      }

      if (!cloudUrl) {
        console.warn(`⚠️  ${p.wcId} (${p.sku}) — aucune URL exploitable`);
        continue;
      }

      // Ne remplit que si l'image manque en base (on n'écrase rien).
      const r = await client.query(
        `UPDATE "Product"
         SET "featuredImageUrl" = $1, "updatedAt" = NOW()
         WHERE "wcId" = $2 AND "featuredImageUrl" IS NULL`,
        [cloudUrl, p.wcId],
      );
      if (r.rowCount && r.rowCount > 0) {
        updated += r.rowCount;
        console.log(`✅ ${p.wcId} (${p.sku}) → ${cloudUrl}`);
      } else {
        console.log(`↔️  ${p.wcId} (${p.sku}) — déjà une image ou wcId absent`);
      }
    }
  } finally {
    client.release();
  }

  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf-8');
  await pool.end();
  console.log(`\n🏁 Terminé. ${updated} produit(s) mis à jour en base.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

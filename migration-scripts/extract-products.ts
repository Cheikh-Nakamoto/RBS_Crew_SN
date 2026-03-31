import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

// FIX #1 : WC_KEY/WC_SECRET → WC_CONSUMER_KEY/WC_CONSUMER_SECRET
const API_URL   = process.env.WP_BASE_URL || 'https://rbsakademya.com/wp-json';
const WC_KEY    = process.env.WC_CONSUMER_KEY    as string;
const WC_SECRET = process.env.WC_CONSUMER_SECRET as string;

if (!WC_KEY || !WC_SECRET) {
  console.error('❌ WC_CONSUMER_KEY ou WC_CONSUMER_SECRET manquants dans .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://rbs:password@localhost:5432/rbs_db' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function stripHtml(h: string) { return (h || '').replace(/<[^>]*>?/gm, '').trim(); }

// FIX #4 : Pagination (WooCommerce = 10/page par défaut, max 100)
async function fetchAllProducts(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const { data, headers } = await axios.get(`${API_URL}/wc/v3/products`, {
      params: { 
        consumer_key: WC_KEY,
        consumer_secret: WC_SECRET,
        per_page: 100, 
        page 
      },
    });
    all.push(...data);
    const totalPages = parseInt(headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page++;
    await delay(300);
  }
  return all;
}

// FIX #5 : Migration des images vers Media
async function upsertMedia(img: any): Promise<string | null> {
  if (!img?.id) return null;
  const existing = await prisma.media.findUnique({ where: { wpId: img.id } });
  if (existing) return existing.id;
  const created = await prisma.media.create({
    data: {
      filename : img.name || img.slug || 'image',
      mimeType : img.mime_type || 'image/jpeg',
      size     : img.media_details?.filesize || 0,
      url      : img.src || img.source_url || '',
      altText  : img.alt || null,
      wpId     : img.id,
    },
  });
  return created.id;
}

async function migrateProducts() {
  console.log('🔄 Démarrage extraction WooCommerce...');
  try {
    const wpProducts = await fetchAllProducts();
    console.log(`📦 ${wpProducts.length} produit(s) trouvés.`);

    for (const wpProd of wpProducts) {
      // FIX #2 : wcId (pas wpId) | FIX #3 : slug obligatoire
      const product = await prisma.product.upsert({
        where : { wcId: wpProd.id },
        update: {},
        create: {
          wcId          : wpProd.id,
          slug          : wpProd.slug,
          sku           : wpProd.sku || null,
          price         : parseFloat(wpProd.price)         || 0,
          compareAtPrice: parseFloat(wpProd.regular_price) || undefined,
          stock         : wpProd.stock_quantity            ?? 0,
          manageStock   : wpProd.manage_stock              ?? true,
          status        : 'PUBLISHED',
        },
      });

      // Image principale + galerie
      const featuredImg = wpProd.images?.[0];
      if (featuredImg?.id) {
        const mediaId = await upsertMedia(featuredImg);
        if (mediaId) {
          await prisma.product.update({
            where: { id: product.id },
            data : { featuredImageId: mediaId },
          });
          for (let i = 1; i < (wpProd.images?.length || 0); i++) {
            const gId = await upsertMedia(wpProd.images[i]);
            if (gId) {
              await prisma.productImage.upsert({
                where : { productId_mediaId: { productId: product.id, mediaId: gId } },
                update: {},
                create: { productId: product.id, mediaId: gId, position: i },
              });
            }
          }
        }
      }

      // FIX #2 : "locale" (enum) pas "language" (string)
      await prisma.productTranslation.upsert({
        where : { productId_locale: { productId: product.id, locale: 'fr' } },
        update: {
          name            : wpProd.name,
          description     : stripHtml(wpProd.description),
          shortDescription: stripHtml(wpProd.short_description),
        },
        create: {
          productId       : product.id,
          locale          : 'fr',
          name            : wpProd.name,
          description     : stripHtml(wpProd.description),
          shortDescription: stripHtml(wpProd.short_description),
          slug            : wpProd.slug,
          metaTitle       : wpProd.name,
          metaDescription : stripHtml(wpProd.short_description),
        },
      });

      // Catégories
      for (const cat of (wpProd.categories || [])) {
        let category = await prisma.category.findUnique({ where: { wpId: cat.id } });
        if (!category) {
          category = await prisma.category.create({ data: { slug: cat.slug, wpId: cat.id } });
          await prisma.categoryTranslation.create({
            data: { categoryId: category.id, locale: 'fr', name: cat.name },
          });
        }
        await prisma.productCategory.upsert({
          where : { productId_categoryId: { productId: product.id, categoryId: category.id } },
          update: {},
          create: { productId: product.id, categoryId: category.id },
        });
      }

      // Tags
      for (const t of (wpProd.tags || [])) {
        let tag = await prisma.tag.findUnique({ where: { wpId: t.id } });
        if (!tag) {
          tag = await prisma.tag.create({ data: { slug: t.slug, wpId: t.id } });
          await prisma.tagTranslation.create({ data: { tagId: tag.id, locale: 'fr', name: t.name } });
        }
        await prisma.productTag.upsert({
          where : { productId_tagId: { productId: product.id, tagId: tag.id } },
          update: {},
          create: { productId: product.id, tagId: tag.id },
        });
      }

      console.log(`✅ "${wpProd.name}" migré (wcId: ${wpProd.id})`);
      await delay(400);
    }
  } catch (err: any) {
    console.error('❌ Erreur:', err?.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
    console.log('🏁 extract-products terminé.');
  }
}

migrateProducts();

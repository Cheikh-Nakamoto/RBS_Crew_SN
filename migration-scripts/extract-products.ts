import axios from 'axios';
import * as dotenv from 'dotenv';
import { saveJson, downloadImage, stripHtml, delay } from './utils';
dotenv.config();

// FIX #1 : WC_KEY/WC_SECRET → WC_CONSUMER_KEY/WC_CONSUMER_SECRET
const API_URL   = process.env.WP_BASE_URL || 'https://rbsakademya.com/wp-json';
const WC_KEY    = process.env.WC_CONSUMER_KEY    as string;
const WC_SECRET = process.env.WC_CONSUMER_SECRET as string;

if (!WC_KEY || !WC_SECRET) {
  console.error('❌ WC_CONSUMER_KEY ou WC_CONSUMER_SECRET manquants dans .env');
  process.exit(1);
}

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

async function getLocalImage(img: any): Promise<{ path: string, alt: string, originalUrl: string } | null> {
  if (!img?.id || !img.src) return null;
  const url = img.src || img.source_url;
  const name = img.name || img.slug || `product-${img.id}`;
  
  const localImagePath = await downloadImage(url, name);
  if (localImagePath) {
    return {
      path: localImagePath,
      alt: img.alt || name,
      originalUrl: url
    };
  }
  return null;
}

async function migrateProducts() {
  console.log('🔄 Démarrage extraction WooCommerce vers JSON...');
  try {
    const wpProducts = await fetchAllProducts();
    console.log(`📦 ${wpProducts.length} produit(s) trouvés.`);
    
    const productsData = [];

    for (const wpProd of wpProducts) {
      // Image principale
      let featuredImage = null;
      if (wpProd.images?.[0]) {
        featuredImage = await getLocalImage(wpProd.images[0]);
      }
      
      // Images de la galerie
      const gallery = [];
      for (let i = 1; i < (wpProd.images?.length || 0); i++) {
        const item = await getLocalImage(wpProd.images[i]);
        if (item) gallery.push({ ...item, position: i });
      }

      // Catégories
      const categories = (wpProd.categories || []).map((cat: any) => ({
        wpId: cat.id,
        slug: cat.slug,
        name: cat.name
      }));

      // Tags
      const tags = (wpProd.tags || []).map((t: any) => ({
        wpId: t.id,
        slug: t.slug,
        name: t.name
      }));

      productsData.push({
        wcId: wpProd.id,
        slug: wpProd.slug,
        sku: wpProd.sku || null,
        price: parseFloat(wpProd.price) || 0,
        compareAtPrice: wpProd.regular_price ? parseFloat(wpProd.regular_price) : null,
        stock: wpProd.stock_quantity ?? 0,
        manageStock: wpProd.manage_stock ?? true,
        status: 'PUBLISHED',
        name: wpProd.name,
        description: stripHtml(wpProd.description),
        shortDescription: stripHtml(wpProd.short_description),
        featuredImage,
        gallery,
        categories,
        tags
      });

      console.log(`✅ "${wpProd.name}" extrait (wcId: ${wpProd.id})`);
      await delay(400);
    }
    
    saveJson('products.json', productsData);
    console.log(`\n🏁 ${productsData.length} produits extraits.`);

  } catch (err: any) {
    console.error('❌ Erreur:', err?.response?.data || err.message);
  } finally {
    console.log('🏁 extract-products terminé.');
  }
}

migrateProducts();

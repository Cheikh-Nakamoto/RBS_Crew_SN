import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.WP_API_URL || 'https://rbsakademya.com/wp-json';
const WC_KEY = process.env.WC_KEY;
const WC_SECRET = process.env.WC_SECRET;

const auth = { username: WC_KEY as string, password: WC_SECRET as string };
const prisma = new PrismaClient();

async function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

async function migrateProducts() {
  console.log('🔄 Starting WooCommerce Product Extraction...');
  try {
    const { data: wpProducts } = await axios.get(`${API_URL}/wc/v3/products`, { auth });
    console.log(`📦 Found ${wpProducts.length} products. Proceeding with migration.`);

    for (const wpProd of wpProducts) {
      // Create Base Product
      const product = await prisma.product.create({
        data: {
          wpId: wpProd.id,
          sku: wpProd.sku || null,
          price: parseFloat(wpProd.price) || 0,
          stock: wpProd.stock_quantity || 0,
        }
      });

      console.log(`✅ Migrated structural generic data for product ID: ${wpProd.id}`);
      
      // Delay to avoid overwhelming the REST API rate limits
      await delay(500);

      // In a real-world scenario, you would parse the 'lang' from the response if 
      // utilizing a Polylang/WooCommerce bridge REST API, or make a separate call.
      // Example of inserting the french default translation:
      await prisma.productTranslation.create({
        data: {
          productId: product.id,
          language: 'fr',
          name: wpProd.name,
          description: wpProd.description.replace(/<[^>]*>?/gm, ''), // Stripping HTML/Divi purely as an example of fetching raw data
          slug: wpProd.slug
        }
      });
      console.log(`   📝 Inserted 'fr' translation for product.`);
    }
  } catch (error) {
    console.error('❌ Error during product migration:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🏁 Migration script finished.');
  }
}

migrateProducts();

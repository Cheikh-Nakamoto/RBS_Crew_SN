require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const fs = require('fs');

const crypto = require('crypto');

async function run() {
    const data = JSON.parse(fs.readFileSync('../data/raw/festival.json', 'utf8'));
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    // Global wipe of festivals? No, just upsert
    for (const fest of data.editions) {
        console.log(`Upserting ${fest.slug}...`);
        
        let festId;
        const exist = await client.query('SELECT * FROM "FestivalEdition" WHERE slug = $1', [fest.slug]);
        
        if (exist.rows.length > 0) {
            festId = exist.rows[0].id;
            await client.query(
                `UPDATE "FestivalEdition" SET "mainImage"=$1, "heroImage"=$2, "gallery"=$3, "typography"=$4 WHERE id=$5`,
                [fest.image || null, fest.editionHeroImage || null, testJSON(fest.gallery), testJSON(fest.typography), festId]
            );
        } else {
            festId = crypto.randomUUID();
            await client.query(
                `INSERT INTO "FestivalEdition" (id, slug, "editionNumber", year, city, country, status, "mainImage", "heroImage", "gallery", "typography", "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, 'SN', 'PUBLISHED', $6, $7, $8, $9, NOW(), NOW())`,
                 [festId, fest.slug, fest.edition, fest.year, fest.city, fest.image || null, fest.editionHeroImage || null, testJSON(fest.gallery), testJSON(fest.typography)]
            );
        }
        
        await client.query(
            `INSERT INTO "FestivalTranslation" (id, "festivalEditionId", locale, "themeName", summary, content) 
             VALUES (gen_random_uuid(), $1, 'fr', $2, $3, $4)
             ON CONFLICT ("festivalEditionId", locale) DO UPDATE 
             SET content = EXCLUDED.content, summary=EXCLUDED.summary, "themeName"=EXCLUDED."themeName"`,
             [festId, fest.themeName, fest.summary, fest.bio || fest.content]
        );
    }
    
    await client.end();
}

function testJSON(val) {
    return val && val.length > 0 ? JSON.stringify(val) : null;
}

run().catch(console.error);

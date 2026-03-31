import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://rbs:password@localhost:5432/rbs_db' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EDITIONS = [
  { edition: 1, year: 2014, city: 'Thiès',     slug: 'last-wall-1st-edition', themeName: 'Edition One',       summary: "C'est en Décembre 2014 que tout a commencé. Le collectif s'est donné pour défi de faire une session de jam en dehors de Dakar, dans l'esprit de la culture HIP-HOP et de la self-détermination." },
  { edition: 2, year: 2015, city: 'Saint-Louis',slug: 'last-wall-2nd-edition', themeName: 'Golden Heritage',   summary: "Avec la participation de l'artiste suisse Seika One, le festival devient International dès sa 2ème édition à Saint-Louis du Sénégal." },
  { edition: 3, year: 2016, city: 'Kaolack',   slug: 'last-wall-3rd-edition', themeName: 'Panafricanism',     summary: "Pour sa 3ème édition, le RBS Crew a choisi Kaolack pour participer à la revalorisation de cette grande ville et appuyer les artistes autochtones." },
  { edition: 4, year: 2017, city: 'Kaffrine',  slug: 'last-wall-4th-edition', themeName: 'Kemetik Musso',     summary: "Cette édition à Kaffrine rend un vibrant hommage aux braves Femmes du monde en général et aux battantes Africaines en particulier." },
  { edition: 5, year: 2018, city: 'Louga',     slug: 'last-wall-5th-edition', themeName: 'Afrofuturism',      summary: "Afrofuturisme — un thème équivalent à l'urgence de notre époque. L'Afrique n'a personne à rattraper." },
  { edition: 6, year: 2019, city: 'Thiès',     slug: 'last-wall-6th-edition', themeName: 'Green Hope',        summary: "Le Last Wall Tour de 2019 fut particulièrement authentique, avec des artistes qui ont parlé au nom de la Nature et de l'urgence environnementale." },
  { edition: 7, year: 2021, city: 'Dakar',     slug: 'last-wall-7th-edition', themeName: 'The Kulture',       summary: "Après le Covid, retour en force avec NO PROGRESS WITHOUT KULTURE. Première édition avec un prélude à Dakar puis en Casamance (Ziguinchor)." },
  { edition: 8, year: 2022, city: 'Dakar',     slug: 'last-wall-8th-edition', themeName: 'Jarino Liniu Moom', summary: "JARIÑO LINIOU MOOM — appel à la jeunesse et au retour aux sources. Le RBS Crew passe d'un festival annuel à une biennale pour mieux préparer chaque édition." },
  { edition: 9, year: 2024, city: 'Dakar',     slug: 'last-wall-9th-edition', themeName: 'Transmission',      summary: "9ème édition du 28 novembre au 1er décembre 2024 à Dakar. 21 graffeurs venus des quatre coins du Sénégal, du continent africain et d'ailleurs." },
];

async function migrateFestival() {
  console.log('🎪 Migration Last Wall Tour Festival...');

  for (const ed of EDITIONS) {
    const festival = await prisma.festivalEdition.upsert({
      where : { slug: ed.slug },
      update: { editionNumber: ed.edition, year: ed.year, city: ed.city },
      create: { slug: ed.slug, editionNumber: ed.edition, year: ed.year, city: ed.city, country: 'SN', status: 'PUBLISHED' },
    });

    await prisma.festivalTranslation.upsert({
      where : { festivalEditionId_locale: { festivalEditionId: festival.id, locale: 'fr' } },
      update: { themeName: ed.themeName, summary: ed.summary },
      create: { festivalEditionId: festival.id, locale: 'fr', themeName: ed.themeName, summary: ed.summary },
    });

    console.log(`✅ Édition ${ed.edition} (${ed.year}) — "${ed.themeName}"`);
  }

  console.log('\n🏁 Festival terminé.');
  await prisma.$disconnect();
}

migrateFestival();

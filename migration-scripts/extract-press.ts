console.log("HELLO START");
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://rbs:password@localhost:5432/rbs_db' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PRESS_MENTIONS = [
  { title: "[L'Œil du digital] : Mur-mures urbains, la parole au RBS Crew (1/3)", source: 'Le Soleil',       sourceUrl: 'https://lesoleil.sn/actualites/arts-et-culture/loeil-du-digital-mur-mures-urbains-la-parole-au-rbs-crew-1-3/', excerpt: 'À la Cité Aliou Sow de Guédiawaye, se cache un îlot de bien-être pour les artistes.', date: new Date('2025-07-01') },
  { title: 'Burkina Faso Rises: RBS Crew, Ibrahim Traoré, and the Fight for Sovereignty',              source: 'Hard Knock Radio', sourceUrl: 'https://hardknockradio.org/burkina-faso-rises-rbs-crew-ibrahim-traore-and-the-fight-for-sovereignty/', excerpt: 'Host Davey D spoke with cultural workers Refa One and Madzoo about sovereignty and art.', date: new Date('2025-05-01') },
  { title: "La RBS Akademya enseigne l'art des graffitis aux jeunes sénégalais",                       source: 'Africa News',      sourceUrl: 'https://fr.africanews.com/2023/05/08/la-rbs-akademya-enseigne-lart-des-graffitis-aux-jeunes-senegalais//', excerpt: 'À Dakar, des jeunes jettent de plus en plus leur dévolu sur le graffiti.', date: new Date('2023-05-09') },
  { title: "Senegal : l'art du graffiti avec RBS Akademya",                                            source: 'TV5 Monde',        sourceUrl: 'https://information.tv5monde.com/international/senegal-lart-du-graffiti-avec-rbs-akademya-2530063', excerpt: "RBS Akademya est une école sénégalaise qui enseigne l'art du graffiti.", date: new Date('2023-05-11') },
  { title: "RBS Akademya, ou l'école des amoureux du Street Art",                                      source: 'Medi1TV Afrique',  sourceUrl: 'https://youtube.com/watch?v=X4vGiPEvfGw', excerpt: null, date: new Date('2022-08-27') },
  { title: "L'ART COMME FACTEUR DE DÉVELOPPEMENT",                                                    source: 'Wakhart',          sourceUrl: 'https://wakhart.com/portfolio/rbs-akademya/', excerpt: "L'artiste Madzoo est membre du collectif RBS Crew.", date: new Date('2022-09-30') },
  { title: 'Une école de graffiti fait le bonheur de jeunes Sénégalais',                               source: 'Kassataya',        sourceUrl: 'https://kassataya.com/2023/05/08/une-ecole-de-graffiti-fait-le-bonheur-de-jeunes-senegalais/', excerpt: 'Ibrahima Soumaré a la main hésitante, crayon en main, il couche quelques lettres…', date: new Date('2023-05-08') },
  { title: 'Immersion dans une école de graffiti unique en son genre',                                 source: 'France 24',        sourceUrl: 'https://www.france24.com/fr/vidéo/20230509-au-sénégal-immersion-dans-une-école-de-graffiti-unique-en-son-genre', excerpt: 'Une école de graffiti forme de jeunes artistes et éveille leurs consciences politiques.', date: new Date('2023-05-09') },
  { title: "Une école du graffiti à Dakar",                                                            source: 'VOA Afrique',      sourceUrl: 'https://www.voaafrique.com/a/une-école-du-graffiti-à-dakar/7099017.html', excerpt: "L'école RBS Akademya attire les jeunes désireux d'apprendre une forme d'art.", date: new Date('2023-05-18') },
  { title: 'Graffiti : RBS Akademiya redonne une seconde chance à des jeunes',                         source: 'TRT Afrique',      sourceUrl: 'https://www.trtafrika.com/fr/africa/graffiti-rbs-akademiya-redonne-une-seconde-chance-a-des-jeunes-senegalais-ayant-abonne-les-etudes-13168600', excerpt: 'À Dakar, les graffitis font partie du décor urbain.', date: new Date('2023-05-09') },
  { title: 'Une école de graffiti fait le bonheur de jeunes Sénégalais',                               source: 'La Croix',         sourceUrl: 'https://www.la-croix.com/ecole-graffiti-fait-bonheur-jeunes-Senegalais-2023-05-07-1301266487', excerpt: "Madzoo assure que l'école créée en décembre 2021 n'a pas d'équivalent au Sénégal.", date: new Date('2023-05-07') },
  { title: 'Découvre le collectif RBS Crew, la vision et les buts',                                    source: 'Canal+ Afrique',   sourceUrl: 'https://www.youtube.com/watch?v=aT0zD_LTMeM', excerpt: 'Découvre le RBS Crew à travers Canal+ Afrique.', date: new Date('2019-10-31') },
];

async function migratePress() {
  console.log('📰 Migration revue de presse...');
  for (const mention of PRESS_MENTIONS) {
    await prisma.pressMention.create({ data: mention });
    console.log(`✅ "${mention.title.substring(0, 55)}…"`);
  }
  console.log(`\n🏁 ${PRESS_MENTIONS.length} articles insérés.`);
  await prisma.$disconnect();
}

migratePress().catch(e => { console.error('FATAL ERROR:', e); process.exit(1); });

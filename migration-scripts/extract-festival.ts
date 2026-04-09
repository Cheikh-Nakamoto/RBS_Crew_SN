import * as dotenv from 'dotenv';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveJson } from './utils';

dotenv.config();

async function migrateFestival() {
  console.log('🎪 Extraction Last Wall Tour Festival vers JSON...');

  try {
    const response = await axios.get('https://rbsakademya.com/last-wall/');
    const html = response.data;
    const $ = cheerio.load(html);

    const logo = $('#logo').attr('src');
    // Global hero image is usually the first big image in the body
    const heroImage = $('.et_pb_section_0 .et_pb_image img').attr('src') || $('.wp-image-30680').attr('src');
    
    // Extract partners
    const partners: string[] = [];
    $('h2, h3, h4').each((i, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes('partenaire') || text.includes('collaborations')) {
        const section = $(el).closest('.et_pb_section');
        section.find('img').each((j, img) => {
          const src = $(img).attr('src');
          if (src && !src.includes('lazy') && !partners.includes(src)) {
            partners.push(src);
          }
        });
      }
    });

    const editions: any[] = [];
    const _typography: string[] = [];

    // Divi blurbs usually hold the editions
    const blurbElements = $('.et_pb_blurb').toArray();
    
    for (let i = 0; i < blurbElements.length; i++) {
      const el = blurbElements[i];
      const themeName = $(el).find('h2').text().trim();
      const image = $(el).find('.et_pb_main_blurb_image img').attr('src');
      const rawText = $(el).find('.et_pb_blurb_description').text().replace(/\s+/g, ' ').trim();
      
      let year = null;
      let editionNumStr = null;
      let city = null;
      let summary = rawText;

      const metadataMatch = rawText.match(/^(\d{4})\s*[-–]\s*(\d+)(?:e|th|st|nd|rd)\s+edition,\s*([^A-Z]*?)(?=[A-Z]|$)/i);
      if (metadataMatch) {
         year = parseInt(metadataMatch[1], 10);
         editionNumStr = parseInt(metadataMatch[2], 10);
         city = metadataMatch[3].trim().replace(/(&amp;|and)/g, '&');
         summary = rawText.substring(metadataMatch[0].length).trim();
      }

      // Collect inline typography specs
      $(el).find('[style*=font-family]').each((_, span) => {
          const style = $(span).attr('style') || '';
          const match = style.match(/font-family:\s*([^;]+);/);
          if (match) _typography.push(match[1].trim());
      });

      // Attempt to find the specific URL page for this edition
      let specificUrl = $(el).siblings('.et_pb_button_module_wrapper').find('a.et_pb_button').attr('href');

      // If we found a specific URL, fetch its info
      let gallery: string[] = [];
      let editionHero = null;
      let editionTypography: string[] = [];
      let editionBio = '';

      if (specificUrl) {
          try {
              console.log(`fetching specific page: ${specificUrl}`);
              const specRes = await axios.get(specificUrl);
              const _$ = cheerio.load(specRes.data);
              
              editionHero = _$('.et_pb_section_0 .et_pb_image img').attr('src') || _$('img').eq(0).attr('src');
              
              _$('img').each((_, imgEl) => {
                  const src = _$(imgEl).attr('src');
                  if (src && !src.includes('data:image') && !src.includes('logo') && !gallery.includes(src)) {
                      gallery.push(src);
                  }
              });

              // Extract the detailed bio of the edition
              _$('.et_pb_text_inner p').each((_, p) => {
                  const pTxt = _$(p).text().replace(/\s+/g, ' ').trim();
                  // Simple heuristic to exclude footer/copyright blurbs
                  if (pTxt.length > 40 && !pTxt.toLowerCase().includes('droits d’auteur') && !pTxt.includes('contact@') && !pTxt.includes('RBS LABZ')) {
                      editionBio += pTxt + '\n\n';
                  }
              });
              editionBio = editionBio.trim();

              _$(el).find('[style*=font-family]').each((_, span) => {
                  const style = _$(span).attr('style') || '';
                  const match = style.match(/font-family:\s*([^;]+);/);
                  if (match) {
                      editionTypography.push(match[1].trim());
                      _typography.push(match[1].trim());
                  }
              });
              editionTypography = [...new Set(editionTypography)];
          } catch (e) {
              console.log(`Failed to fetch specific page ${specificUrl}`);
          }
      }

      // Ignore the main header blurb that lacks an image and specificUrl
      if (themeName && (image || specificUrl)) {
        editions.push({
          edition: editionNumStr || editions.length + 1,
          year: year || null,
          city: city || 'Unknown',
          slug: themeName ? themeName.toLowerCase().replace(/\s+/g, '-') : `last-wall-${editions.length + 1}`,
          themeName: themeName || 'Last Wall Edition',
          image: image || null,
          summary: summary,
          bio: editionBio || null,
          specificUrl: specificUrl,
          editionHeroImage: editionHero,
          gallery: gallery.slice(0, 15), // keep up to 15 images
          typography: editionTypography.length > 0 ? editionTypography : undefined
        });
      }
    }

    // reverse to order historically
    editions.reverse();

    const result = {
      projectInfo: {
        logo: logo,
        heroImage: heroImage,
        typography: [...new Set(_typography)],
        partners: partners
      },
      editions: editions
    };

    saveJson('festival.json', result);
    console.log('\n🏁 Festival terminee, extractions de typographie, heros, pages specifiques, logos et partenaires incluses.');
  } catch (error) {
    console.error('Erreur lors de l\'extraction du festival:', error);
  }
}

migrateFestival();

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

    // Divi blurbs hold the editions on the listing page
    const blurbElements = $('.et_pb_blurb').toArray();
    console.log(`  Found ${blurbElements.length} blurb elements on listing page`);
    
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
      } else {
        // Fallback: try to extract year from anywhere in the text
        const yearFallback = rawText.match(/(\d{4})/);
        if (yearFallback) year = parseInt(yearFallback[1], 10);
        // Try to extract edition number from theme name like "9e edition"
        const editionFallback = themeName.match(/(\d+)(?:e|th|st|nd|rd)\s+edition/i)
          || rawText.match(/(\d+)(?:e|è|th|st|nd|rd)\s*[eé]?dition/i);
        if (editionFallback) editionNumStr = parseInt(editionFallback[1], 10);
        // Try to extract city
        const cityFallback = rawText.match(/[-–]\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s*[&,]\s*[A-ZÀ-Ú][a-zà-ú]+)*)\s/);
        if (cityFallback) city = cityFallback[1];
      }

      // Collect inline typography specs
      $(el).find('[style*=font-family]').each((_, span) => {
          const style = $(span).attr('style') || '';
          const match = style.match(/font-family:\s*([^;]+);/);
          if (match) _typography.push(match[1].trim());
      });

      // ===== FIX: find the "voir plus" button URL =====
      // The button wrapper is a sibling of the blurb inside the same column div.
      // Structure: .et_pb_column > .et_pb_blurb + .et_pb_button_module_wrapper
      // So we go up to the parent column and look for the button there.
      const parentColumn = $(el).closest('.et_pb_column');
      let specificUrl = parentColumn.find('.et_pb_button_module_wrapper a.et_pb_button').attr('href');
      
      // Fallback: try the header link inside the blurb itself
      if (!specificUrl) {
        specificUrl = $(el).find('.et_pb_module_header a').attr('href');
      }
      // Fallback: try the blurb image link
      if (!specificUrl) {
        specificUrl = $(el).find('.et_pb_main_blurb_image a').attr('href');
      }

      console.log(`  Blurb "${themeName}": specificUrl = ${specificUrl || 'NOT FOUND'}`);

      // If we found a specific URL, fetch its info
      let gallery: string[] = [];
      let editionHero = null;
      let editionTypography: string[] = [];
      let editionBio = '';

      if (specificUrl) {
          try {
              console.log(`  📥 Fetching edition page: ${specificUrl}`);
              const specRes = await axios.get(specificUrl);
              const _$ = cheerio.load(specRes.data);
              
              // Hero image: first non-logo image on the page (usually the poster)
              editionHero = _$('.et_pb_image_0 img').attr('src') || _$('img').not('#logo').first().attr('src');
              
              // ===== FIX: Extract gallery images properly =====
              // Gallery images are in et_pb_image modules with lightbox links
              // or as plain img tags. We get the full-size src and filter out
              // logos, favicons, and srcset resized duplicates.
              const seenBasenames = new Set<string>();
              
              _$('img').each((_, imgEl) => {
                  const src = _$(imgEl).attr('src');
                  if (!src) return;
                  
                  // Skip data URIs, logos, favicons, and spray/fond-noir assets
                  if (src.includes('data:image')) return;
                  if (src.includes('logo') || src.includes('favicon')) return;
                  if (src.includes('cropped-RBS')) return;
                  if (src.includes('fond-noir') || src.includes('spray')) return;
                  
                  // Normalize to get the base image name (remove -WIDTHxHEIGHT and -scaled suffixes for dedup)
                  const baseUrl = src.replace(/-\d+x\d+(\.\w+)$/, '$1').replace(/-scaled(\.\w+)$/, '$1');
                  
                  if (!seenBasenames.has(baseUrl)) {
                      seenBasenames.add(baseUrl);
                      gallery.push(src);
                  }
              });

              // Extract the detailed bio of the edition
              _$('.et_pb_text_inner p').each((_, p) => {
                  const pTxt = _$(p).text().replace(/\s+/g, ' ').trim();
                  // Simple heuristic to exclude footer/copyright blurbs
                  if (pTxt.length > 40 && !pTxt.toLowerCase().includes('droits d\'auteur') && !pTxt.includes('contact@') && !pTxt.includes('RBS LABZ')) {
                      editionBio += pTxt + '\n\n';
                  }
              });
              editionBio = editionBio.trim();

              // Extract typography from the edition page
              _$('[style*=font-family]').each((_, span) => {
                  const style = _$(span).attr('style') || '';
                  const match = style.match(/font-family:\s*([^;]+);/);
                  if (match) {
                      editionTypography.push(match[1].trim());
                      _typography.push(match[1].trim());
                  }
              });
              editionTypography = [...new Set(editionTypography)];

              console.log(`  ✅ Gallery: ${gallery.length} images, Bio: ${editionBio.length} chars`);
          } catch (e: any) {
              console.log(`  ❌ Failed to fetch specific page ${specificUrl}: ${e.message}`);
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

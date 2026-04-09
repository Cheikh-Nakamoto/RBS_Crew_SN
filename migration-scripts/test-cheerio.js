const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('/tmp/lastwallpage.html', 'utf8');
const $ = cheerio.load(html);

const logo = $('#logo').attr('src');
const heroImage = $('.et_pb_section_0 .et_pb_image img').attr('src') || $('.wp-image-30680').attr('src');
const images = [];

$('.et_pb_blurb').each((i, el) => {
    const title = $(el).find('h2').text().trim();
    const image = $(el).find('.et_pb_main_blurb_image img').attr('src');
    const content = $(el).find('.et_pb_blurb_description').text().replace(/\s+/g, ' ').trim();
    
    // Find inline font styles, like "font-family: Philly;"
    let typography = [];
    $(el).find('[style*=font-family]').each((_, span) => {
        const style = $(span).attr('style');
        const match = style.match(/font-family:\s*([^;]+);/);
        if (match) typography.push(match[1]);
    });
    
    // deduplicate typography
    typography = [...new Set(typography)];

    images.push({ 
        edition: images.length + 1,
        title, 
        image, 
        typography,
        content: content.substring(0, 100) + '...' 
    });
});

console.log(JSON.stringify({ logo, heroImage,  editions: images.reverse() }, null, 2));

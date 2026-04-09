const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const res = await axios.get('https://rbsakademya.com/last-wall-tour-festival-golden-heritage/');
    const $ = cheerio.load(res.data);
    
    const heroImage = $('.et_pb_section_0 .et_pb_image img').attr('src') || $('img').eq(0).attr('src');
    const gallery = [];
    $('.et_pb_gallery_image a').each((i, el) => gallery.push($(el).attr('href')));
    
    let typography = [];
    $('[style*=font-family]').each((_, span) => {
        const style = $(span).attr('style') || '';
        const match = style.match(/font-family:\s*([^;]+);/);
        if (match) typography.push(match[1].trim());
    });
    
    console.log(JSON.stringify({ 
        url: 'https://rbsakademya.com/last-wall-tour-festival-golden-heritage/',
        heroImage,
        galleryLength: gallery.length,
        galleryEx: gallery.slice(0, 3),
        typography: [...new Set(typography)]
    }, null, 2));
}

test();

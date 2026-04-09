const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('/tmp/lastwallpage.html', 'utf8');
const $ = cheerio.load(html);

const partners = [];
// Find the row containing "Collaborations & Partenaires"
$('h2').each((i, el) => {
    if ($(el).text().toLowerCase().includes('partenaire')) {
        // The logos are usually in the same section or row, let's find the parent section
        const section = $(el).closest('.et_pb_section');
        // Now find all images in this section that are not the background
        section.find('.et_pb_image img').each((j, img) => {
            partners.push($(img).attr('src'));
        });
        
        // Sometimes they are in a different module format (like galleries)
        section.find('img').each((j, img) => {
             // check if it's already added
             const src = $(img).attr('src');
             if (src && !partners.includes(src)) {
                 partners.push(src);
             }
        });
    }
});

console.log(partners);

const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('/tmp/lastwallpage.html', 'utf8');
const $ = cheerio.load(html);

// Find all links that look like festival editions
const links = [];
$('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (href.includes('edition') || href.includes('last-wall-tour'))) {
        links.push(href);
    }
});
// also check the shortcode text for URL= »... »
const content = $('body').text();
const urls = [...new Set([...links, ...content.match(/https:\/\/rbsakademya.com\/[a-z0-9-]+\//g) || []])];
console.log(urls.filter(u => u.includes('last-wall') || u.includes('edition') || u.includes('mad-zoo')));

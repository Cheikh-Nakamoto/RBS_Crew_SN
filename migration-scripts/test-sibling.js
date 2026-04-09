const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('/tmp/lastwallpage.html', 'utf8');
const $ = cheerio.load(html);

$('.et_pb_blurb').each((i, el) => {
    const title = $(el).find('h2').text().trim();
    const specificUrl = $(el).siblings().find('a.et_pb_button').attr('href');
    console.log({ title, specificUrl });
});

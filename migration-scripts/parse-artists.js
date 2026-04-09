const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    const res = await axios.get('https://rbsakademya.com/last-wall-tour-festival-transmission-9th-edition/');
    const $ = cheerio.load(res.data);
    // Print all headers and blurb titles
    $('h1, h2, h3, h4, .et_pb_blurb_content h4').each((i, el) => console.log($(el).text().trim()));
}
test();

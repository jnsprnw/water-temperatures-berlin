const core = require('@actions/core');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const parse = require('date-fns/parse');
const formatISO = require('date-fns/formatISO');
const format = require('date-fns/format');
const deLocale = require('date-fns/locale/de');

// This script scrapes the data from the FU Berlin website
// Because the website is pretty non-standard, we need to do some extra work

// This is the url we are  scraping
const URL = 'https://wind.met.fu-berlin.de/mvdtext/mvd_text.htm';

// These are the words with which the relevant lines start. We need this later.
const LINES = ['Wannsee', 'Müggelsee', 'Havel/Spandau', 'Scharfe Lanke / Pichelsdorf'];

async function loadContent () {
	// This function scrapes the content from the url and prepare the information as CSV compatible string
	// This variable will hold the rows of temperature data
	let rows = '';
	// The website is generated with Word and uses the UTF-16LE encoding.
	// You can find out the encoding of any website by running `document.characterSet` in the Firefox or Chrome console
	// The encoding forces us to use a specific decoder instead of a simple `.text()` command
	const decoder = new TextDecoder('UTF-16LE');
	const response = await fetch(URL);
	const buffer = await response.arrayBuffer();
	const body = decoder.decode(buffer);

	// We remove all the strange elements that Word inserted to make the life of Cheerio easier
	const content = body.replace(new RegExp('<!--[\\s\\S]*?-->', 'mg'), '');

	// Next, we load the content into Cheerio
	const $ = cheerio.load(content);

	// First, we get the date of the current temperatures
	// Select the second h1 headline, get the text, remove `Uhr` and trim the string
	const dateString = $($('h1')[1]).text().replace('Uhr', '').replace(new RegExp('\r?\n|\r', 'gm'), ' ').trim();
	// Parse the string with Berlin timezone added and format as ISO string. See https://date-fns.org/v2.29.3/docs/parse for parsing details
	const dateRaw = parse(`${dateString} +01`, 'EEEE, dd. LLLL yyyy, HH:mm x', new Date(), { locale: deLocale });

	// The date of the temperatures
	const dateTemperatures = formatISO(dateRaw);
	// The date we scraped the data
	const dateScrape = (new Date()).toISOString();

	// Loop over all elements with class `p4` (Which are basically all)
	$('.p4').each((_, e) => {
    const text  = $(e).text();
    // Check if the content of the lines include any of the lakes listed above
    if (LINES.some(line => text.includes(line))) {
    	// Because the lakes and temperatures are seperated by spaces, we need to remove these.
    	// We replace these spaces with a single character and then split by this character
    	// Maybe this could be shorter, but I couldn’t figure out how
    	const list = text.replace(new RegExp(/(\s){2,}/, 'gm'), '#').split('#');

    	// Because the lake and the temperature are two seperate elements in the array, we need to loop two items per step
    	for (let i = 0; i < list.length; i += 2) {
    		// The lake’s name is in the first element
    		const lake = list[i].trim();
    		// The temperature is in the second element, but needs some cleaning to make it usable
    		const temperature = parseFloat(list[i + 1].replace('°C', '').replace(',', '.'));
    		// Finally, we build the CSV row
    		rows += '\n' + [lake, temperature, dateTemperatures, dateScrape].join(',');
    	}
    }
	});
	core.setOutput('newData', rows);
	core.setOutput('dateString', format(dateRaw, 'dd.MM.yyyy HH:mm'));
}

loadContent();
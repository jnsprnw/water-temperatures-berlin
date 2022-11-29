const core = require('@actions/core');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const parse = require('date-fns/parse');
const deLocale = require('date-fns/locale/de');

const LINES = ['Wannsee', 'Müggelsee', 'Havel/Spandau', 'Scharfe Lanke / Pichelsdorf'];
const TEMPERATURES = [];
const DELIMITER = ',';

async function loadContent () {
	const decoder = new TextDecoder("UTF-16LE");
	const response = await fetch('https://wind.met.fu-berlin.de/mvdtext/mvd_text.htm');
	const buffer = await response.arrayBuffer();
	const body = decoder.decode(buffer);
	const content = body.replace(new RegExp('<!--[\\s\\S]*?-->', 'mg'), '');
	const $ = cheerio.load(content);
	let rows = '';
	const dateString = $($('h1')[1]).text().replace('Uhr', '').trim()
	const date = parse(`${dateString} +01`, 'EEEE, d. LLLL yyyy, H:m x', new Date(), { locale: deLocale });
	$('.p4').each((_, e) => {
		const el = $(e)
    const text  = el.text();
    if (LINES.some(line => text.includes(line))) {
    	const list = text.replace(/(\s){2,}/mg, '#').split('#');
    	for (let i = 0; i < list.length; i += 2) {
    		rows += `\n${[list[i], parseFloat(list[i + 1].replace('°C', '').replace(',', '.')), new Date(), date].join(DELIMITER)}`;
    		TEMPERATURES.push({ current: new Date(), date, location: list[i], temperature: parseFloat(list[i + 1].replace('°C', '').replace(',', '.'))})
    	}
    }
	});
	// console.log(rows)
	core.setOutput('newData', rows);
}

loadContent();
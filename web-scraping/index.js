let tress = require('tress');
let needle = require('needle');
let resolve = require('url').resolve;
let parse = require('node-html-parser').parse;
let fs = require('fs');
let counter = 0;
const MAX_PAGES = 10000;

const URL_REFRIGERATORS = 'https://bt.rozetka.com.ua/refrigerators/c80125/';
const URL_LAPTOPS = 'https://rozetka.com.ua/notebooks/c80004/';
const URL_HEADPHONES = 'https://rozetka.com.ua/naushniki-i-aksessuari/c4660594/';

const url_arr = [{url: URL_REFRIGERATORS, name: 'refrigerators'}, {url: URL_LAPTOPS, name: 'laptops'}, {url: URL_HEADPHONES, name: 'headphones'}];

function parseData(URL) {
    const results_page = [];
    const results_descriptions = [];

    let descriptions_parser = tress(function(url, callback) {
        needle.get(url, function(err, res) {
            if (err) throw err;

            // парсим DOM
            let $ = parse(res.body);
            
            if (res.statusCode === 301) {
                if (counter < MAX_PAGES) {
                    descriptions_parser.push('https://rozetka.com.ua' + res.headers.location);
                    counter++;
                }
                callback();
                return;
            }
            
            let element = $.querySelector('.product-about__description-content');
            let description = element ? element.innerHTML : null;

            results_descriptions.push({
                category: URL.name,
                descriptions: description ? description : null
            }); 

            callback();
        });
    }, 10);

    descriptions_parser.drain = function() {
        fs.writeFileSync(`./web-scraping/data/${URL.name}-description.json`, JSON.stringify(results_descriptions, null, 4));
    }

    let pages_parser = tress(function(url, callback) {
        needle.get(url, function(err, res) {
            if (err) throw err;

            // парсим DOM
            let $ = parse(res.body);
            
            $.querySelectorAll('.catalog-grid__cell').forEach(el => {
                results_page.push({
                    title: el.querySelector('.goods-tile__title').innerHTML,
                    href: el.querySelector('.goods-tile__heading').getAttribute('href')
                }); 
                descriptions_parser.push(el.querySelector('.goods-tile__heading').getAttribute('href'));
            });
            
            callback();
        });
    }, 10); // запускаем 10 параллельных потоков

    pages_parser.drain = function(){
        fs.writeFileSync(`./web-scraping/data/${URL.name}-page.json`, JSON.stringify(results_page, null, 4));
    }

    pages_parser.push(URL.url);
}

for (let url of url_arr) {
    parseData(url);
}
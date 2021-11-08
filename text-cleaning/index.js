const fs = require('fs');
const { convert } = require('html-to-text');
const stopwords = require('./stopwords'); // array of stopwords

const arr = ['headphones', 'laptops', 'refrigerators'];
let full_text = '';

async function cleanText(category) {
    let descriptions_arr = [];
    let tokenization_arr = [];

    let promise = new Promise((res, rej) => {
        fs.readFile(`./text-cleaning/data/${category}-description.json`, 'utf8' , (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            
            data_arr = JSON.parse(data);
            
            data_arr.forEach((description) => {
                description.descriptions = convert(description.descriptions, {
                    wordwrap: false
                });
                description.descriptions = description.descriptions.toLowerCase();
                
                descriptions_arr.push(description);
            });
            
            descriptions_arr = descriptions_arr.map(el => {
                full_text += el.descriptions.replace(/\.|,|\(|\)|:|[0-9]|\r\n|\n|\r|\?|\!|\-|\"|\*|\—|\–|\//g, '') + ' ';
                return {...el, descriptions: el.descriptions.replace(/\.|,|\(|\)|:|[0-9]|\r\n|\n|\r|\?|\!|\-|\"|\*|\—|\–|\//g, '')}
            });
            
            descriptions_arr.forEach((d) => {
                let arr = d.descriptions.split(' ');
                arr = arr.filter(el => el.length !== 0);
                arr = arr.filter(el => !stopwords.includes(el));
                tokenization_arr.push({category: d.category, tokens: arr});
            })
            
            fs.writeFileSync(`./text-cleaning/data/results/${category}-cleaned-text.json`, JSON.stringify(tokenization_arr, null, 4));
            res();
        });
    })
    await promise;
    
}

async function run() {
    for (let c of arr) {
        await cleanText(c);
    }
    fs.writeFileSync(`./text-cleaning/data/results/full-text.txt`, full_text);
}

//run();

async function createVocabulary() {
    let vocabulary = {};
    for (let category of arr) {
        let promise = new Promise((response, reject) => {
            fs.readFile(`./text-cleaning/data/results/${category}-cleaned-text.json`, 'utf8' , (err, data) => {
                if (err) {
                    console.error(err);
                    reject();
                    return
                }
                
                data_arr = JSON.parse(data);
                
                data_arr.forEach(({tokens}) => {
                    
                    tokens.forEach((t) => {
                        if (!vocabulary[t]) {
                            vocabulary[t] = ++Object.keys(vocabulary).length;
                        }
                    });
                })
                response();
            });
        });
        await promise;
    }
    
    fs.writeFileSync(`./text-cleaning/data/results/vocabulary.json`, JSON.stringify(vocabulary, null, 4));

    return vocabulary;
}

async function trainingSet() {
    let vocabulary = await createVocabulary();
    let x_train = [];
    let y_train = [];

    for (let category of arr) {
        let promise = new Promise((response, reject) => {
            fs.readFile(`./text-cleaning/data/results/${category}-cleaned-text.json`, 'utf8' , (err, data) => {
                if (err) {
                    console.error(err);
                    reject();
                    return
                }
                
                data_arr = JSON.parse(data);
                
                data_arr.forEach(({category, tokens}) => {
                    let arr = [];
                    tokens.forEach((t) => {
                        arr.push(vocabulary[t])
                    });
                    x_train.push(arr);
                    y_train.push(category);
                })
                response();
            });
        });
        await promise;
    }

    let max_length = 0;

    for (let el of x_train) {
        if (el.length > max_length) max_length = el.length;
    }

    for (let i = 0; i < x_train.length; i++) {
        if (x_train[i].length < max_length) {
            let d = max_length - x_train[i].length;
            x_train[i] = [...x_train[i], ...new Array(d).fill(0)]
        }
    }

    fs.writeFileSync(`./text-cleaning/data/results/x_train.json`, JSON.stringify(x_train, null, 4));
    fs.writeFileSync(`./text-cleaning/data/results/y_train.json`, JSON.stringify(y_train, null, 4));
}

//trainingSet();

async function cleanTestText(data_arr) {
    
    const VEC_LENGTH = 950;
    
    data_arr = data_arr.map((description) => {
        description = convert(description, {
            wordwrap: false
        });
        description = description.toLowerCase();
        
        return description
    });
        
    data_arr = data_arr.map(el => {
        return el.replace(/\.|,|\(|\)|:|[0-9]|\r\n|\n|\r|\?|\!|\-|\"|\*|\—|\–|\//g, '')
    });
        
    data_arr = data_arr.map((d) => {
        let arr = d.split(' ');
        arr = arr.filter(el => el.length !== 0);
        arr = arr.filter(el => !stopwords.includes(el));
        return arr;
    })

    console.log(data_arr)

    let word_vec = [];
        
    let promise = new Promise((response, reject) => {
        fs.readFile(`./text-cleaning/data/results/vocabulary.json`, 'utf8' , (err, data) => {
            if (err) {
                console.error(err);
                reject();
                return
            }
            
            let vocabulary = JSON.parse(data);
            
            for (let d of data_arr) {
                let arr = [];
                for (let w of d) {
                    arr.push(vocabulary[w] ? vocabulary[w] : 0)
                }
                word_vec.push(arr);
            }
            
            response();
        });
    });

    await promise;

    console.log(word_vec)
    
    word_vec = word_vec.map(el => {
        if (el.length < VEC_LENGTH) {
            return [...el, ...new Array(VEC_LENGTH - el.length).fill(0)]
        }
        else {
            el.length = VEC_LENGTH;
            return el;
        }
    })

    return word_vec;
}

async function wordToCategory() {
    let files = ['headphones', 'laptops', 'refrigerators'];
    let words = {};
    let final_words = {};

    for (f of files) {
        let promise = new Promise((resolve, reject) => {
            fs.readFile(`./text-cleaning/data/results/${f}-cleaned-text.json`, 'utf8' , (err, data) => {
                if (err) {
                    console.error(err);
                    reject();
                    return
                }
                let text = JSON.parse(data);
                text.forEach((o) => {
                    o.tokens.forEach(t => {
                        if (!words[t]) {
                            words[t] = {refrigerators: 0, laptops: 0, headphones: 0};
                            words[t] = {...words[t], [o.category]: ++words[t][o.category]};
                        }
                        else {
                            words[t] = {...words[t], [o.category]: ++words[t][o.category]};
                        }
                    })
                })
                
                for (let w in words) {
                    
                    if (words[w]['refrigerators'] >= words[w]['laptops'] && words[w]['refrigerators'] >= words[w]['headphones']) {
                        final_words[w] = 'refrigerators';
                    } else if (words[w]['laptops'] >= words[w]['refrigerators'] && words[w]['laptops'] >= words[w]['headphones']) {
                        final_words[w] = 'laptops';
                    } else if (words[w]['headphones'] >= words[w]['refrigerators'] && words[w]['headphones'] >= words[w]['laptops']) {
                        final_words[w] = 'headphones';
                    }
                }
                
                resolve();
            });
        });
        await promise;
    }
    fs.writeFileSync(`./text-cleaning/data/results/wordToText.json`, JSON.stringify(final_words, null, 4));
    
    return final_words;
}

exports.module = {cleanTestText, wordToCategory}
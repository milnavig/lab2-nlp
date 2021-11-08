const KNN = require('ml-knn');
const fs = require('fs');
const { start } = require('repl');
let { cleanTestText, wordToCategory } = require('./text-cleaning/index').module;

const csv = require('csv-parser');
const results = [];

/*
async function KNN_predict(test_data) {
  let promise = new Promise((resolve, reject) => {
    fs.readFile(`./text-cleaning/data/results/x_train.json`, 'utf8' , (err, data) => {
      if (err) {
          console.error(err);
          reject();
          return
      }
      
      data_arr = JSON.parse(data);
      
      resolve(data_arr);
    });
  });

  let x_train = await promise;

  promise = new Promise((resolve, reject) => {
    fs.readFile(`./text-cleaning/data/results/y_train.json`, 'utf8' , (err, data) => {
      if (err) {
          console.error(err);
          reject();
          return
      }
      
      data_arr = JSON.parse(data);
      
      resolve(data_arr);
    });
  });

  let y_train = await promise;

  let knn = new KNN(x_train, y_train);

  let dataset = [...test_data];
  
  var ans = knn.predict(dataset);
  console.log(ans);
}

async function init() {
  let promise = new Promise((resolve, reject) => {
    let data_arr;
    fs.readFile(`./test-data.json`, 'utf8' , (err, data) => {
      if (err) {
          console.error(err);
          reject();
          return
      }
      
      data_arr = JSON.parse(data);
      resolve(data_arr);
    });
  });

  let data_arr = await promise;

  let text = await cleanTestText(data_arr);

  //console.log(text)
    
  KNN_predict(text)
}

init()
*/
async function getVectors() {
  let res = {};
  let promise = new Promise((resolve, reject) => {
    fs.createReadStream('vectors.csv')
    .pipe(csv({headers: false}))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      
      res = results.map(row => {
        let splitted = row['0'].split(' ');
        return {[splitted[0]]: splitted.slice(1).map(x => +x)}
      });
      res = res.reduce((acc, el) => {
        return {...acc, ...el}
      }, {});

      fs.writeFileSync(`./vectors.json`, JSON.stringify(res, null, 4));
      resolve();
    });
  })
  
  await promise;
  
  let wordsFromDescription = await wordToCategory();

  let combined_arr = [];
  for (let word in wordsFromDescription) {
    if (word in res) {
      combined_arr.push({ word, type: wordsFromDescription[word], vec: res[word]});
    }
  }
  
  fs.writeFileSync(`./word-type-vector.json`, JSON.stringify(combined_arr, null, 4));
  return combined_arr;
}

async function findWordVectors(sentence) {
  let vectors = [];
  let promise = new Promise((resolve, reject) => {
    fs.readFile(`./vectors.json`, 'utf8' , (err, data) => {
        if (err) {
            console.error(err);
            reject();
            return
        }
        let text = JSON.parse(data);
        
        sentence.split(' ').forEach(w => {
          if (w in text) {
            vectors.push(text[w]);
          }
        })
        
        resolve();
    });
  });
  await promise;
  return vectors;
}


function KNN_train(combined_arr) {
  let x_train = combined_arr.map(el => el.vec);
  let y_train = combined_arr.map(el => el.type);

  let knn = new KNN(x_train, y_train);

  return knn;
}

async function init() {
  let combined_arr = await getVectors();
  
  let knn = KNN_train(combined_arr);

  let test_data = ["Ноутбук HP 255 G8 отличается выгодной ценой и позволяет всегда оставаться на связи. Он объединяет в себе технологии AMD и все необходимое для совместной работы. Прочный корпус ноутбука надежно защищает его от повреждений при переноске.", "Модель наушников закрытого типа DT 240 PRO — это доступное решение для профессионалов и ценителей качественного звучания в дороге, офисе или домашней студии. Наушники отличаются малым весом и эргономичным дизайном, что в комплексе с удобными амбушюрами обеспечивает комфортное многочасовое использование."];

  for (let desc of test_data) {
    let vectors = await findWordVectors(desc);
    
    let ans = knn.predict(vectors);

    let closeToHeadphones = 0;
    let closeToRefrigerator = 0;
    let closeToLaptop = 0;

    for (let a of ans) {
      if (a === 'headphones') closeToHeadphones++;
      else if (a === 'refrigerator') closeToRefrigerator++;
      else closeToLaptop++;
    }
    closeToHeadphones = ~~(closeToHeadphones / 1.5);

    if ( closeToHeadphones >= closeToRefrigerator && closeToHeadphones >= closeToLaptop ) {
      console.log('It is headphones');
    } else if (closeToRefrigerator >= closeToHeadphones && closeToRefrigerator >= closeToLaptop) {
      console.log('It is refrigirator');
    } else {
      console.log('It is laptop');
    }
    
    //console.log(ans);
  }
  
}

init();
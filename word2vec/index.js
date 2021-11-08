'use strict';

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, HOST);

let w2v = require( 'word2vec' );

w2v.word2phrase( __dirname + '/input.txt', __dirname + '/phrases.txt', {
	threshold: 5,
	debug: 2,
	minCount: 1
}, () => {
    w2v.word2vec( __dirname + '/phrases.txt', __dirname + '/vectors.txt', {
        cbow: 1,
        size: 100,
        window: 8,
        negative: 25,
        hs: 0,
        sample: 1e-4,
        threads: 20,
        iter: 15,
        minCount: 2
    });
});
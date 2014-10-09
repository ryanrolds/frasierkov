
var express = require('express');

var Chains = require('./lib/chains');
var Twitter = require('./lib/twitter');
var TwitterBot = require('./lib/bot');
var redisClient = require('./lib/redis');

var opts = require('./config');
var allowTweeting = false;
var twitter = new Twitter(opts, allowTweeting);
var chains = new Chains(redisClient, 'frasier');

// This starts the magic
var bot = new TwitterBot(twitter, chains);

var app = express();

app.get('/gen/input?', function(req, res) {
    var input = req.param('input', null);

    bot.genTextFromChains(input, function(error, text) {
	res.json({'text': text});
    });
});

app.get('/tweet', function(req, res) {
    res.send('Hello World');

    // Gen text
    // Tweet
});

app.get('/badger/tweet/:id', function(req, res) {
    var preview = !!req.param('preview', false);
    var tweetId = req.param('id');

    // Lookup tweet
    // Gen text from source
    // Tweet

    res.send('Hello World');
});

app.listen(3000);
console.log('Listening on port 3000');



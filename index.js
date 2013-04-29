
var redisClient = require('./lib/redis');
var Chains = require('./lib/chains');
var Twitter = require('./lib/twitter');
var TwitterBot = require('./lib/bot');

var opts = require('./config');
var allowTweeting = true;

var chains = new Chains(redisClient, 'frasier');
var twitter = new Twitter(opts, allowTweeting);

// This starts the magic
var bot = new TwitterBot(twitter, chains);


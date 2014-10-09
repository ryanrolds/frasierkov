
var async = require('async');

var opts = require('../config');
var Twitter = require('../lib/twitter');
var redis = require('../lib/redis');
var Chains = require('../lib/chains');

var twitter = new Twitter(opts, false);
var chains = new Chains(redis, 'frasier');

twitter.getTweets('#YOLO', function(error, tweets) {
    if (error) {
	throw error;
    }

    async.forEachSeries(
	tweets,
	function(tweet, callback) {
	    var text = tweet.text;
	    var user = tweet.user.screen_name;

	    console.log(user, text);
	    chains.generateText(text, 30, function(error, result) {
		if (error) {
		    return callback(error);
		}

		console.log('Frasierkov', result);
		callback(null);
	    });
	},
	function(error) {
	    if (error) {
		throw error;
	    }
	}
    );
});

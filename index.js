
var async = require('async');

var redisClient = require('./lib/redis');
var Chains = require('./lib/chains');
var Twitter = require('./lib/twitter');
var dateUtils = require('date-utils');

var tzOffset = -7;
var allowTweeting = true;
var opts = require('./config');

var chains = new Chains(redisClient, 'frasier');
var twitter = new Twitter(opts, allowTweeting);

var cron = require('cron');
var jobs = {};

var lastMentionId = '1';
var replyToMentions = function() {
    if (checkTime()) {
	return;
    }

    console.log('dm message check');
    twitter.getMentions(lastMentionId, function(error, mentions) {
	// This is make sure we don't double reply
	if (lastMentionId === '1') {
	    console.log('First run, updating mention id');
	    return;
	}

	// If not mentions, move on
	if (!mentions.length) {
	    console.log('No mentions to handle');
	    return;
	}

	async.forEachSeries(
	    mentions,
	    function(mention, callback) {
		console.log(mention);

		chains.generateText('', 30, function(error, text) {
		    if (error) {
			return callback(error);
		    }

		    twitter.reply(mention.user, mention.id, text, function(error, result) {
			if (error) {
			    return callback(error);
			}

			if (parseInt(lastMentionId, 10) < parseInt(mention.id, 10)) {
			    lastMentionId = '' + mention.id;
			}

			console.log(lastMentionId);
			callback(result);
		    });
		});
	    },
	    function (error) {
		if (error) {
		    return console.log(error);
		}
	    }
	);
    });
};

jobs['conversate'] = new cron.CronJob('*/5 * * * *', replyToMentions, null, true, null);
replyToMentions();


// Set timer on first tweet
var doTimedTweet = function() {
    tweet(function(error, tweet) {
	if (error) {
	    return console.log(error);
	}

	console.log(tweet);

	// Get new wait time
	wait = getWait();
	console.log('Waiting: ', wait / 1000, 'secs');
	// Setup time for next tweet
	nextTweet = setTimeout(doTimedTweet, wait);
    });
};

// Prepare timeer for first tweet
var wait = getWait();
console.log('Next solo tweet in ', wait / 1000, 'secs');
var nextTweet = setTimeout(doTimedTweet, wait);

function tweet(callback) {
    // Try to only tweet between 8am and 10pm
    if (checkTime()) {
	return callback();
    }

    // Generate some text and tweet it
    chains.generateText('', 30, function(error, text) {
	if (error) {
	    return callback(error);
	}

	twitter.tweet(text, callback);
    });
}

var doYoloBadger = function() {
    yoloBadger(function(error, tweet) {
	if (error) {
	    return console.log(error);
	}

	console.log(tweet);

	// Get new wait time
	yoloWait = getWait();
	console.log('Waiting: ', wait / 1000, 'secs');
	// Setup time for next tweet
	nextYoloBadger = setTimeout(doYoloBadger, yoloWait);
    });
}

// Prepare timeer for first yolo badger
var yoloWait = getWait();
console.log('Next yolo badger in ', yoloWait / 1000, 'secs');
var nextYoloBadger = setTimeout(doYoloBadger, yoloWait);

function yoloBadger(callback) {
    // Try to only tweet between 8am and 10pm
    if (checkTime()) {
	return callback();
    }

    twitter.getATweet('#YOLO', function(error, user, id, tweet) {
	if (error) {
	    return callback(error);
	}

	console.log(user, id, tweet);

	chains.generateText('', 30, function(error, text) {
	    if (error) {
		return callback(error);
	    }

	    twitter.reply(user, id, text, function(error, result) {
		if (error) {
		    return callback(error);
		}

		callback(result);
	    });
	});
    });    
}

function checkTime() {
    var now = new Date();
    var evening = Date.today().addHours(22).addHours(tzOffset);
    var morning = Date.today().addHours(8).addHours(tzOffset);
    return now.isAfter(evening) || now.isBefore(morning); 
}

function getWait() {
    return getRandomInt(5800000, 28800000);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
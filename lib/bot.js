
var CronJob = require('cron').CronJob;
var dateUtils = require('date-utils');
var async = require('async');


var TwitterBot = function(client, chains) {
    this.lastMentionId = '1';
    this.startHour = 7;
    this.endHour = 21;
    this.tzOffset = -7;
    this.timers = {};
    this.badgerQueries = ['#YOLO'];
    this.cronJobs = {};
    
    this.waits = {
	'tweet': [5800000, 28800000],
	'badger': [580000, 280000]
    }

    this.minWait = 5800000;
    this.maxWait = 28800000;

    this.twitterClient = client;

    this.maxChainLength = 30;
    this.chains = chains;

    this.startMentionJob();
    this.startTimers();
};

TwitterBot.prototype.startMentionJob = function() {
    var that = this;
    var replyToMentions = function() {
	that.respondToMentions(function(error, mentions) {
	    if (error) {
		return console.log(error);
	    }
	    
	    console.log('Repsonded to ', mentions.length, 'mentions');
	});
    };

    this.cronJobs['mentions'] = new CronJob(
	'*/5 * * * *', replyToMentions, null, true, null
    );
    
    replyToMentions();
};

TwitterBot.prototype.resetTimer = function(timer, func) {
    var that = this;
    var wait = this.getWait(timer);
    
    if (this.timers[timer]) {
	clearTimeout(this.timers[timer]);
    }

    this.timers[timer] = setTimeout(function() {
	func.call(that, function(error, tweet) {
	    if (error) {
		console.log(error);
	    }

	    console.log(tweet);
	    that.resetTimer(timer, func);
	});
    }, wait); 
    console.log(timer, 'timer has been set to', wait / 1000, 'secs');
};

TwitterBot.prototype.startTimers = function() {
    this.resetTimer('tweet', this.tweet);
    this.resetTimer('badger', this.badger);
};

TwitterBot.prototype.respondToMentions = function(callback) {
    var that = this;
    var replyedTo = [];

    this.twitterClient.getMentions(this.lastMentionId, function(error, mentions) {
	if (error) {
	    return callback(error);
	}

	if (!mentions.length) {
	    return callback(new Error('No mentions to handle'));
	}

	if (that.lastMentionId === '1') {
	    that.lastMentionId = mentions[0].id;
	    console.log('First run, updating mention id', that.lastMentionId);
	    return callback(null, replyedTo);
	}

	async.forEachSeries(
	    mentions,
	    function(mention, callback) {
		that.genTextFromChains(null, function(error, text) {
		    if (error) {
			return callback(null);
		    }
		    
		    that.twitteClient.reply(mention.user, mention.id, text,
					    function(error, result) {
			if (error) {
			    return callback(error);
			}

			if (parseInt(that.lastMentionId, 10) < parseInt(mention.id, 10)) {
			    that.lastMentionId = mention.id;
			}

			replyedTo.push(mention);
			callback(null, result);
		    });
		});
	    },
	    function(error) {
		if (error) {
		    return callback(error);
		}

		callbakc(null, replyedTo);
	    }
	);
    });
};

TwitterBot.prototype.tweet = function(callback) {
    var that = this;

    if (this.checkTime()) {
	return callback();
    }

    // Generate some text and tweet it
    this.genTextFromChains('', function(error, text) {
	if (error) {
	    return callback(error);
	}

	that.twitterClient.tweet(text, callback);
    });
};

TwitterBot.prototype.badger = function(callback) {
    var that = this;
    this.twitterClient.getATweet('#YOLO', function(error, user, id, tweet) {
	if (error) {
	    return callback(error);
	}

	console.log(user, id, tweet);

	that.genTextFromChains('', function(error, text) {
	    if (error) {
		return callback(error);
	    }

	    that.twitterClient.reply(user, id, text, function(error, result) {
		if (error) {
		    return callback(error);
		}

		callback(null, result);
	    });
	});
    });
};

TwitterBot.prototype.genTextFromChains = function(input, callback) {
    this.chains.generateText('', 30, function(error, text) {
	if (error) {
	    return callback(error);
	}
	
	callback(null, text);
    });
};

TwitterBot.prototype.checkTime = function() {
    var now = new Date();
    var evening = Date.today().addHours(this.endHour).addHours(this.tzOffset);
    var morning = Date.today().addHours(this.beginHour).addHours(this.tzOffset);
    return now.isAfter(evening) || now.isBefore(morning); 
}

TwitterBot.prototype.getWait = function(timer) {
    var min = this.waits[timer] ? this.waits[timer][0] || this.minWait : this.minWait;
    var max = this.waits[timer] ? this.waits[timer][1] || this.maxWait : this.maxWait;
    return this.getRandomInt(min, max);
}

TwitterBot.prototype.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = TwitterBot;
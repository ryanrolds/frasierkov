
var Twit = require('twit');

var Twitter = function(opts, allowTweeting) {
    this.allowTweeting = !!allowTweeting;
    this.opts = opts;
    this.client = new Twit(opts);
};

Twitter.prototype.tweet = function(text, callback) {
    var message = {
	'status': text
    };

    return this.post(message, callback);
};

Twitter.prototype.reply = function(user, id, text, callback) {
    var message = {
	'status': ['@', user, ' ', text].join(''),
	'in_reply_to_status_id': id
    };

    return this.post(message, callback);
};

Twitter.prototype.post = function(message, callback) {
    console.log('tweeting: ', message);

    if (this.allowTweeting) {
	return this.client.post('statuses/update', message, function(error, reply) {
	    if (error) {
		return callback(error);
	    }

	    callback(null, reply);
	});
    }

    callback(null, false);
};

Twitter.prototype.getTweets = function(query, callback) {
    var that = this;
    this.client.get('search/tweets', { 'q': query }, function(error, response) {
	if (error) {
	    return callback(error);
	}

	if (!response.statuses || !response.statuses.length) {
	    return callback(new Error('No statuses'));
	}

	callback(null, response.statuses);
    });
};

Twitter.prototype.getATweet = function(query, callback) {
    var that = this;
    this.getTweets({ 'q': query }, function(error, tweets) {
	if (error) {
	    return callback(error);
	}

	var orig = tweets[0];
	var text = orig.text;
	var id = orig.id_str;
	var user = orig.user.screen_name;

	callback(null, user, id, text);
    });
};

Twitter.prototype.getMentions = function(since, callback) {
    var opts = {};
    if (since) {
	opts.since_id = since;
    }

    this.client.get('statuses/mentions_timeline', opts, function(error, mentions) {
	if (error) {
	    return callback(error);
	}

	var mentions = mentions.map(function(mention) {
	    return {
		'id': mention.id_str,
		'text': mention.text,
		'user': mention.user.screen_name
	    }
	});

	callback(null, mentions);
    }); 
};

module.exports = Twitter;
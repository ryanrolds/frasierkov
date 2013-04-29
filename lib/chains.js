
var async = require('async');

var Chains = function(redis, bucket) {
    this.redis = redis;
    this.bucket = bucket;
    this.separator = ' ';
}

Chains.prototype.addText = function(text, callback) {
    var that = this;
    var words = text.split(this.separator);
    
    // The sentence has to be long enough
    if (words.length < 3) {
	return callback();
    }

    // This is needed to start sentences 
    // and when to end them
    words.push('');

    // Start with begining prefix
    var prefix = this.getPrefix('', '');

    async.doWhilst(
	function(callback) {
	    // Add a suffix to a chain.
	    that.redis.sadd(that.prefixToKey(prefix), words[0], callback);

	    // Remove oldest prefix part
	    prefix.shift();
	    // Add a new prefix part to end
	    prefix.push(that.prepareForPrefix(words.shift()));
	},
	function() {
	    return !!words.length;
	},
	callback
    );
};

Chains.prototype.prepareForPrefix = function(word) {
    return word.toLowerCase().trim();
};

Chains.prototype.prefixToKey = function(prefix) {
    return [this.bucket, prefix.join('_')].join(':');
};

Chains.prototype.getPrefix = function(s1, s2) {
    s1 = this.prepareForPrefix(s1);
    s2 = this.prepareForPrefix(s2);

    return [s1, s2];
};

Chains.prototype.generateText = function(text, max, callback) {
    var gen = [];
    var seed = this.getSeed(text);
    var that = this;

    var done = false;
    async.whilst(
	function() {
	    return !done && gen.length < max;
	},
	function(callback) {
	    var key = that.prefixToKey(seed);
	    that.redis.srandmember(key, function(error, suffix) {
		if (!suffix) {
		    done = true;
		}

		gen.push(suffix);
		seed.shift();
		seed.push(that.prepareForPrefix(suffix));
		callback();
	    });
	},
	function(error) {
	    if (error) {
		return callback(error);
	    }
	    
	    callback(null, gen.join(' ')); 
	}
    );
};

Chains.prototype.getSeed = function(text) {
    return ['', ''];
};

module.exports = Chains;
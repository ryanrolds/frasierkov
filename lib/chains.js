
var async = require('async');
var commonWords = require('../common_words');

var Chains = function(redis, bucket) {
    this.redis = redis;
    this.bucket = bucket;
    this.separator = ' ';
}

Chains.prototype.addText = function(text, callback) {
    var that = this;

    var words = text.split(this.separator);
    var sdrow = words.slice(0);
    sdrow.reverse();

    // The sentence has to be long enough
    if (words.length < 3) {
	return callback();
    }

    // This is needed to start sentences 
    // and when to end them
    words.push('');
    sdrow.push('');

    // Start with begining prefix
    var leftPrefix = this.getPrefix('', '');
    var rightPrefix = this.getPrefix('', '');

    async.doWhilst(
	function(callback) {
	    async.series(
		[
		    function(callback) {
			if (!words.length) {
			    return callback();
			}

			that.redis.sadd(that.prefixToKey(leftPrefix, 'left'), words[0], callback);;
		    },
		    function(callback){
			if (!sdrow.length) {
			    return callback();
			}

			that.redis.sadd(that.prefixToKey(rightPrefix, 'right'), sdrow[0], callback);
		    }
		],
		function(error, result) {
		    if (error) {
			return callback(error);
		    }	    
		    
		    // Remove oldest prefix part
		    leftPrefix.shift();
		    rightPrefix.pop();

		    // Add a new prefix part to end
		    leftPrefix.push(that.prepareForPrefix(words.shift()));
		    rightPrefix.unshift(that.prepareForPrefix(sdrow.shift()));
		    callback();
		}
	    );
	},
	function() {
	    return !!words.length || !!sdrow.length;
	},
	callback
    );
};

Chains.prototype.prepareForPrefix = function(word) {
    return word.toLowerCase().trim();
};

Chains.prototype.prefixToKey = function(prefix, direction) {
    var key = [this.bucket, direction, prefix.join('_')].join(':');
    console.log(key);
    return key;
};

Chains.prototype.getPrefix = function(s1, s2) {
    s1 = this.prepareForPrefix(s1);
    s2 = this.prepareForPrefix(s2);

    return [s1, s2];
};

Chains.prototype.generateText = function(source, max, callback) {
    var that = this;
    var gen = [];
    
    source = source.replace('\n', ' ');
    source = source.replace(/http[^\s]*/, '');
   
    var seed = this.getSeed(source);

    if (!seed) {
	return callback();
    }

    var leftSeed = seed;
    var rightSeed = seed;
    var that = this;

    var leftDone = false;
    var rightDone = false;

    async.whilst(
	function() {
	    return (!leftDone || !rightDone) && gen.length < max;
	},
	function(callback) {
	    async.series(
		[
		    function(callback) {
			that.redis.srandmember(that.prefixToKey(leftSeed, 'left'),
					       function(error, suffix) {
						   console.log(leftSeed, suffix);
			    if (error) {
				return callback();
			    }
			    
			    if (!suffix) {
				leftDone = true;
				return callback();
			    }
			    
			    gen.push(suffix);
			    leftSeed.shift();
			    leftSeed.push(that.prepareForPrefix(suffix));
			    callback();	
			});
		    },
		    function(callback) {
			that.redis.srandmember(that.prefixToKey(rightSeed, 'right'),
					       function(error, suffix) {
						   console.log(rightSeed, suffix);
			    if (error) {
				return callback();
			    }
			    
			    if (!suffix) {
				rightDone = true;
				return callback();
			    }
			    
			    gen.unshift(suffix);
			    rightSeed.shift();
			    rightSeed.push(that.prepareForPrefix(suffix));
			    callback();
			});
		    }
		],
		callback
	    );
	},
	function(error) {
	    if (error) {
		return callback(error);
	    }
	    
	    callback(null, gen.join(' ')); 
	}
    );
};

Chains.prototype.sortByLength = function(words) {
    return words.slice(0).sort(function(a, b) {
	return b.length - a.length;
    });
};

Chains.prototype.completePrefix = function(words, start) {
    var prefix = [];

    if (start === 0) {
	prefix[0] = words[start];
	prefix[1] = words[start + 1];
    } else if (start + 1 === words.length) {
	prefix[0] = words[start - 1];
	prefix[1] = words[start];
    } else {
	var rand = Math.random();
	if (rand < 0.25) {
	    prefix[0] = words[start];
	    prefix[1] = words[start - 1];
	} else if (rand < 0.5) {
	    prefix[0] = words[start];
	    prefix[1] = words[start + 1];
	} else if (rand < 0.75) {
	    prefix[0] = words[start - 1];
	    prefix[1] = words[start];
	} else {
	    prefix[0] = words[start + 1];
	    prefix[1] = words[start];
	}
    }

    return prefix;
};

Chains.prototype.removeCommonWords = function(words) {
    var depth = 1000;
    return words.filter(function(a) {
	var index = commonWords.indexOf(a);
	return index === -1 || index > depth;
    });
};

Chains.prototype.removeTwitterStuff = function(words) {
    words = words.filter(function(word) {
	return word.match(/^@/g) == null;
    });

    return words.map(function(word) {
	return word.replace(/#/g, '');
    });
};

Chains.prototype.getSeed = function(text) {
    if (!text) {
	return null;
    }
    
    var words = text.split(' ');
    words = this.removeTwitterStuff(words);
    
    if (words.length < 1) {
	return null;
    }

    words = words.map(function(word) {
	return word.toLowerCase();
    });

    var sorted = this.sortByLength(words);
    //sorted = this.removeCommonWords(sorted);
    var pickedIndex = words.indexOf(sorted[0]);
    var prefix = this.completePrefix(words, pickedIndex);

    return prefix;
};

module.exports = Chains;
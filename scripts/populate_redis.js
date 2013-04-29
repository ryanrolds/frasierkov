
var jsdom = require('jsdom');
var async = require('async');

var redisClient = require('../lib/redis');
var Chains = require('../lib/chains');
var chains = new Chains(redisClient, 'frasier');

jsdom.env(
    'http://www.kacl780.net/frasier/transcripts/',
    ['http://code.jquery.com/jquery.js'],
    function(error, window) {
	var $ = window.$;

	// Find the script and start iterating through contents of script
	async.forEachSeries(
	    $('.SeasonList ul li a'),
	    function(a, callback) {
		var href = a.href;
		console.log(href);
		processEpisode(href, callback);		
	    },
	    function(error, result) {
		if (error) {
		    console.log(error);
		}

		// Close redis connection
		window.close();
		redisClient.quit();
	    }
	);
    }
);

function processEpisode(href, callback) {
    jsdom.env(href, ["http://code.jquery.com/jquery.js"],
	function (errors, window) {
	    var $ = window.$;
	    var target = false; // If target is speaking
	    var elements = $('#rightCol pre').contents();

	    // Find the script and start iterating through contents of script
	    async.forEachSeries(
		elements,
		function(elm, callback) {
		    var tag = elm.tagName;
		    var text = elm.textContent;
		    
		    // We have to track who the last person to speak is
		    // If target is speaking, then break up lines in to 
		    // sentences and feed them in the markov chains
		    // else, ignore them
		    if (tag === 'B') {
			target = (text.trim() === 'Frasier:');
		    } else if (!tag && target) {
			// Cleanup the text
			var line = text.replace(/(\n|\r)+/g, ' ');
			line = line.replace(/(\[|\])/g, '');
			line = line.replace(/\s{3,}/g, ' ');

			// Split up in to sentences
			var sentences = line.match(/[^\.!\?]+[\.!\?]+/g);

			// If no sentences, move on
			if (!sentences || !sentences.length) {
			    return callback();
			}

			sentences = sentences.map(function(l) {
			    l = l.trim();
			    return l;
			});

			// Remove extra lines
			sentences = sentences.filter(function(s) {
			    return !!s;
			});

			// Feed the sentences in to the markov chains
			return async.forEachSeries(
			    sentences, 
			    function(s, callback) {
				chains.addText(s, callback);				
			    },
			    callback
			);
		    }

		    callback();
		},
		function(error, results) {
		    window.close();
		    callback();
		}
	    );
	}
    );
}

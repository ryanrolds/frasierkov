

var assert = require("should");
var redisClient = require('../lib/redis');

describe('Chains', function() {
    var Chains = require('../lib/chains');
    
    it('Chains should be a function', function() {
	Chains.should.a('function');
    });
    
    describe('#constructor', function() {
	var source = '@somename driving this car to prom because #YOLO';
	var sourcePrefix = ['driving', 'this'];
	var chains = new Chains(redisClient, 'frasier');	
	
	it('chains is an object', function() {
	    chains.should.be.a('object');
	});

	describe('#getSeed', function() {
	    var seed = chains.getSeed(source);
	    
	    it('seed should be an array', function() {
		seed.toString().should.equal(sourcePrefix.toString());
		seed.should.be.an.instanceOf(Array);
	    });
	});
	
	it('chains can gen text', function(done) {
	    var prefix = ['', ''];
	    var max = 30;
	    chains.generateText(source, max, function(error, text) {
		console.log(arguments);

		if (error) return done(error);
		
		text.split(' ').should.be.below(max + 1);
		text.length.should.be.above(0);
		done();
	    });
	});
    });
});


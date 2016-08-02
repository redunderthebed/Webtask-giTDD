var assert = require('assert');

describe('Some Tests', function(){
    it('do something', function(done){
        assert.equal(3, 4);
        done();
    });

    it('another even cooler test', function(done){
        assert.equal(3, 4);
        done();
    })

    it('more', function(done){
        assert.equal(3,4);
        done();
    })
    
    it('do something else', function(done){
        assert.equal(4, 4);
        done();
    });
    
    it('do more things', function(done){
        assert.notEqual(1,2);
        done();
    })

    it('has another test', function(done){
        assert.equal(3, 9);
        done();
    })
});


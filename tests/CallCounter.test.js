define(['./utils/CallCounter'], function(CallCounter) {
  require('mootools');
  var TestClass = new Class({
    Implements: [CallCounter],
    countCalls: ['f1', 'f2']
  });

  return {
    setUp: function(callback) {
      this.counter = new TestClass();
      callback();
    },

    'Functions are created': function(test) {
      test.expect(2);
      test.equal('function', typeOf(this.counter.f1));
      test.equal('function', typeOf(this.counter.f2));
      test.done();
    },

    'Call counts are zero by default': function(test) {
      test.expect(2);
      test.equal(0, this.counter.count('f1'));
      test.equal(0, this.counter.count('f2'));
      test.done();
    },

    'Calls increment the appropriate count': function(test) {
      test.expect(4);
      this.counter.f1();
      test.equal(1, this.counter.count('f1'));
      test.equal(0, this.counter.count('f2'));
      this.counter.f2();
      test.equal(1, this.counter.count('f1'));
      test.equal(1, this.counter.count('f2'));
      test.done();
    },

    'counter.getParams(name) returns empty list by default': function(test) {
      test.expect(2);
      test.deepEqual([], this.counter.getParams('f1'));
      test.deepEqual([], this.counter.getParams('f2'));
      test.done();
    },

    'counter.getParams(name) returns call parameters of all calls to name': function(test) {
      var x1 = {x: 1}, x2 = {x: 2}, x3 = {x: 3};
      test.expect(4);
      this.counter.f1(1, x1);
      test.deepEqual([[1, x1]], this.counter.getParams('f1'));
      this.counter.f1(2, x2);
      test.deepEqual([[1, x1], [2, x2]], this.counter.getParams('f1'));

      test.deepEqual([], this.counter.getParams('f2'));
      this.counter.f2(3, x3);
      test.deepEqual([[3, x3]], this.counter.getParams('f2'));
      test.done();
    },

    'counter.getParams(name, index) returns the parameters of the index-th call to name': function(test) {
      var x1 = {x: 1}, x2 = {x: 2};
      test.expect(2);
      this.counter.f1(1, x1);
      this.counter.f1(2, x2);
      test.deepEqual([1, x1], this.counter.getParams('f1', 0));
      test.deepEqual([1, x1], this.counter.getParams('f1', 0));
      test.done();
    }
  };
});

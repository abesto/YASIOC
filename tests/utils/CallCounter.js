define(function() {
  require('mootools');
  return new Class({
    initialize: function() {
      var i, calls = {};

      function saveCall(name) {
        calls[name] = [];
        return function() {
          calls[name].push(Array.prototype.slice.call(arguments, 0, arguments.length));
        }
      }

      for (i in this.countCalls) {
        //noinspection JSUnfilteredForInLoop
        var name = this.countCalls[i];
        this[name] = saveCall(name);
      }

      this.count = function(name) { return calls[name].length; };

      this.getParams = function(name, index) {
        if (typeOf(index) === 'null') return calls[name];
        else return calls[name][index];
      };
    }
  });
});

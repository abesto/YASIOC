var requirejs = require('requirejs');
requirejs.config({nodeRequire: require});
requirejs(['tests/CallCounter.test', 'tests/Router.test'], function(CallCounter, Router) {
  var reporter = require('nodeunit').reporters['default'];
  reporter.run({
    'Test utils': {
      CallCounter: CallCounter
    },
    Router: Router
  });
});

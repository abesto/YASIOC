require('mootools');

var config;

config = {};
config.development = {
  'mongo-url': 'mongodb://localhost/games',
  'openid-verify-url': 'http://localhost:8080/openid/verify'
};

config.production = Object.merge({}, config.development, {
  'openid-verify-url': 'http://abesto.net:8080/openid/verify'
});


var exports = config[process.env.NODE_ENV || 'development'];

if (typeof(module) != 'undefined') module.exports = exports;
if (typeof(define) != 'undefined') define(function() {return exports;});

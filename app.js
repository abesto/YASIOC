var express = require('express'),
requirejs = require('requirejs'),
app =  express.createServer(),
sio = require('socket.io').listen(app),
winston = require('winston'),
mongoose = require('mongoose'),
MongoStore = require('connect-mongo'),
sessionStore;

// Configuration - default
app.configure(function(){
  app.set('mongo-url', 'mongodb://localhost/games');
  mongoose.connect(app.set('mongo-url'));
  sessionStore = new MongoStore({
    url: app.set('mongo-url')
  });
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'o71174b016u0MY34mn278077WhJ5bx',
    store: sessionStore,
    key: 'express.sid' })
  );
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express['static'](__dirname + '/public'));
});

// Configuration - per environment
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {level: 0, colorize: true, timestamp: true});
  winston.loggers.add('Socket.IO', {console: {level: 0, colorize: true, timestamp: true}});
});

app.configure('production', function(){
  var logOptions = {level: 'warn', colorize: false, timestamp: true};
  app.use(express.errorHandler());
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, logOptions);
  winston.loggers.add('Socket.IO', {console: logOptions, file: {
    level: 2,
    timestamp: true,
    filename: 'SocketIO.log',
    maxsize: 1024 * 100,
    maxFiles: 3
    }}
  );
});

// Socket.IO config
sio.configure(function() {
  sio.set('logger', winston.loggers.get('Socket.IO'));
  sio.set('transports', [
  'websocket',
  'flashsocket',
  'htmlfile',
  'xhr-polling',
  'jsonp-polling'
  ]);
});

sio.configure('production', function(){
  sio.enable('browser client minification');
  sio.enable('browser client etag');
  sio.enable('browser client gzip');
});

// Connect Socket.IO to session
sio.set('authorization', function (data, accept) {
  if (data.headers.cookie) {
    data.cookie = require('connect').utils.parseCookie(data.headers.cookie);
    data.sessionID = data.cookie['express.sid'];
    data.sessionStore = sessionStore;
    sessionStore.get(data.sessionID, function (err, session) {
      if (err || !session) {
        accept(err, false);
      } else {
        data.session = new express.session.Session(data, session);
        accept(null, true);
      }
    });
  } else {
    return accept('No cookie transmitted.', false);
  }
});

// Routes, application code entry points

requirejs.config({nodeRequire: require});
requirejs(['./Router', './controllers/index'], function(Router, controllers) {
  var router = new Router({
    socketIOWrapper: function(socket, handler)
    {
      return function(data) {
        handler(data, socket.handshake.session, socket);
        socket.handshake.session.touch().save();
      };
    }
  });

  router.routeHttp(app, controllers, {'get': 'chat'});
  router.routeSocketIO(sio, controllers);

  app.listen(8080);
  winston.info('express server listening');
});

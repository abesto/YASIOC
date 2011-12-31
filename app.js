var express = require('express'),
app =  express.createServer(),
sio = require('socket.io').listen(app),
winston = require('winston'),
mongoose = require('mongoose'),
MongoStore = require('connect-mongo'),
config = require('./config'),
requirejs = require('requirejs'),
sessionStore;

app.configure(function(){
  // Mongoose and mongo session store
  mongoose.connect(config['mongo-url']);
  sessionStore = new MongoStore({
    url: config['mongo-url'],
    clear_interval: 60
  });

  // Views
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');

  // Middlware
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

sio.configure(function() {
  sio.set('logger', winston.loggers.get('Socket.IO'));
  sio.set('transports', [
  'websocket',
  'flashsocket',
  'htmlfile',
  'xhr-polling',
  'jsonp-polling'
  ]);

  // Connect Socket.IO actions to the session
  sio.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
      data.cookie = require('connect').utils.parseCookie(data.headers.cookie);
      data.sessionID = data.cookie['express.sid'];
      data.sessionStore = sessionStore;
      sessionStore.get(data.sessionID, function (err, session) {
        if (err || !session) {
          accept(err, false);
        } else {
          accept(null, true);
        }
      });
    } else {
      return accept('No cookie transmitted.', false);
    }
  });
});

sio.configure('production', function(){
  sio.enable('browser client minification');
  sio.enable('browser client etag');
  sio.enable('browser client gzip');
});

// Routes, application code entry points

requirejs.config({nodeRequire: require});
requirejs(['./Router', './controllers/index'], function(Router, controllers) {
  var router = new Router({
    socketIOWrapper: function(socket, handler, authFilters, runAuthFilters)
    {
      return function(data) {
        sessionStore.get(socket.handshake.sessionID, function (err, _session) {
          if (err || !_session) {
            socket.emit('error', {type: 'NO_SESSION', message: 'No session found', err: err});
            if (socket.disconnected) {
              socket.get('last_session', function(err, session) {
                if (session && !err) handler(data, session, socket);
              });
            }
          } else {
            var session = new express.session.Session(socket.handshake, _session),
              auth = runAuthFilters(session, null, null, authFilters);
            socket.set('last_session', session, function() {
              if (!auth.valid) {
                socket.emit('error', auth);
              } else {
                handler(data, session, socket);
              }
              session.touch().save();
            });
          }
        });
      };
    }
  });

  router.routeHttp(app, controllers, {'get': 'chat'});
  router.routeSocketIO(sio, controllers);

  app.listen(8080);
  winston.info('express server listening');
});

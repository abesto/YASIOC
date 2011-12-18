var express = require('express'),
controllers = require('./controllers'),
app = module.exports = express.createServer(),
sio = require('socket.io').listen(app),
pg = require('pg'),
Session = require('connect').middleware.session.Session,
PGStore = require('connect-pg'), sessionStore,
winston = require('winston');

winston.add(winston.transports.File, { filename: 'somefile.log' });

// PostgreSQL connection for session handler
sessionStore = new PGStore(function(callback) {
  pg.connect('tcp://nodepg:bideog@localhost/games',
  function (err, client) {
    if (err) {
      console.log(JSON.stringify(err));
    }
    if (client) {
      callback(client);
    }
  });
});

// Configuration - default
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    store: sessionStore,
    secret: 'o71174b016u0MY34mn278077WhJ5bx',
    key: 'express.sid' })
  );
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express['static'](__dirname + '/public'));
});

// Configuration - per environment
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Socket.IO config
sio.set('transports', [
'websocket',
'flashsocket',
'htmlfile',
'xhr-polling',
'jsonp-polling'
]);
sio.configure('production', function(){
  sio.enable('browser client minification');
  sio.enable('browser client etag');
  sio.enable('browser client gzip');
  sio.set('log level', 1);
});

// Connect Socket.IO to session
sio.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.cookie = require('connect').utils.parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        data.sessionStore = sessionStore;
        sessionStore.get(data.sessionID, function (err, session) {
            if (err || !session) {
                accept('Error', false);
            } else {
                data.session = new Session(data, session);
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
});

// Routes
require('./routes')(app, sio);

app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

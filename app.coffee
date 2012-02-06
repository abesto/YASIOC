requirejs = require 'requirejs'
requirejs.config {nodeRequire: require}

requirejs ['fs', 'path', 'express', 'socket.io', 'winston', 'mongoose', 'connect-mongo', 'cs!config'],
(fs, path, express, sio, winston, mongoose, MongoStore, config) ->
  app = express.createServer()
  sio = sio.listen app
  sessionStore = null

  app.configure ->
    # Mongoose and mongo session store
    mongoose.connect config['mongo-url']
    sessionStore = new MongoStore
      url: config['mongo-url']
      clear_interval: 60

    app.set 'views', __dirname + '/views'
    app.set 'view engine', 'jade'

    # Middleware
    app.use express.bodyParser()
    app.use express.methodOverride()
    app.use express.cookieParser()
    app.use express.session
      secret: 'o71174b016u0MY34mn278077WhJ5bx'
      store: sessionStore
      key: 'express.sid'

    app.use app.router
    app.use express['static'](__dirname + '/public')

    winston.remove winston.transports.Console
  # EOF common configuration

  app.configure 'development', ->
    app.use express.errorHandler(dumpExceptions: true, showStack: true)

    winston.add winston.transports.Console, {level: 0, colorize: true, timestamp: true}
    winston.loggers.add 'Socket.IO', {console: {level: 0, colorize: true, timestamp: true}}
    winston.loggers.add 'app', {console: {level: 0, colorize: true, timestamp: true}}

  app.configure 'production', ->
    logOptions =
     level: 'warn'
     colorize: false
     timestamp: true

    app.use express.errorHandler()
    winston.add winston.transports.Console, logOptions
    winston.loggers.add 'Socket.IO',
      console: logOptions,
      file:
        level: 2
        timestamp: true
        filename: 'SocketIO.log'
        maxsize: 1024 * 100
        maxFiles: 3
    winston.loggers.add 'app',
      console: logOptions,
      file:
        level: 2
        timestamp: true
        filename: 'app.log'
        maxsize: 1024 * 100
        maxFiles: 3

  # Cache compiled CoffeeScript and Stylus files
  app.use require('connect-assets')(buildFilenamer: (file) -> file)
  cacheAssets = (dir) ->
    absoluteDir = __dirname + '/assets' + dir
    files = fs.readdirSync absoluteDir
    for file in files
      if fs.statSync(absoluteDir + '/' + file).isDirectory() then cacheAssets(dir + '/' + file)
      else
        winston.debug "Caching asset file assets#{dir}/#{file}"
        if path.extname(file) in ['.js', '.coffee'] then js dir + '/' + file[0...file.indexOf '.']
        if path.extname(file) in ['.styl', '.css'] then css dir + '/' + file[0...file.indexOf '.']
  cacheAssets ''

  sio.configure ->
    sio.set 'logger', winston.loggers.get('Socket.IO')
    sio.set 'transports', [
      'websocket'
      'flashsocket'
      'htmlfile'
      'xhr-polling'
      'jsonp-polling'
    ]

  # Connect Socket.IO actions to the session
  sio.set 'authorization', (data, accept) ->
    if data.headers.cookie
      data.cookie = require('connect').utils.parseCookie(data.headers.cookie)
      data.sessionID = data.cookie['express.sid']
      data.sessionStore = sessionStore
      sessionStore.get data.sessionID, (err, session) ->
        if (err || !session)
          accept err, false
        else
          accept null, true
    else
      accept 'No cookie transmitted.', false


  sio.configure 'production', ->
    sio.enable 'browser client minification'
    sio.enable 'browser client etag'
    sio.enable 'browser client gzip'

  # Routes, application code entry points
  requirejs ['cs!Router', 'cs!controllers/index'], (Router, controllers) ->
    router = new Router
      socketIOWrapper: (socket, handler, authFilters, runAuthFilters) ->
        (data) -> sessionStore.get socket.handshake.sessionID, (err, _session) ->
          if (err || !_session)
            socket.emit 'error', {type: 'NO_SESSION', message: 'No session found', err: err}
            if  socket.disconnected
              socket.get 'last_session', (err, session) ->
                if (session && !err)
                  handler(data, session, socket)
          else
            session = new express.session.Session socket.handshake, _session
            auth = runAuthFilters session, null, null, authFilters
            socket.set 'last_session', session, ->
              if (!auth.valid)
                socket.emit 'error', auth
              else
                handler data, session, socket
              session.touch().save()

    router.routeHttp app, controllers, {'get': 'chat'}
    router.routeSocketIO sio, controllers

    app.listen 8080
    winston.info 'express server listening'

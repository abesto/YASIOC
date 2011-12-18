var controllers = require('./controllers'),
winston = require('winston');

module.exports = function(app, sio)
{
  var controllerName, controller, actionName, eventName, methodIndex, method,
  httpMethods = ['get', 'post'];

  for (controllerName in controllers) {
    controller = controllers[controllerName];
    for (methodIndex in httpMethods) {
      method = httpMethods[methodIndex];
      if (typeof(controller[method]) == 'undefined') continue;
      for (actionName in controller[method]) {
        app[method]('/' + controllerName + '/' + actionName, controller[method][actionName]);
      }
      if (typeof(controller[method].defaultAction) == 'string') {
        app[method]('/'+controllerName, controller[method][controller[method].defaultAction]);
      }
    }
  }

  app.get('/', controllers.index.get.index);

  function sioHandler(socket, handler)
  {
    return function(data) {
      data.session = socket.handshake.session;
      handler(data);
    };
  }

  sio.sockets.on('connection', function (socket) {
    for (controllerName in controllers) {
      controller = controllers[controllerName];
      if (controller.sio instanceof Object) {
        for (eventName in controller.sio) {
          socket.on(eventName, sioHandler(socket, controller.sio[eventName]));
        }
      }
    }
  });
};
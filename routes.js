define(['./controllers/index'], function(controllers) {
  var winston = require('winston'),
  httpMethods = ['get', 'post'];

  function sioHandler(socket, handler)
  {
    return function(data) {
      handler(data, socket.handshake.session, socket);
    };
  }

  return function (app, sio)
  {
    var controllerName, controller, actionName, eventName, methodIndex, method;
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

    app.get('/', controllers.chat.get.index);


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

    sio.sockets.on('disconnect', function(socket) {
      
    });
  };
});
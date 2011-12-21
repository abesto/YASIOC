define(function() {
  require('mootools');

  var httpMethods = ['get', 'head', 'post', 'put', 'delete', 'options', 'trace', 'connect'],
  format = require('util').format;


  function bindHttpAction(opts)
  {
    if (!opts.controller[opts.method][opts.actionName]) {
      opts.logger.warn(
        format('Action(%s) %s.%s not found', opts.method, opts.controllerName, opts.actionName)
      );
    } else if (!(opts.controller[opts.method][opts.actionName] instanceof Function)) {
      opts.logger.warn(
        format('Action(%s) %s.%s is not a function', opts.method, opts.controllerName, opts.actionName)
      );
    } else {
      var url = opts.url || '/' + opts.controllerName + '/' + opts.actionName;
      opts.app[opts.method](url, opts.wrapper(opts.controller[opts.method][opts.actionName]).bind(opts.controller));
      opts.logger.debug(
        format('Action(%s) %s.%s set up to handle URL %s',
        opts.method, opts.controllerName, opts.actionName, url)
      );
    }
  }

  function validHttpMethod(method, logger)
  {
    if (!httpMethods.contains(method)) {
      logger.warn('Unknown HTTP method "' + method + '". Maybe you capitalized the method?');
      return false;
    } else {
      return true;
    }
  }

  return new Class({
    Implements: [Options],
    options: {
      logger: require('winston'),
      // Used to set HTTP routing (eg. app.get(url, action))
      // Wraps http action
      httpWrapper: function(f) { return f; },
      // Wraps socket.io actions, useful for eg. passing the Express session in
      // The second parameter is the socket
      socketIOWrapper: function(handler) { return handler; }
    },

    initialize: function(options) { this.setOptions(options); },

    // controllers is a hash of controllerName => httpMethod => actionName => function(res, req)
    // Additionally the optional 'defaultAction' key of each httpMethod hash is special, it provides
    // the action to call when none is provided explicitly.
    //
    // defaultControllers is an optional hash of httpMethod => controllerName
    // This function creates the following bindings (by calling this.options.app[httpMethod]):
    //   /                    -> The default action of the default controller
    //   /:controller         -> The default action of controller
    //   /:controller/:action -> Kinda obvious ;)
    routeHttp: function(app, controllers, defaultControllers)
    {
      var method, controllerName, actionName,
      bindOptions = {app: app, wrapper: this.options.httpWrapper, logger: this.options.logger};
      // Default controller, default action
      if (defaultControllers) {
        for (method in defaultControllers) {
          if (!defaultControllers.hasOwnProperty(method) || method === 'sio')
            continue;  // sio "method" is handled separately in function routeSocketIO
          // HTTP method is valid
          if (validHttpMethod(method, this.options.logger)) {
            bindOptions.method = method;
            bindOptions.controllerName = defaultControllers[method];
            bindOptions.controller = controllers[ bindOptions.controllerName ];
            // defaultAction property exists
            if (!bindOptions.controller[method].defaultAction) {
              this.options.logger.warn('Property defaultAction is missing from default controller "' +
              bindOptions.controllerName + '" of method "' + method + '"');
            } else {
              bindOptions.actionName = bindOptions.controller[method].defaultAction;
              bindOptions.url = '/';
              bindHttpAction(bindOptions);
            } // defaultAction property exists
          } // Method is valid
        } // For each method of defaultControllers
      } // defaultControllers is set

      // Everything else
      bindOptions = {app: app, wrapper: this.options.httpWrapper, logger: this.options.logger};
      // For each controller
      for (controllerName in controllers) {
        if (!controllers.hasOwnProperty(controllerName)) continue;
        bindOptions.controllerName = controllerName;
        bindOptions.controller = controllers[controllerName];
        // For each HTTP method handled in the controller
        for (method in bindOptions.controller) {
          if (!bindOptions.controller.hasOwnProperty(method) || method === 'sio')
            continue;  // sio "method" is handled separately in function routeSocketIO
          // (but only valid methods of course)
          if (validHttpMethod(method, this.options.logger)) {
            bindOptions.method = method;
            // Bind the default action if it's set
            if (bindOptions.controller[method].defaultAction) {
              bindOptions.url = '/' + bindOptions.controllerName;
              bindOptions.actionName = bindOptions.controller[method].defaultAction;
              bindHttpAction(bindOptions);
              delete bindOptions.url;
            }
            // And all other actions
            for (actionName in bindOptions.controller[method]) {
              if (actionName === 'defaultAction') continue;
              bindOptions.actionName = actionName;
              bindHttpAction(bindOptions);
            }
            // Add to the context of actions
            bindOptions.controller.logger = this.options.logger;
          }
        }
      }
    },

    routeSocketIO: function(socketIO, controllers)
    {
      function connectionHandler(wrapper, controller, logger)
      {
        return function(socket) {
          var actionName;
          // Bind each action as appropriate
          for (actionName in this.controller.sio) {
            if (!this.controller.sio.hasOwnProperty(actionName) || actionName === 'initialize') continue;
            socket.on(actionName,
              wrapper(socket, controller.sio[actionName].bind(controller)
              )
            );
          }
          // Set up the environment for the action
          this.controller.logger = logger;
          // And call initialize if present
          if (controller.sio.initialize) {
            wrapper(socket, controller.sio.initialize).call(controller, {});
          }
        };
      }
      // EOF function connectionHandler

      // For each controller
      for (var controllerName in controllers) {
        if (!controllers.hasOwnProperty(controllerName)) continue;
        controller = controllers[controllerName];
        // That has methods for handling socketIO events
        if (!controller.sio) continue;
        // Listen on a namespace with the same name as the controller
        socketIO.of('/' + controllerName).on('connection',
          connectionHandler(this.options.socketIOWrapper, controller, this.options.logger)
        );
      } // For each controller
    } // routeSocketIO
  }); // return new Class
}); // define
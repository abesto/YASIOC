define ['mootools'], ->
  httpMethods = ['get', 'head', 'post', 'put', 'delete', 'options', 'trace', 'connect']
  authFilters =
    any: -> {valid: true}
    login: (session) ->
      if (session.user) then {valid: true}
      else
        {
          valid: false
          type: 'NO_LOGIN'
          httpCallback: (req, res) ->
            res.writeHeader 302, {Location: '/openid'}
            res.end()
        }

  defaultAuthFilters = ['login']

  getAuthFilters = (actions, actionName) ->
    names = actions.authFilters?[actionName] ? defaultAuthFilters
    return (authFilters[name] for name in names)

  runAuthFilters = (session, actions, actionName, filters) ->
    filters = filters || getAuthFilters(actions, actionName)
    for filter in filters
      ret = filter(session)
      if (!ret.valid) then return ret
    return {valid: true}

  bindHttpAction = (opts) ->
    {method: method, actionName: actionName} = opts
    # Check that the binding is valid
    if (not opts.controller[method][actionName]?)
      opts.logger.warn "Action(#{method}) #{opts.controllerName}.#{actionName} not found"
    else if (!(opts.controller[method][actionName] instanceof Function))
      opts.logger.warn "Action(#{method}) #{opts.controllerName}.#{actionName} is not a function"
    else
      # It is.
      url = opts.url ? "/#{opts.controllerName}/#{actionName}"
      # Run wrapper only once
      wrapped = opts.wrapper(opts.controller[method][actionName]).bind(opts.controller)

      opts.app[method] url, (req, res) ->
        # Run filters
        auth = runAuthFilters req.session, opts.controller[method], actionName
        if !auth.valid
        # Filters returned not valid, log it
          opts.logger.debug(
            "Permission check failed for #{method} #{url} (#{opts.controllerName}.#{actionName}): #{auth.type}"
          )
          # If the filter specified a callback, run it
          if auth.httpCallback?
            auth.httpCallback?(req, res)
          # Otherwise render the 500 Internal server error page
          else
            res.writeHeader 500
            res.render 'error'
        # Filters said request is valid
        else
          wrapped(req, res)

    opts.controller.logger = opts.logger
    opts.logger.debug "Router mapping: #{method} #{url} -> #{opts.controllerName}.#{actionName}"
  # EOF bindHttpAction

  validHttpMethod = (method, logger) -> method in httpMethods

  bindSocketIOActions = (wrapper, controller) ->
    (socket) ->
      # Bind each action as appropriate
      for actionName, action of controller.sio
        socket.on actionName, wrapper(
          socket,
          action.bind(controller),
          getAuthFilters(controller['sio'], actionName),
          runAuthFilters
        )

      controller.logger = @logger

      # And call initialize if present
      if controller.sio.initialize?
        wrapper(
          socket,
          controller.sio.initialize,
          getAuthFilters(controller['sio'], 'initialize'),
          runAuthFilters
        ).call(controller, {})
  # EOF bindSocketIOAction

  class Router
    constructor: ({@logger, @httpWrapper, @socketIOWrapper}) ->
      @logger ?= require 'winston'
      # Used to set HTTP routing (eg. app.get(url, action))
      # Wraps http action
      @httpWrapper ?= (x) -> x
      # Wraps socket.io actions, useful for eg. passing the Express session in
      # The second parameter is the socket
      @socketIOWrapper ?= (x) -> x

    # controllers is a hash of controllerName => httpMethod => actionName => function(res, req)
    # Additionally the optional 'defaultAction' key of each httpMethod hash is special, it provides
    # the action to call when none is provided explicitly.
    #
    # defaultControllers is an optional hash of httpMethod => controllerName
    # This function creates the following bindings (by calling this.options.app[httpMethod]):
    #   /                    -> The default action of the default controller
    #   /:controller         -> The default action of controller
    #   /:controller/:action -> Kinda obvious ;)
    routeHttp: (app, controllers, defaultControllers) ->
      bindOptions = app: app, wrapper: @httpWrapper, logger: @logger
      ## Default controller
      for method, controllerName of defaultControllers
        # sio "method" is handled separately in function routeSocketIO
        if method in ['sio', 'logger'] then continue

        # HTTP method is valid
        if not validHttpMethod method
          @logger.warn "Unknown HTTP method \"#{method}\" (note that all method names must be lowercase)"
          continue

        bindOptions.method = method;
        bindOptions.controllerName = controllerName
        bindOptions.controller = controllers[ bindOptions.controllerName ]

        # default action of the default controller
        if not bindOptions.controller[method].defaultAction?
          @logger.warn "Property defaultAction is missing from default controller \"#{bindOptions.controllerName}\"" +
            " of HTTP method #{method}"
        else
          bindOptions.actionName = bindOptions.controller[method].defaultAction;
          bindOptions.url = '/';
          bindHttpAction bindOptions

      ## End of default controller

      bindOptions =  app: app, wrapper: @httpWrapper, logger: @logger

      # For each controller
      for controllerName, controller of controllers
        bindOptions.controllerName = controllerName;
        bindOptions.controller = controller

        for method, actions of bindOptions.controller
          if method in ['sio', 'logger'] then continue
          if !validHttpMethod method
            @logger.warn "Unknown HTTP method #{method} (note that all method names must be lowercase)"
            continue

          bindOptions.method = method;

          # Bind the default action if it's set
          if bindOptions.controller[method].defaultAction?
            bindOptions.url = '/' + bindOptions.controllerName
            bindOptions.actionName = bindOptions.controller[method].defaultAction
            bindHttpAction bindOptions
            bindOptions.url = null

          # And all other actions
          for actionName, action of actions
            if actionName == 'defaultAction' || actionName == 'authFilters' then continue

            bindOptions.actionName = actionName
            bindHttpAction bindOptions
    # EOF routeHttp

    routeSocketIO: (socketIO, controllers) ->
      # For each controller
      for controllerName, controller of controllers
        # That has methods for handling socketIO events
        if not controller.sio? then continue
        # Listen on a namespace with the same name as the controller
        socketIO.of("/#{controllerName}").on('connection', bindSocketIOActions(@socketIOWrapper, controller))

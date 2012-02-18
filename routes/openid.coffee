define ['openid', 'cs!models/user', 'cs!config', 'winston'], (openid, userModel, config, winston) ->
  extensions = [
    new openid.AttributeExchange
      "http://axschema.org/namePerson/friendly": "required",
      "http://axschema.org/contact/email": "required",
      "http://axschema.org/namePerson": "required"
  ]

  relyingParty = new openid.RelyingParty config['openid-verify-url'], # Verification URL (yours)
    null, # Realm (optional, specifies realm for OpenID authentication)
    false, # Use stateless verification
    false, # Strict mode
    extensions # List of extensions to enable and include

  app.get '/login', (req, res) -> res.render 'openid'
  app.get '/openid/authenticate', (req, res) ->
    # User supplied identifier
    identifier = req.param 'openid_identifier'
    # Resolve identifier, associate, and build authentication URL
    relyingParty.authenticate identifier, false, (error, authUrl) =>
      if error
        res.writeHead 200
        res.end 'Authentication failed: ' + error
      else if !authUrl
        res.writeHead 200
        res.end 'Authentication failed'
      else
        res.writeHead 302, { Location: authUrl }
        res.end()

  app.get '/openid/verify', (req, res) ->
    relyingParty.verifyAssertion req, (error, result) =>
      if !error && result.authenticated
        userModel.login result, req.session.id, (err, user) =>
          if err
            @logger.warn err
            res.end 'Error :('
            return
          else if user
            req.session.user = user
            res.writeHead 302, {'Location': '/'}
          else
            res.writeHead 302, {Location: '/openid'}
          res.end()

  app.get 'logout', (req, res) ->
    if req.session?.user?
      userModel.getAndClearSessionIds req.session.user.id, (err, ids) =>
        if  err
          @logger.warn err
        else if !ids
          @logger.warn 'Logout: no sessions found'
        else if ids
          @logger.debug 'Logout: destroying sessions of user ' + req.session.user.name + ': ' + ids.join(', ')
          req.sessionStore.destroy(sid) for sid in ids
    res.render 'logout'

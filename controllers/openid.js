define(['openid', 'models/user'], function(openid, userModel) {
  var config = require('config');

  var extensions = [
    new openid.AttributeExchange(
      {
        "http://axschema.org/namePerson/friendly": "required",
        "http://axschema.org/contact/email": "required",
        "http://axschema.org/namePerson": "required"
      })],

    relyingParty = new openid.RelyingParty(
      config['openid-verify-url'], // Verification URL (yours)
      null, // Realm (optional, specifies realm for OpenID authentication)
      false, // Use stateless verification
      false, // Strict mode
      extensions); // List of extensions to enable and include

  return {
    get: {
      defaultAction: 'index',
      authFilters: {
        index: ['any'],
        authenticate: ['any'],
        verify: ['any']
      },

      authenticate: function(req, res) {
        // User supplied identifier
        var identifier = req.param('openid_identifier');

        // Resolve identifier, associate, and build authentication URL
        relyingParty.authenticate(identifier, false, function(error, authUrl)
        {
          if (error)
          {
            res.writeHead(200);
            res.end('Authentication failed: ' + error);
          }
          else if (!authUrl)
          {
            res.writeHead(200);
            res.end('Authentication failed');
          }
          else
          {
            res.writeHead(302, { Location: authUrl });
            res.end();
          }
        }.bind(this));
      },

      verify: function(req, res) {
        relyingParty.verifyAssertion(req, function(error, result)
        {
          var to;
          if (!error && result.authenticated) {
            userModel.auth(result, function(err, user) {
              if (err) {
                this.logger.warn(err);
                res.end('Error :(');
                return;
              } else if (user) {
                req.session.user = user;
                res.writeHead(302, {
                  'Location': '/'
                });
              } else {
                res.writeHead(302, {Location: '/openid'});
              }
              res.end();
            }.bind(this));
          }
        });
      },

      index: function(req, res) {
        res.render('openid');
      },

      logout: function(req, res) {
        delete req.session.user;
        res.render('logout');
      }
    }
  };
});
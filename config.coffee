define ->
  config =
    development:
      'mongo-url': 'mongodb://localhost/games',
      'openid-verify-url': 'http://localhost:8080/openid/verify'

    production:
      'mongo-url': 'mongodb://localhost/games',
      'openid-verify-url': 'http://localhost:8080/openid/verify'
      'openid-verify-url': 'http://abesto.net:8080/openid/verify'

  return config[process.env.NODE_ENV || 'development']


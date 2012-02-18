controllers = ['ludo', 'openid']

define ("cs!./#{controller}" for controller in controllers), (params...) ->
  ret = {}
  for controller, index in controllers
    ret[controller] = params[index]
  return ret

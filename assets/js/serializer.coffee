prefix = (f, cs=true) ->
  if not window?
    f = 'assets/js/' + f
    if cs then f = 'cs!' + f
  f

define [prefix('lib/async', false)], (async) ->
  requirePrefixes =
    Board: prefix 'boards/'

  serialize = (input, callback) ->
    if input is null or input is undefined
      callback? null, ''
      return
    # Array: serialize each item, join and prepend with "|"
    if input instanceof Array
      async.map input, serialize, (err, results) -> callback?(err, '|' + results.join '|' )
    else
      # Check that the object implements all required methods
      for prop in ['serialType', 'serialClass', 'serialData', 'unserialize']
        if typeof input[prop] is not 'function'
          callback "#{input} doesn't implement #{prop} method required for serialization"
          return
      # Serialize to string
      values = []
      for prop in ['serialType', 'serialClass', 'serialData']
        value = input[prop]()
        for forbidden in [';', '|']
          if forbidden in value
            callback "#{prop} must not contain #{forbidden}"
            return
        values.push value

      callback?(null, values.join ';')

  # Only async return via callback
  unserialize = (string, callback) ->
    if string.length == 0
      callback? null, null
      return
    # Array: unserialize items after unescaping
    if string[0] == '|'
      async.map string[1..].split('|'), unserialize, (err, results) -> callback?(null, results)
    # Otherwise load the class if we know how to, and let it unserialize itself
    else
      [type, clazz, data] = string.split ';'
      if requirePrefixes[type]
        require [requirePrefixes[type] + clazz], (C) ->
          callback?(null, C.unserialize(data))
      else
        if typeof eval(clazz) == 'undefined'
          callback? "Class #{clazz} not found"
        else
          callback? null, eval(clazz).unserialize(data)

  return {serialize: serialize, unserialize: unserialize}

define ->
  class CallCounter
    constructor: (names...) ->
      @calls = {}
      for name in names
        do (name) =>
          @calls[name] = []
          @[name] = (params...) =>
            @calls[name].push params

    count: (name) ->
      @calls[name].length

    getParams: (name, index) ->
      if index? then @calls[name][index]
      else @calls[name]

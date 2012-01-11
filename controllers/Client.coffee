define ['mootools'], ->

  channelName = (channel) -> channel.flatten().join('-')

  class Client
    constructor: (@session, @socket) ->
      @name = @session?.user?.name

    join: (channel...) -> @socket.join channelName(channel)
    leave: (channel...) -> @socket.leave channelName(channel)

    # Send data to the socket that sent the message we're handling
    respond: (type, data) ->
      data.time ?= (new Date()).getTime()
      @socket.emit type, data

    # Send data to a channel, 'public' by default
    send: (type, data, channel...) ->
      data.time ?= (new Date()).getTime()
      @socket.namespace.in( channelName(channel) ).emit type, data

    # Get a list of usernames on the same server as client
    userList: (prefix) ->
      ret = []
      for roomName, room of @socket.manager.rooms
        if roomName.substring(0, prefix.length) == prefix
          ret.push roomName.substring(prefix.length)
      return ret

  return {
    Client: Client,
    withClient: (callback) -> (data, session, socket) ->
      callback new Client(session, socket), data, session, socket
  }


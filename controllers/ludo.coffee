define ['functools', 'models/ludo', './Client'], (F, Model, Client) ->
  controller = get: {}, sio: {}

  # Helper: identifies the game channel
  channel = (data) -> ['ludo', data.id]

  # Helper: add ludo model and client instance to the parameter list
  withModelAndClient = (callback) ->
    (data, session, socket) ->
      Model.load data.id, (err, model) ->
        if err
          controller.logger.warn err
          socket.emit 'error', err
        else
          f = Client.withClient (client, data, session, socket) -> callback model, client, data, session, socket
          f data, session, socket

  # Index page
  controller.get.defaultAction = 'index'
  controller.get.index = (req, res) -> res.render 'ludo'

  controller.sio.create = (data, session, socket) ->
    Model.create (err, model) =>
      if err
        @logger.warn err
        socket.emit 'error', err
      else
        socket.emit 'created', id: model.getId()

  # Join a running game
  controller.sio.join = withModelAndClient (model, client, data, session, socket) ->
    client.respond 'gamestate', model.getState()
    client.join channel(data)

  # Choose a color
  controller.sio['choose-color'] = withModelAndClient (model, client, data, session) ->
      res = model.join session.user._id, data.color
      if res.name == 'Error' then client.respond 'error', cause: res.message
      else client.send 'move', {piece: piece}, channel(data) for piece in res

  # Start the game
  controller.sio.start = withModelAndClient (model, client, data) ->
      ret = model.start()
      if ret?.name == 'Error' then client.respond 'error', {cause: ret.message}
      else client.send 'start', {}, channel(data)

  # Don't make a move
  controller.sio.skip = withModelAndClient (model, client, data, session) ->
      ret = model.skip(session.user._id);
      if ret?.name == 'Error' then client.respond 'error', cause: ret.message
      else client.send 'dice-roll', {value: ret}, channel(data)

  controller.sio['roll-dice'] = withModelAndClient (model, client, data, session, socket) ->
      ret = model.rollDice session.user._id
      if ret?.name == 'Error' then client.respond 'error', {cause: ret.message}
      else client.send 'dice-roll', {value: ret}, channel(data)

  controller.sio.move = withModelAndClient (model, client, data, session, socket) ->
      ret = model.move(data.piece, session.user._id);
      if ret?.name == 'Error' then client.respond 'invalid-move', cause: ret.message
      else
        client.send 'move', {piece: piece}, channel(data) for piece in ret
        client.send 'dice-roll', {value: null}, channel(data)

  return controller

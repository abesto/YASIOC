require ['cs!controllers/base', 'cs!models/game', 'cs!models/user', 'async'], (base, GameModel, UserModel, async) ->
  app.get '/edit', (req, res) ->
    GameModel.findAll (err, games) ->
      if err then base.get.error req, res, err
      else
        addOwner = (game, callback) ->
          UserModel.findById game.owner, (err, user) ->
            if err then callback err, game
            else
              game.owner = user
              callback null, game
        async.map games, addOwner, (err, games) ->
          if err then base.get.error req, res, err
          else res.render 'edit/list', games: games

  app.get '/edit/:id', (req, res) ->
    gameId = req.params.id
    GameModel.findById gameId, (err, game) ->
      if err then base.get.error req, res, err
      else res.render 'edit/edit', game: game

  app.put '/edit/:id', (req, res) ->
    GameModel.update req.param('id'), req.body, (err) ->
      if err then base.ajax.error req, res, err
      else res.end('OK')

  app.post '/edit', (req, res) ->
    GameModel.create req.session.user, (err, game) ->
      if err then base.get.error req, res, err
      else
        res.redirect "/edit/#{game.id}"

  app.get '/edit/boards/:gameId', (req, res) ->
    GameModel.findById req.params.gameId, (err, game) ->
      if err then res.json 'Game not found'
      else res.json game.boards_serialized

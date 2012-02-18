define ['mongoose', 'cs!assets/js/serializer', 'cs!models/user', 'cs!assets/utils'], (M, Serializer, UserModel, utils, async) ->
  ObjectId = M.Schema.ObjectId

  Schema = new M.Schema
    name:
      type: String
      required: true
    owner:
      type: ObjectId
      required: true
    boards:
      type: String
      default: ''
    description: String
  Model = M.model 'Model', Schema

  class Interface
    constructor: (model) ->
      @id = model._id
      @name = model.name
      @boards = Serializer.unserialize model.boards
      @boards_serialized = model.boards
      @description = model.description
      @owner = model.owner

  return {
    create: (user, callback) ->
      game = new Model
      game.name = "#{user.name}s new game"
      game.owner = user.id
      game.save()
      callback null, game

    findAll: (callback) ->
      Model.find {}, (err, games) ->
        if err then callback err, games
        else callback err, (new Interface(game) for game in games)

    findById: (id, callback) ->
      Model.findById id, (err, game) ->
        if err then callback err, game
        else callback null, new Interface(game)

    update: (id, data, callback) ->
      Model.findById id, (err, game) ->
        if err then callback err, game
        else if game is null then callback 'Game not found', null
        else
          game[key] = val for key, val of data when key != '_id'
          game.save callback
  }

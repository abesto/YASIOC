define ['mongoose', 'mootools'], (mongoose) ->
  colors = ['Red', 'Blue', 'Yellow', 'Green'];

  Schema = {};
  Schema.Color = { type: String, 'enum': colors };
  Schema.Piece = new mongoose.Schema
    row: Number
    column: Number
    color: Schema.Color

  Schema.Player = new mongoose.Schema
      color: Schema.Color
      id: String

  Schema.Game = new mongoose.Schema
    players: [Schema.Player]
    pieces: [Schema.Piece]
    started: {type: Boolean, 'default': false}
    next: String
    dice: {type: Number, 'default': null}

  Schema.Game.method 'playerColor', (userId) ->
    for player in @players
      if player.id == userId then return players.color
    return null

  Schema.Game.method 'colorPlayer', (color) ->
    for player in @players
      if player.color == color then return player.id
    return null

  Model = {};
  Model.Piece = mongoose.model 'LudoPiece', Schema.Piece
  Model.Player = mongoose.model 'LudoPlayer', Schema.Player
  Model.Game = mongoose.model 'LudoGame', Schema.Game

  pathParts =
    Red:
      initial: [[-1,-1]]
      front: [[0,6], [1,6], [2,6], [3,6], [4,6]]
      back: [[3,4], [2,4], [1,4], [0,4], [0,5]]
      final: [[1,5], [2,5], [3,5], [4,5], [5,5]]
    Blue:
      initial: [[-1,-1]]
      front: [[6,10], [6,9], [6,8], [6,7], [6,6]]
      back: [[4,7], [4,8], [4,9], [4,10], [5,10]]
      final: [[5,9], [5,8], [5,7], [5,6], [5,5]]
    Yellow:
      initial: [[-1,-1]]
      front: [[10,4], [9,4], [8,4], [7,4], [6,4]]
      back: [[7,6], [8,6], [9,6], [10,6], [10,5]]
      final: [[9,5], [8,5], [7,5], [6,5], [5,5]]
    Green:
      initial: [[-1,-1]]
      front: [[4,0], [4,1], [4,2], [4,3], [4,4]]
      back: [[6,3], [6,2], [6,1], [6,0], [5,0]]
      final: [[5,1], [5,2], [5,3], [5,4], [5,5]]

  # Abstracts away the position of a piece on the game board
  # Used for pre-generating the paths
  class Position
    constructor: (@pieceColor) ->
      @reset()

    setRowCol: (row, column) ->
      if row == -1 && column == -1
        return @reset();

      for color, colorPaths of pathParts
        for leg, path of colorPaths
          for index, position of path
            if position[0] == row && position[1] == column
              @row = row;
              @column = column;
              @pathColor = color;
              @leg = leg;
              return @index = index.toInt();

      throw Error('Unable to find position for row ' + row + ', column ' + column)

    # @api private
    setPathInfo: (color, leg, index) ->
      @pathColor = color;
      @leg = leg;
      @index = index;
      var pair = pathParts[@pathColor][@leg][@index];
      @row = pair[0]
      @column = pair[1]

    # Set to the initial position (before entering the playing field)
    # @api public
    reset: ->
      @leg = 'initial'
      @pathColor = @pieceColor
      @index = 0
      @row = -1
      @column = -1

    # @api private
    nextLeg: (from) ->
      ret = {color: from.color, leg: from.leg};
      if ret.leg == 'initial'
        ret.color = @pieceColor
        ret.leg = 'front'
      else if ret.leg == 'front'
        ret.color = colors[ (colors.indexOf(from.color)+1) % 4 ]
        ret.leg = 'back'
      else if ret.leg == 'back'
        if @pieceColor == from.color then ret.leg = 'final'
        else ret.leg = 'front'
      else
        throw Error('No leg after final')
      return ret

    # @api public
    movesLeft: (max) ->
      leg = {color: @pathColor, leg: @leg}
      num = pathParts[leg.color][leg.leg].length - @index - 1;
      while leg.leg != 'final' && (!max || num < max)
        leg = @nextLeg(leg)
        num += pathParts[leg.color][leg.leg].length
      return num

    # @api public
    step: ->
      # Move from initial (outside playing field) to starting position
      if @leg == 'initial'
        @setPathInfo @pieceColor, 'front', 0

      # Move within a leg
      else if @index + 1 < pathParts[@pathColor][@leg].length
        @index++;

      # Move to next leg
      else
        leg = @nextLeg color: @pathColor, leg: @leg
        @index = 0;
        @pathColor = leg.color;
        @leg = leg.leg

      # Update row, column
      @row = pathParts[@pathColor][@leg][@index][0]
      @column = pathParts[@pathColor][@leg][@index][1]

    @fromData = (color, row, column) ->
      p = new Position
      p.pieceColor = color
      p.setRowCol(row, column)
      return p

  # Build full paths using Position class
  paths = Red: [], Blue: [], Yellow: [], Green: []
  for color, colorPaths of pathParts
    pos = Position.fromData(color, -1, -1);
    while pos.movesLeft(1) > 0
      paths[color].push [pos.row, pos.column]
      pos.step()

  class SimplePosition
    constructor: (color, row, column) ->
      @path = paths[color]
      @index = 0
      while @index < @path.length && (@path[@index][0] != row || @path[@index][1] != column)
        @index+
      @__defineGetter__ 'row', -> @path[@index][0]
      @__defineGetter__ 'column', -> @path[@index][1]

    reset: -> @index = 0
    movesLeft: -> @path.length - @index - 1
    step: ->
      if @movesLeft() == 0
        throw Error('Don\'t know where to go')
      @index++;
    stepBack: ->
      if  @index == 1
        throw Error('Don\'t know where to go')
      @index--

  class RulesRunData
    constructor: (@game, @piece, @position) ->
      @done = false
      @updatedPieces = []

    step: ->
      if !@done
        @position.step()
        @updated @piece

    stepBack: ->
      if !@done
        @stepBack()
        @updated @piece

    updated: (piece) -> if !@updatedPieces.contains(piece) @updatedPieces.push(piece)

  Rules =
     # Run a series of "rules" on a piece
     # @param rules
     # @param game Model.Game
     # @param piece Model.Piece
     # @param position SimplePosition
     #
     # @return [SimplePosition]|Error
    run: (rules, game, piece, position) ->
      data = new RulesRunData game, piece, position

      i = 0
      while i < rules.length && data.name != 'Error'
        data = rules[i++](data)

      if data.name == 'Error' then return data

      if piece
        piece.row = data.position.row
        piece.column = data.position.column

      return data.updatedPieces

    isValid: (rules, game, piece, position) ->
      ret = Rules.run rules, Object.clone(game), Object.clone(piece), Object.clone(position)
      return ret.name != 'Error'

    started: (data) ->
      if !data.game.started then return Error('NOT_STARTED')
      return data

    # Can only move the players own piece
    ownPiece: (userId) -> (data) ->
      color = data.game.playerColor(userId)
      if color == null then return Error('NOT_IN_GAME')
      if color != data.piece.color then return Error('NOT_YOUR_PIECE')
      return data;

    ownTurn: (userId) -> (data) ->
      player = data.game.playerColor userId
      if color == null then return Error('NOT_IN_GAME')
      if userId != data.game.next then return Error('NOT_YOUR_TURN')
      return data;

    # Can only start a new piece after having thrown one of the numbers specified
    startOn: (numbers) ->
      if typeOf numbers  != "Array" then numbers = [numbers]
      return (data) ->
        if data.position.row == -1
          if !numbers.contains data.game.dice.toInt() then return Error('START_ON:'+numbers.join(','))
          else
            data.step()
            data.done = true
            return data
        else
          return data

    # If allow, then steps past the end of the board will be stepped backwards. If not, such moves are illegal.
    overstepping: (allow) ->
      if allow then (data) ->
        limit = Math.min data.game.dice, data.position.movesLeft()
        data.step() for i in [0...limit]
        data.stepBack() for j in [i..data.game.dice]
        return data
      else (data) ->
        if data.position.movesLeft() < data.game.dice
          return Error('NO_OVERSTEPPING')
        data.step() for i in [0..data.game.dice]
        return data

    # Take the 'first' opposing piece on the field the piece moves onto
    takeOnSameField: (data) ->
      for piece in data.game.pieces
        if data.piece.color != piece.color && piece.row == data.position.row && piece.column == data.position.column
          piece.row = -1
          piece.column = -1
          data.updated(piece)
          break
      return data;

    # Only one piece of a color on a single field
    noDoubling: (data) ->
      for piece in data.game.pieces
        if data.piece._id != piece._id && piece.row == data.position.row && piece.column == data.position.column
          return Error('FIELD_NOT_EMPTY')
      return data

    nextPlayerIf: ->
      andConditions = Array.slice(arguments)
      return (data) ->
        # If any of the conditions fail, do nothing
        for condiction in andConditions
          if !condition(data) then return data

        # All conditions passed, next player is up
        colorIndex = colors.indexOf( data.game.playerColor(data.game.next) )
        data.game.next = null
        while data.game.next == null
          nextColor = colors[ (++colorIndex) % colors.length ]
          data.game.next = data.game.colorPlayer(nextColor)
        return data

    diceNotYetRolled: (data) ->
      if data.game.dice != null then return Error('ALREADY_ROLLED')
      return data

    rollDice: (max) -> (data) ->
        data.game.dice = Math.ceil(Math.random() * max)
        return data

    againOn: (numbers) ->
      if typeOf(numbers) != 'Array' then numbers = [numbers]
      return (data) ->
        if !data.game.dice then data.game.again = false
        else data.game.again = numbers.contains data.game.dice.toInt()
        data.game.dice = null
        return data

  Rules.nextPlayer = Rules.nextPlayerIf()

  Rules.nextPlayerIf.notSamePlayerAgain = (data) -> !data.game.again
  Rules.nextPlayerIf.noValidMoves = (rules) -> data

  class LudoInterface
    constructor: (@model) ->
    getId: -> @model.id
    getState: @model

    rollDice: (userId) ->
      rules = [
        Rules.started,
        Rules.ownTurn(userId),
        Rules.diceNotYetRolled,
        Rules.rollDice(6)
      ];

      result = Rules.run rules, @model, null, null

      if result.name == 'Error' then return result
      @model.save()
      return @model.dice.toInt()

    join: (userId, color) ->
      if @model.started then return Error('GAME_STARTED')

      for player in @model.players
        if player.id == userId then return Error('ALREADY_JOINED')
        if player.color == color then return Error('COLOR_TAKEN')

      player = new Model.Player
      player.id = userId
      player.color = color

      ret = [];

      for i in [0...4]
        var piece = new Model.Piece()
        piece.color = color
        piece.row = -1
        piece.column = -1
        @model.pieces.push piece
        ret.push piece

      @model.players.push player

      @model.save()
      return ret

    leave: (userId) ->
      color = @model.playerColor userId
      if color == null then return Error('NOT_IN_GAME')

      ret = []
      for piece in @model.pieces when piece.color == color
        ret.push piece._id
        piece.remove()

      @model.save()
      return ret

    start: ->
      if @model.started then return Error('GAME_STARTED')
      if @model.players.length < 1 then return Error('NO_PLAYERS')
      @model.started = true
      @model.next = @model.players[ Math.floor(Math.random() * @model.players.length) ].id
      @model.save()

    skip: (userId) ->
      ret = Rules.run [Rules.started, Rules.ownTurn(userId)], @model, null, null
      if ret.name == 'Error' then return ret

      ret = Rules.run [Rules.nextPlayer], @model, null, null
      if ret.name == 'Error' then return ret

      @model.dice = null
      @model.save()
      return ret

    move: (pieceId, userId) ->
      piece = @model.pieces.id pieceId
      pos = new SimplePosition(piece.color, piece.row.toInt(), piece.column.toInt())

      ret = Rules.run([
        Rules.started,
        Rules.ownTurn(userId),
        Rules.ownPiece(userId)
      ], @model, piece, pos);
      if ret.name == 'Error' then return ret;

      rules = [
        Rules.startOn(6),
        Rules.overstepping(false),
        Rules.takeOnSameField,
        Rules.noDoubling,

        Rules.againOn(6),
        Rules.nextPlayerIf( Rules.nextPlayerIf.notSamePlayerAgain )
      ];

      result = Rules.run rules, @model, piece, pos

      if result.name == 'Error' then return result;

      @model.save()
      return result

  return ret =
    # players: {color: id}
    create: callback ->
      model = (new Model.Game).save
      model.save (err, doc) -> callback err, new LudoInterface(doc)

    load: (id, callback) ->
      Model.Game.findById id, (err, doc) ->
        if err then callback err, null
        else if  !doc then callback 'No shit', doc
        else callback null, new LudoInterface(doc)

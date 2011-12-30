define(['mongoose'], function(mongoose) {
  require('mootools');
  var colors = ['Red', 'Blue', 'Yellow', 'Green'];

  var Schema = {};
  Schema.Color = { type: String, 'enum': colors};
  Schema.Piece = new mongoose.Schema({
    row: Number,
    column: Number,
    color: Schema.Color
  });

  Schema.Player = new mongoose.Schema({
      color: Schema.Color,
      id: String
  });

  Schema.Game = new mongoose.Schema({
    players: [Schema.Player],
    pieces: [Schema.Piece],
    next: String,
    dice: Number
  });

  var Model = {};
  Model.Piece = mongoose.model('LudoPiece', Schema.Piece);
  Model.Player = mongoose.model('LudoPlayer', Schema.Player);
  Model.Game = mongoose.model('LudoGame', Schema.Game);

  var pathParts = {
    Red: {
      initial: [[-1,-1]],
      front: [[0,6], [1,6], [2,6], [3,6], [4,6]],
      back: [[3,4], [2,4], [1,4], [0,4], [0,5]],
      'final': [[1,5], [2,5], [3,5], [4,5], [5,5]]
    },
    Blue: {
      initial: [[-1,-1]],
      front: [[6,10], [6,9], [6,8], [6,7], [6,6]],
      back: [[4,7], [4,8], [4,9], [4,10], [5,10]],
      'final': [[5,9], [5,8], [5,7], [5,6], [5,5]]
    },
    Yellow: {
      initial: [[-1,-1]],
      front: [[10,4], [9,4], [8,4], [7,4], [6,4]],
      back: [[7,6], [8,6], [9,6], [10,6], [10,5]],
      'final': [[9,5], [8,5], [7,5], [6,5], [5,5]]
    },
    Green: {
      initial: [[-1,-1]],
      front: [[4,0], [4,1], [4,2], [4,3], [4,4]],
      back: [[6,3], [6,2], [6,1], [6,0], [5,0]],
      'final': [[5,1], [5,2], [5,3], [5,4], [5,5]]
    }};
  /**
   * Abstracts away the position of a piece on the game board
   * Used for pre-generating the paths
   */
  var Position = new Class({
    initialize: function(color) {
      this.pieceColor = color;
      this.reset();
    },

    setRowCol: function(row, column) {
      if (row == -1 && column == -1) {
        this.reset();
        return;
      }

      var color, leg, index, path;
      for (color in pathParts) {
        for (leg in pathParts[color]) {
          path = pathParts[color][leg];
          for (index in path) {
            if (path[index][0] == row && path[index][1] == column) {
              this.row = row;
              this.column = column;
              this.pathColor = color;
              this.leg = leg;
              this.index = index.toInt();
              return;
            }
          }
        }
      }

      throw Error('Unable to find position for row ' + row + ', column ' + column);
    },

    /** @api private */
    setPathInfo: function(color, leg, index) {
      this.pathColor = color;
      this.leg = leg;
      this.index = index;
      var pair = pathParts[this.pathColor][this.leg][this.index];
      this.row = pair[0];
      this.column = pair[1];
    },

    /**
     * Set to the initial position (before entering the playing field)
     * @api public
     */
    reset: function() {
      this.leg = 'initial';
      this.pathColor = this.pieceColor;
      this.index = 0;
      this.row = -1;
      this.column = -1;
    },

    /** @api private */
    nextLeg: function(from) {
      var ret = {color: from.color, leg: from.leg};
      if (ret.leg === 'initial') {
        ret.color = this.pieceColor;
        ret.leg = 'front';
      } else if (ret.leg === 'front') {
        ret.color = colors[ (colors.indexOf(from.color)+1) % 4 ];
        ret.leg = 'back';
      } else if (ret.leg === 'back') {
        if (this.pieceColor === from.color) {
          ret.leg = 'final';
        } else {
          ret.leg = 'front';
        }
      } else {
        throw Error('No leg after final');
      }

      return ret;
    },

    /** @api public */
    movesLeft: function(max) {
      var leg = {color: this.pathColor, leg: this.leg}, num = pathParts[leg.color][leg.leg].length - this.index - 1;
      while (leg.leg !== 'final' && (!max || num < max)) {
        leg = this.nextLeg(leg);
        num += pathParts[leg.color][leg.leg].length;
      }
      return num;
    },

    /** @api public */
    step: function() {
      // Move from initial (outside playing field) to starting position
      if (this.leg === 'initial') {
        this.setPathInfo(this.pieceColor, 'front', 0);

        // Move within a leg
      } else if (this.index + 1 < pathParts[this.pathColor][this.leg].length) {
        this.index++;

        // Move to next leg
      } else {
        var leg = this.nextLeg({color: this.pathColor, leg: this.leg});
        this.index = 0;
        this.pathColor = leg.color;
        this.leg = leg.leg;
      }

      // Update row, column
      this.row = pathParts[this.pathColor][this.leg][this.index][0];
      this.column = pathParts[this.pathColor][this.leg][this.index][1];
    }
  });

  Position.fromData = function(color, row, column) {
    var p = new Position();
    p.pieceColor = color;
    p.setRowCol(row, column);
    return p;
  };

  var paths = {Red: [], Blue: [], Yellow: [], Green: []};
  for (var color in pathParts) {
    var pos = Position.fromData(color, -1, -1);
    while (pos.movesLeft(1) > 0) {
      paths[color].push([pos.row, pos.column]);
      pos.step();
    }
  }

  var SimplePosition = new Class({
    initialize: function(color, row, column) {
      this.path = paths[color];
      this.index = 0;
      while (this.index < this.path.length && (this.path[this.index][0] != row || this.path[this.index][1] != column))
        this.index++;

      this.__defineGetter__('row', function() { return this.path[this.index][0]; });
      this.__defineGetter__('column', function() { return this.path[this.index][1]; });
    },

    reset: function() { this.index = 0; },
    movesLeft: function() {
      return (this.path.length - this.index - 1);
    },
    step: function() {
      if (this.movesLeft() == 0) {
        throw Error('Don\'t know where to go');
      }
      this.index++;
      console.log('SimplePosition#step: ', this.path[this.index]);
    },
    stepBack: function() {
      if (this.index == 1) {
        throw Error('Don\'t know where to go');
      }
      this.index--;
    }
  });

  var RulesRunData = new Class({
    initialize: function(game, piece, position) {
      this.game = game;
      this.piece = piece;
      this.position = position;
      this.done = false;
      this.updatedPieces = [];
    },

    step: function() {
      if (!this.done) {
        this.position.step();
        this.updated(this.piece);
      }
      console.log('RulesRunData#step piece: ', [this.piece.row, this.piece.column]);
    },

    stepBack: function() {
      if (!this.done) {
        this.position.stepBack();
        this.updated(this.piece);
      }
    },

    updated: function(piece) {
      if (!this.updatedPieces.contains(piece)) this.updatedPieces.push(piece);
    }
  });

  var Rules = {
    /**
     * Run a series of "rules" on a piece
     * @param rules
     * @param game Model.Game
     * @param piece Model.Piece
     * @param position SimplePosition
     *
     * @return [SimplePosition]|Error
     */
    run: function(rules, game, piece, position) {
      var data = new RulesRunData(game, piece, position);

      for (var i = 0;
           i < rules.length && data.name != 'Error';
           i++)
      {
        data = rules[i](data);
      }

      if (data.name === 'Error') return data;

      piece.row = data.position.row;
      piece.column = data.position.column;

      return data.updatedPieces;
    },

    startOn: function(numbers) {
      if (typeOf(numbers) !== "Array") numbers = [numbers];
      return function(data) {
        if (data.position.leg == 'initial') {
          if (!numbers.contains(data.game.dice.toInt())) {
            return Error('START_ON:'+numbers.join(','));
          } else {
            data.step();
            data.done = true;
            return data;
          }
        } else {
          return data;
        }
      }
    },

    overstepping: function(allow) {
      if (allow) {
        return function(data) {
          var i, limit = Math.min(data.game.dice, data.position.movesLeft());
          for (i = 0; i < limit; i++) {
            data.step();
            console.log('step');
          }
          while (i < data.game.dice) {
            console.log('back');
            data.stepBack();
            i++;
          }
          return data;
        };
      } else {
        return function(data)
        {
          if (data.position.movesLeft() < data.game.dice)
            return Error('NO_OVERSTEPPING');
          for (var i = 0; i < data.game.dice; i++) {
            data.step();
          }
          return data;
        };
      }

    },

    takeOnSameField: function(data) {
      for (var i in data.game.pieces) {
        var piece = data.game.pieces[i];
        if (data.piece.color != piece.color && piece.row == data.position.row && piece.column == data.position.column) {
          piece.row = -1;
          piece.column = -1;
          data.updated(piece);
          break;
        }
      }
      return data;
    },

    noDoubling: function(data) {
      for (var i in data.game.pieces) {
        var piece = data.game.pieces[i];
        if (data.piece._id != piece._id && piece.row == data.position.row && piece.column == data.position.column)
          return Error('FIELD_NOT_EMPTY');
      }
      return data;
    }
  };

  var LudoInterface = new Class({
    initialize: function(model) {
      this.model = model;
    },

    getId: function() {
      return this.model._id;
    },

    getState: function() {
      return this.model;
    },

    rollDice: function() {
      this.model.dice = Math.ceil(Math.random() * 6);
      this.model.save();
      return this.model.dice;
    },

    move: function(pieceId) {
      var piece = this.model.pieces.id(pieceId);
      var pos = new SimplePosition(piece.color, piece.row.toInt(), piece.column.toInt());

      var rules = [
        Rules.startOn(6),
        Rules.overstepping(true),
        //Rules.noTakeOnStartingPosition,
        Rules.takeOnSameField,
        Rules.noDoubling,
      ];

      var result = Rules.run(rules, this.model, piece, pos);

      if (result.name === 'Error') return result;

      this.model.save();
      return result;
    }
  });

  return {
    /* players: {color: id} */
    create: function(players, callback) {
      var model = new Model.Game();
      Object.each(players, function(id, color) {
        var player = new Model.Player(), i, piece;
        player.color = color;
        player.id = id;
        model.players.push(player);
        for (i = 0; i < 4; i++) {
          piece = new Model.Piece();
          piece.color = color;
          piece.row = -1;
          piece.column = -1;
          model.pieces.push(piece);
        }
      });
      model.save(function(err, doc) {
        callback(err, new LudoInterface(doc));
      });
    },

    load: function(id, callback) {
      Model.Game.findById(id, function(err, doc) {
        if (err) {
          callback(err, null);
        } else if (!doc) {
          callback('No shit', doc);
        } else {
          callback(null, new LudoInterface(doc));
        }
      });
    }
  }
});
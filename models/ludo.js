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

  var paths = {
    Red: {
      front: [[0,6], [1,6], [2,6], [3,6], [4,6]],
      back: [[3,4], [2,4], [1,4], [0,4], [0,5]],
      'final': [[1,5], [2,5], [3,5], [4,5], [5,5]]
    },
    Blue: {
      front: [[6,10], [6,9], [6,8], [6,7], [6,6]],
      back: [[4,7], [4,8], [4,9], [4,10], [5,10]],
      'final': [[5,9], [5,8], [5,7], [5,6], [5,5]]
    },
    Yellow: {
      front: [[10,4], [9,4], [8,4], [7,4], [6,4]],
      back: [[7,6], [8,6], [9,6], [10,6], [10,5]],
      'final': [[9,5], [8,5], [7,5], [6,5], [5,5]]
    },
    Green: {
      front: [[4,0], [4,1], [4,2], [4,3], [4,4]],
      back: [[6,3], [6,2], [6,1], [6,0], [5,0]],
      'final': [[5,1], [5,2], [5,3], [5,4], [5,5]]
    }};

  /**
   * Abstracts away the position of a piece on the game board
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
      for (color in paths) {
        for (leg in paths[color]) {
          path = paths[color][leg];
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
      var pair = paths[this.pathColor][this.leg][this.index];
      this.row = pair[0];
      this.column = pair[1];
    },

    /**
     * Set to the initial position (before entering the playing field)
     * @api public
     */
    reset: function() {
      this.pathColor = 'initial';
      this.leg = 'initial';
      this.index = 'initial';
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
      var leg = {color: this.pathColor, leg: this.leg}, num = paths[leg.color][leg.leg].length - this.index - 1;
      while (leg.leg !== 'final' && (!max || num < max)) {
        leg = this.nextLeg(leg);
        num += paths[leg.color][leg.leg].length;
      }
      return num;
    },

    /** @api public */
    step: function() {
      // Move from initial (outside playing field) to starting position
      if (this.leg === 'initial') {
        this.setPathInfo(this.pieceColor, 'front', 0);

      // Move within a leg
      } else if (this.index + 1 < paths[this.pathColor][this.leg].length) {
        this.index++;

      // Move to next leg
      } else {
        var leg = this.nextLeg({color: this.pathColor, leg: this.leg});
        this.index = 0;
        this.pathColor = leg.color;
        this.leg = leg.leg;
      }

      // Update row, column
      this.row = paths[this.pathColor][this.leg][this.index][0];
      this.column = paths[this.pathColor][this.leg][this.index][1];
    }
  });

  Position.fromPair = function(color, row, column) {
    var p = new Position();
    p.pieceColor = color;
    p.setRowCol(row, column);
    return p;
  };

  var RulesRunData = new Class({
    initialize: function(game, piece, position) {
      this.game = game;
      this.piece = piece;
      this.position = position;
      this.done = false;
    },

    step: function() {
      if (!this.done) this.position.step();
    }
  });

  var Rules = {
    /**
     * Run a series of "rules" on a piece
     * @param rules
     * @param game Model.Game
     * @param piece Model.Piece
     * @param position Position
     *
     * @return Position|Error
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
      return data.position;
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

    noOverstepping: function(data) {
      if (data.position.movesLeft(data.game.dice) < data.game.dice)
        return Error('NO_OVERSTEPPING');
      return data;
    },

    stepNoDivision: function(data) {
      for (var i = 0; i < data.game.dice; i++) {
        data.step();
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
      var pos = Position.fromPair(piece.color, piece.row.toInt(), piece.column.toInt());

      var rules = [
        Rules.startOn(6),
        Rules.noOverstepping,
        Rules.stepNoDivision,
        Rules.noDoubling
      ];

      var result = Rules.run(rules, this.model, piece, pos);

      if (result.name === 'Error') return result;

      piece.row = result.row;
      piece.column = result.column;
      this.model.save();
      return piece;
    }
  });

  return {
    /* players: {id: color} */
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
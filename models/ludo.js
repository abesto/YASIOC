define(['mongoose'], function(mongoose) {
  require('mootools');
  var Piece, Player, Game,
    PieceModel, PlayerModel, GameModel,
    LudoInterface,
    colors = ['Red', 'Blue', 'Yellow', 'Green'],
    Color = { type: String, enum: colors},
    paths = {
      Red: {
        front: [[0,6], [1,6], [2,6], [3,6], [4,6]],
        back: [[3,4], [2,4], [1,4], [0,4], [0,5]],
        final: [[1,5], [2,5], [3,5], [4,5], [5,5]]
      },
      Blue: {
        front: [[6,10], [6,9], [6,8], [6,7], [6,6]],
        back: [[4,7], [4,8], [4,9], [4,10], [5,10]],
        final: [[5,9], [5,8], [5,7], [5,6], [5,5]]
      },
      Yellow: {
        front: [[10,4], [9,4], [8,4], [7,4], [6,4]],
        back: [[7,6], [8,6], [9,6], [10,6], [10,5]],
        final: [[9,5], [8,5], [7,5], [6,5], [5,5]]
      },
      Green: {
        front: [[4,0], [4,1], [4,2], [4,3], [4,4]],
        back: [[6,3], [6,2], [6,1], [6,0], [5,0]],
        final: [[5,1], [5,2], [5,3], [5,4], [5,5]]
      }
    };

  Piece = new mongoose.Schema({
    row: Number,
    column: Number,
    color: Color
  });
  PieceModel = mongoose.model('LudoPiece', Piece);

  Player = new mongoose.Schema({
    color: Color,
    id: String
  });
  PlayerModel = mongoose.model('LudoPlayer', Player);

  Game = new mongoose.Schema({
    players: [Player],
    pieces: [Piece],
    next: String,
    dice: Number
  });
  GameModel = mongoose.model('LudoGame', Game);


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
            if (path[index][0] === row && path[index][1] === column) {
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

      throw 'Unable to find position for row ' + row + ', column ' + column;
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

  Position.initial = function(color) {
    return Position.fromPair(color, [-1,-1]);
  };

  //noinspection JSUnusedAssignment
  LudoInterface = new Class({
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
      var piece = this.model.pieces.id(pieceId),
        pos = Position.fromPair(piece.color, piece.row.toInt(), piece.column.toInt()),
        i;

      // Start on 6
      if (pos.row == -1 && pos.column == -1) {
        if (this.model.dice == 6) {
          pos.step();
        } else {
          pos = null;
        }
      } else {
        // Else try to step according to rules, this.model.dice steps
        if (pos.movesLeft(this.model.dice) >= this.model.dice) {
          for (i = 0; i < this.model.dice; i++) {
            pos.step();
          }
        } else {
          pos = null;
        }
      }

      if (pos === null) return null;

      // Check that the field is empty
      for (i in this.model.pieces) {
        if (this.model.pieces[i]._id != pieceId && this.model.pieces[i].row == pos.row && this.model.pieces[i].column == pos.column)
          return null;
      }

      // Move is valid
      piece.row = pos.row;
      piece.column = pos.column;
      this.model.save();
      return piece;
    }
  });

  return {
    /* players: {id: color} */
    create: function(players, callback) {
      var model = new GameModel();
      Object.each(players, function(id, color) {
        var player = new PlayerModel(), i, piece;
        player.color = color;
        player.id = id;
        model.players.push(player);
        for (i = 0; i < 4; i++) {
          piece = new PieceModel();
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
      GameModel.findById(id, function(err, doc) {
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
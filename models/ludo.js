define(['mongoose'], function(mongoose) {
  require('mootools');
  var Piece, Player, Game,
    PieceModel, PlayerModel, GameModel,
    LudoInterface,
    Color = { type: String, enum: ['Red', 'Blue', 'Yellow', 'Green'] },
    startingPositions = {
      Red: [0,6],
      Blue: [6,10],
      Yellow: [10, 4],
      Green: [4, 0]
    },
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

  function pathInfo(row, column) {
    var pathColor, pathLeg, path, pathIndex;
    for (pathColor in paths) {
      for (pathLeg in paths[pathColor]) {
        path = paths[pathColor][pathLeg];
        for (pathIndex in path) {
          if (path[pathIndex][0] == row && path[pathIndex][1] == column) {
            return {
              color: pathColor,
              leg: pathLeg,
              index: pathIndex
            };
          }
        }
      }
    }
    return null;
  }

  function next(path, color) {
    if (path === null) return null;

    if (path.index.toInt() + 1 < paths[path.color][path.leg].length) {
      path.index++;
    } else if (path.leg === 'front') {
      path.index = 0;
      path.color = Color.enum[ (Color.enum.indexOf(path.color)+1) % 4 ];
      path.leg = 'back';
    } else if (path.leg === 'back') {
      path.index = 0;
      if (color === path.color) {
        path.leg = 'final';
      } else {
        path.leg = 'front';
      }
    } else {
      return null;
    }

    return path;
  }

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
        current = pathInfo(piece.row, piece.column),
        to = current,
        i;

      // Start on 6
      if (piece.row == -1 && piece.column == -1) {
        if (this.model.dice == 6) {
          to = startingPositions[piece.color];
        } else {
          to = null;
        }
      } else {
        // Else try to step according to rules, this.model.dice steps
        for (i = 0; i < this.model.dice; i++) {
          to = next(to, piece.color);
        }
        if (to !== null) {
          to = paths[to.color][to.leg][to.index];
        }
      }

      if (to === null) return null;

      // Check that the field is empty
      for (i in this.model.pieces) {
        if (this.model.pieces[i].row == to[0] && this.model.pieces[i].column == to[1])
          return null;
      }

      // Move is valid
      piece.row = to[0];
      piece.column = to[1];
      this.model.save();

      return piece;
    }
  });

  return {
    /* players: {id: color} */
    create: function(players, callback) {
      var model = new GameModel();
      Object.each(players, function(color, id) {
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
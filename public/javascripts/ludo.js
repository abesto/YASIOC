define(['Board', '/socket.io/socket.io.js'], function(Board) {
  var
    startingPositions = {
      Red: [[0,7], [0,8], [1,7], [1,8]],
      Green: [[3,0], [2,0], [3,1], [2,1]]
    },
    id = '4efde38c893adb307c00000e';

  var LudoBoard = new Class({
    Extends: Board,

    initialize: function() {
      Board.prototype.initialize.apply(this, arguments);

      this.inStartingPosition = {
        Red: [],
        Green: [],
        Yellow: [],
        Blue: []
      };
    },

    putPiece: function(piece, row, column) {
      if (piece.row === -1 && piece.column === -1) {
        var position = startingPositions[piece.color][this.inStartingPosition[piece.color].length];
        this.inStartingPosition[piece.color].push(piece._id);
        row = position[0];
        column = position[1];
      } else {
        var index = this.inStartingPosition[piece.color].indexOf(piece._id);
        if (index !== -1) {
          this.inStartingPosition[piece.color].splice(index, 1);
        }
      }
      Board.prototype.putPiece.call(this, piece, row, column);
    },

    render: function() {
      Board.prototype.render.apply(this, arguments);

      this.range(5, 1, 5, 4).addClass('Green');
      this.range(1, 5, 4, 5).addClass('Red');
      this.range(5, 6, 5, 9).addClass('Blue');
      this.range(6, 5, 9, 5).addClass('Yellow');

      this.range(4,0,6,10).addClass('field');
      this.range(0,4,10,6).addClass('field');

      this.range(4, 0).addClass('Green-start');
      this.range(0, 6).addClass('Red-start');
      this.range(6, 10).addClass('Blue-start');
      this.range(10, 4).addClass('Yellow-start');
    }
  });

  $(document).addEvent('domready', function() {
    var board = window.board = new LudoBoard(11, 11), socket, ui;
    ui = {
      main: $$('.ludo')[0]
    };
    ui.roll = ui.main.getElements('.roll-dice')[0];
    ui.dice = ui.main.getElements('.dice')[0];
    ui.game_id = ui.main.getElements('.game-id')[0];

    board.render(ui.main);

    socket = io.connect('/ludo');
    socket.on('gamestate', function(data) {
      window.model = data;
      ui.game_id.set('text', data._id);
      ui.dice.set('text', data.dice);
      var row, column, position;
      data.pieces.each(function(piece) {
        board.putPiece(piece, row, column);
      });

      ui.roll.addEvent('click', function() {
        socket.emit('roll-dice', {id: id});
      });

      board.addEvent('piece-click', function(piece) {
        socket.emit('move', {id: id, piece: piece._id});
      });
    });


    socket.on('error', function(data) { console.log(data); });
    socket.on('created', function(data) { socket.emit('join', {id: data.id}); });
    socket.on('dice-roll', function(data) {
      ui.dice.set('text', data.value);
    });
    socket.on('move', function(data) {
      board.putPiece(data.piece);
    });
    socket.emit('join', {"id":id});
  });
});
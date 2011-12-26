define(['Board', '/socket.io/socket.io.js'], function(Board) {
  var
    startingPositions = {
      Red: [[0,7], [0,8], [1,7], [1,8]],
      Green: [[3,0], [2,0], [3,1], [2,1]]
    },
    id = '4ef8b872f326df037a000003';

  $(document).addEvent('domready', function() {
    var board = window.board = new Board(11, 11), socket, ui;
    ui = {
      main: $$('.ludo')[0]
    };
    ui.roll = ui.main.getElements('.roll-dice')[0];
    ui.dice = ui.main.getElements('.dice')[0];
    ui.game_id = ui.main.getElements('.game-id')[0];

    board.render(ui.main);
    board.range(5, 0, 5, 4).addClass('Green');
    board.range(0, 5, 4, 5).addClass('Red');
    board.range(5, 6, 5, 10).addClass('Blue');
    board.range(6, 5, 10, 5).addClass('Yellow');

    board.range(4,0,6,10).addClass('field');
    board.range(0,4,10,6).addClass('field');

    board.range(4, 0).addClass('Green-start');
    board.range(0, 6).addClass('Red-start');
    board.range(6, 10).addClass('Blue-start');
    board.range(10, 4).addClass('Yellow-start');


    socket = io.connect('/ludo');
    socket.on('gamestate', function(data) {
      window.model = data;
      ui.game_id.set('text', data._id);
      ui.dice.set('text', data.dice);
      var row, column, position, inStartingPosition = {
        Red: 0,
        Green: 0,
        Yellow: 0,
        Blue: 0
      };
      data.pieces.each(function(piece) {
        if (piece.row === -1 && piece.column === -1) {
          position = startingPositions[piece.color][inStartingPosition[piece.color]++];
          row = position[0];
          column = position[1];
          board.putPiece(piece, row, column);
        } else {
          board.putPiece(piece);
        }
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
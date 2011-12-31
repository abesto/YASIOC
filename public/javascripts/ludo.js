define(['Board', '/socket.io/socket.io.js'], function(Board) {
  var socket = io.connect('/ludo');
  var startingPositions = {
    Red: [[0,7], [0,8], [1,7], [1,8]],
    Green: [[3,0], [2,0], [3,1], [2,1]],
    Blue: [[7,10],[8,10],[7,9],[8,9]],
    Yellow: [[10,3],[10,2],[9,3],[9,2]]
  };
  var Game = {};
  var ui;

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

      var board = this;
      this.range(4, 0).addClass('Green-start').addEvent('click', function() {board.fireEvent('start-click', 'Green'); });
      this.range(0, 6).addClass('Red-start').addEvent('click', function() {board.fireEvent('start-click', 'Red'); });
      this.range(6, 10).addClass('Blue-start').addEvent('click', function() {board.fireEvent('start-click', 'Blue'); });
      this.range(10, 4).addClass('Yellow-start').addEvent('click', function() {board.fireEvent('start-click', 'Yellow'); });
    }
  });

  function start(board)
  {
    board.removeEvents('start-click');
    ui.start.removeEvents('click');
    ui.roll.addEvent('click', function() { socket.emit('roll-dice', {id: Game.id}); });
    board.addEvent('piece-click', function(piece) { socket.emit('move', {id: Game.id, piece: piece._id}); });
    socket.on('dice-roll', function(data) { ui.dice.set('text', data.value); });
    ui.start.addClass('hidden');
    ui.dice_container.removeClass('hidden');
    ui.skip.addEvent('click', function() { socket.emit('skip', {id: Game.id}); });
  }

  function join(id)
  {
    var board = new LudoBoard(11, 11);
    ui.game.removeClass('hidden');
    ui.controls.addClass('hidden');
    board.render(ui.game);

    socket.on('start', function() { start(board); });

    socket.on('gamestate', function(data) {
      window.model = data;
      ui.game_id.set('text', data._id);
      ui.dice.set('text', data.dice);
      var row, column;
      data.pieces.each(function(piece) { board.putPiece(piece, row, column); });
      socket.on('move', function(data) { board.putPiece(data.piece); });

      if (data.started) {
        start(board);
      }

      else if (!data.started) {
        board.addEvent('start-click', function(color) { socket.emit('choose-color', {id: Game.id, color: color}); });
        ui.start.addEvent('click', function() { socket.emit('start', {id: Game.id}); });
      }
    });

    socket.on('error', function(data) { console.log(data); });

    Game.id = id;
    socket.emit('join', {id: Game.id});
  }

  $(document).addEvent('domready', function() {
    ui = {
      main: $$('.ludo')[0]
    };
    ui.game = ui.main.getElements('.game')[0];
    ui.dice_container = ui.game.getElements('.dice-container')[0];
    ui.roll = ui.dice_container.getElements('.roll-dice')[0];
    ui.dice = ui.dice_container.getElements('.dice')[0];
    ui.game_id = ui.game.getElements('.game-id')[0];

    ui.controls = ui.main.getElements('.controls')[0];
    ui.create = ui.controls.getElements('.create')[0];
    ui.join_button = ui.controls.getElements('.join-button')[0];
    ui.join_id = ui.controls.getElements('.join-id')[0];
    ui.skip = ui.dice_container.getElements('.skip')[0];

    ui.start = ui.game.getElements('.start')[0];

    ui.create.addEvent('click', function() {
      socket.emit('create', {});
      socket.once('created', function(data) { join(data.id); });
    });

    ui.join_button.addEvent('click', function() {
      join(ui.join_id.get('value'));
    })
  });
});
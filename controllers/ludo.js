define(['models/ludo'], function(Model) {
  var controller = {};

  function withModel(callback) {
    return function (data, session, socket) {
      Model.load(data.id, function(err, model) {
        if (err) {
          this.logger.warn(err);
          socket.emit('error', err);
        } else {
          callback(model, data, session, socket);
        }
      }.bind(controller))
    };
  }

  controller.get = {
    defaultAction: 'index',
    index: function(req, res) {
      res.render('ludo');
    }
  };

  controller.sio = {
    join: withModel(function(model, data, session, socket) {
      socket.emit('gamestate', model.getState());
    }),

    create: function(data, session, socket) {
      Model.create({abesto: 'Green', '42': 'Red'}, function(err, model) {
        if (err) {
          this.logger.warn(err);
          socket.emit('error', err);
        } else {
          socket.emit('created', {id: model.getId()});
        }
      }.bind(this));
    },

    'roll-dice': withModel(function(model, data, session, socket) {
      socket.emit('dice-roll', {value: model.rollDice()});
    }),

    move: withModel(function(model, data, session, socket) {
      var ret = model.move(data.piece);
      if (!ret) socket.emit('invalid-move');
      else socket.emit('move', {piece: ret});
    })
  };

  return controller;
});
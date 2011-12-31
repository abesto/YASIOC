define(['models/ludo', './Client'], function(Model, Client) {
  var controller = {};

  function withModelAndClient(callback) {
    return function (data, session, socket) {
      Model.load(data.id, function(err, model) {
        if (err) {
          this.logger.warn(err);
          socket.emit('error', err);
        } else {
          Client.withClient(function(client, data, session, socket) {
            callback(model, client, data, session, socket);
          })(data, session, socket);
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

  function channel(data) { return ['ludo', data.id];}

  controller.sio = {
    join: withModelAndClient(function(model, client, data, session, socket) {
      client.respond('gamestate', model.getState());
      client.join( channel(data) );
    }),

    'choose-color': withModelAndClient(function(model, client, data, session) {
      var res = model.join(session.user._id, data.color);
      if (res.name === 'Error') client.respond('error', {cause: res.message});
      else res.forEach(function(piece) {
        client.send('move', {piece: piece}, channel(data));
      });
    }),

    start: withModelAndClient(function(model, client, data) {
      var ret = model.start();
      if (ret && ret.name == 'Error') client.respond('error', {cause: ret.message});
      else client.send('start', {}, channel(data));
    }),

    create: function(data, session, socket) {
      Model.create(function(err, model) {
        if (err) {
          this.logger.warn(err);
          socket.emit('error', err);
        } else {
          socket.emit('created', {id: model.getId()});
        }
      }.bind(this));
    },

    'roll-dice': withModelAndClient(function(model, client, data, session, socket) {
      var ret = model.rollDice(session.user._id);
      if (ret && ret.name === 'Error') client.respond('error', {cause: ret.message});
      else  client.send('dice-roll', {value: ret}, channel(data));
    }),

    move: withModelAndClient(function(model, client, data, session, socket) {
      var ret = model.move(data.piece, session.user._id);
      if (ret.name === 'Error') client.respond('invalid-move', {cause: ret.message});
      else {
        ret.forEach(function(piece) {
          client.send('move', {piece: piece}, channel(data));
        });
        client.send('dice-roll', {value: null}, channel(data));
      }
    })
  };

  return controller;
});
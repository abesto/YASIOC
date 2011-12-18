define(function() {
  return {
    get: {
      defaultController: 'index',
      index: function(req, res) { res.render('chat'); }
    },
    sio: {
      login: function(data, session, socket) {
        if (typeof(session.name) == 'undefined') {
          socket.emit('get-name');
        } else {
          socket.broadcast.emit('login', {name: session.name});
          socket.emit('login-valid', {name: session.name});
        }
      },

      register: function(data, session, socket) {
        if (typeof(session.name) == 'undefined') {
          socket.broadcast.emit('new-user', {name: data.name});
          socket.emit('login-valid', {name: data.name});
        } else {
          socket.broadcast.emit('rename', {oldName: session.name, newName: data.name});
        }
        session.name = data.name;
        session.touch().save();
      },

      message: function(data, session, socket) {
        data.name = session.name;
        socket.broadcast.emit('message', data);
      }
    }
  };
});
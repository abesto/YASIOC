define(function() {
  var users = {};

  function addSocket(name, socket)
  {
    if (!users[name]) users[name] = [];
    users[name].push(socket.id);
  }

  function userSockets(name, anotherSocket)
  {
    var ret = [], i, store = anotherSocket.manager.store;
    for (i in users[name]) {
      ret.push(store.clients[users[name][i]]);
    }
    return ret;
  }

  return {
    get: {
      defaultAction: 'index',
      index: function(req, res) { res.render('chat'); }
    },
    sio: {
      initialize: function(data, session, socket) {
        if (!session.name) {
          socket.emit('input-name');
        } else {
          socket.broadcast.emit('announce-login-other', {name: session.name});
          socket.emit('announce-login-you', {name: session.name});
        }
      },

      register: function(data, session, socket) {
        if (users.contains(data.name)) {
          socket.emit('name-taken');
          socket.emit('input-name');
        } else if (!session.name) {
          socket.broadcast.emit('announce-newuser', {name: data.name});
          socket.emit('announce-login-you', {name: data.name});
        } else {
          socket.broadcast.emit('announce-rename-other', {oldName: session.name, newName: data.name});
          socket.emit('announce-rename-you', {oldName: session.name, newName: data.name});
        }
        session.name = data.name;
      },

      message: function(data, session, socket) {
        data.name = session.name;
        socket.broadcast.emit('message', data);
      }
    }
  };
});
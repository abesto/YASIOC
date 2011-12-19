define(function() {
  require('mootools');

  var users = {};

  function addSocket(name, socket)
  {
    if (!users[name]) users[name] = [];
    users[name].push(socket.id);
  }

  function broadcast(sender, type, data, socket)
  {
    var  user, i;
    for (user in users) {
      if (user == sender) continue;
      for (i in users[user]) {
        socket.manager.sockets.socket( users[user][i] ).emit(type, data);
      }
    }
  }

  function emit(user, type, data, socket)
  {
    var i;
    for (i in users[user]) {
      socket.manager.sockets.socket( users[user][i] ).emit(type, data);
    }
  }

  return {
    get: {
      defaultAction: 'index',
      index: function(req, res) { res.render('chat'); }
    },
    sio: {
      initialize: function(data, session, socket) {
        if (!session.name) {
          socket.emit('input-name', {cause: 'register', action: 'register'});
        } else {
          socket.emit('announce', {type: 'login', name: session.name, self: true});
          if (!users[session.name])
            broadcast(session.name, 'announce', {type: 'login', name: session.name, self: false}, socket);
          addSocket(session.name, socket);
        }
      },

      register: function(data, session, socket) {
        if (!data.name || data.name.trim().length === 0) {
          socket.emit('input-name', {cause: 'empty', action: 'register'});
        } else if (users[data.name]) {
          socket.emit('input-name', {cause: 'taken', action: 'register'});
        } else if (session.name) {
          socket.emit('error', {text: 'You\'re already registered'});
        } else {
          broadcast(session.name, 'announce', {type: 'login', name: data.name, self: false}, socket);
          socket.emit('announce', {type: 'login', name: data.name, self: true});
          addSocket(data.name, socket);
          session.name = data.name;
        }
      },

      rename: function(data, session, socket) {
        var from = session.name, to = data.name;
        if (!to) {
          socket.emit('input-name', {cause: 'empty', action: 'rename'});
        } else if (users[to]) {
          socket.emit('input-name', {cause: 'taken', action: 'rename'});
        } else {
          broadcast(from, 'announce', {type: 'rename', from: from, to: to, self: false}, socket);
          emit(from, 'announce', {type: 'rename', from: from, to: to, self: true}, socket);
          session.name = to;
          users.to = users.from;
          delete users.from;
        }
      },

      message: function(data, session, socket) {
        var other = {name: session.name, text: data.text},
            you = {name: 'You', text: data.text};
        broadcast(session.name, 'message', other, socket);
        emit(session.name, 'message', you, socket);
        this.logger.info(session.name + ' said: ' + data.text);
      }
    }
  };
});
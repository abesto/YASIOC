define(function() {
  var ChatClient;

  require('mootools');

  function userChannel(user) { return 'user-' + user; }
  function publicChannel(name) {
    return 'public-' + (typeOf(name) === 'null' ? 'default' : name);
  }

  //noinspection JSUnusedAssignment
  ChatClient = new Class({
    initialize: function(session, socket) {
      this.socket = socket;
      this.session = session;
      this.name = session.name;
    },

    authorized: function(name) {
      if (typeOf(name) === 'string') this.name = name;
      this.session.name = this.name;
      this.socket.join( userChannel(this.name) );
      this.join();
    },

    // Send data to the socket that sent the message we're handling
    respond: function(type, data) {
      this.socket.emit(type, data);
    },

    // Send to all connections of a user. Defaults to this user.
    sendToUser: function(type, data, user) {
      this.socket.namespace['in']( userChannel(typeOf(user) === 'null' ? this.name : user) ).emit(type, data);
    },

    // Send data to a channel, 'public' by default
    sendToChannel: function(type, data, channel) {
      this.socket.namespace['in']( publicChannel(channel) ).emit(type, data);
    },

    // Get a list of usernames on the same server as client
    userList: function() {
      var ret = [], room, prefix='/chat/user-';
      for (room in this.socket.manager.rooms) {
        if (!this.socket.manager.rooms.hasOwnProperty(room)) continue;
        if (room.substring(0,prefix.length) === prefix) ret.push(room.substring(prefix.length));
      }
      return ret;
    },

    join: function(room) {
      return this.socket.join( publicChannel(room) );
    },
    leave: function(room) { return this.socket.leave( publicChannel(room) ); },
    rename: function(to) {
      var from = this.name;
      this.session.name = to;
      this.socket.leave( userChannel(from) );
      this.socket.join( userChannel(to) );
    }
  });

  return {
    get: {
      defaultAction: 'index',
      index: function(req, res) { res.render('chat'); }
    },

    sio: {
      initialize: function(data, session, socket) {
        var client = new ChatClient(session, socket);
        if (!client.name) {
          client.respond('input-name', {cause: 'register', action: 'register'});
        } else {
          client.respond('valid-login', {name: client.name});
          if (!client.userList().contains(client.name)) {
            client.sendToChannel(
              'announce', {type: 'login', name: session.name}
            );
          }

          client.authorized();
        }
      },

      register: function(data, session, socket) {
        var client = new ChatClient(session, socket);
        if (client.name) {
          client.respond('error', {text: 'You\'re already registered'});
        } else if (typeOf(data.name) !== 'string' || data.name.trim().length === 0) {
          client.respond('input-name', {cause: 'empty', action: 'register'});
        } else {
          var name = data.name.trim();
          if (client.userList().contains(name)) {
            client.respond('input-name', {cause: 'taken', action: 'register'});
          } else {
            client.authorized(name);
            socket.once('valid-login-ack', function() {
              client.sendToChannel('announce', {type: 'login', name: client.name});
            });
            client.sendToUser('valid-login', {name: client.name});
          }
        }
      },

      rename: function(data, session, socket) {
        var client = new ChatClient(session, socket);
        if (typeOf(data.name) !== 'string' || data.name.trim().length === 0) {
          client.respond('input-name', {cause: 'empty', action: 'rename'});
        } else {
          var to = data.name.trim();
          if (client.userList().contains(to)) {
            client.respond('input-name', {cause: 'taken', action: 'rename'});
          } else {
            var from = client.name;
            client.sendToUser('valid-login', {name: to});
            socket.once('valid-login-ack', function() {
              client.sendToChannel('announce', {type: 'rename', from: from, to: to});
              client.rename(to);
            });
          }
        }
      },

      message: function(data, session, socket) {
        var client = new ChatClient(session, socket);
        data.from = client.name;
        if (typeOf(data.type) === 'null'|| data.type === 'shout') {
          client.sendToChannel('message', data, data.channel);
        } else if (data.type === 'whisper') {
          client.sendToUser('message', data, data.to);
        } else {
          client.respond('error', {text: 'Unknown message type "' + data.type + '"'});
        }
      },

      disconnect: function(data, session, socket) {
        var client = new ChatClient(session, socket);
        client.sendToChannel('announce', {type: 'logout', name: client.name});
      },

      'get-userlist': function(data, session, socket) {
        var client = new ChatClient(session, socket);
        client.respond('user-list', client.userList());
      }
    }
  };
});
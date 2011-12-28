define(['fs', 'models/user'], function(fs, userModel) {
  var ChatClient;

  require('mootools');

  function userChannel(user) { return 'user-' + user; }
  function publicChannel(name) {
    return 'public-' + (typeOf(name) === 'null' ? 'default' : name);
  }

  function chatlog(type, name, message) {
    var files = {}, filename = 'chatlog/' + type + '-' + name + '.txt', logfile, logtext;

    if (!files[filename]) {
      files[filename] = fs.createWriteStream(filename, {flags: 'a'});
    }
    logfile = files[filename];

    // Announcements
    if (message.type) {
      if (message.type === 'login') {
        logtext = message.name + ' logged in';
      } else if (message.type === 'logout') {
        logtext = message.name + ' left';
      }
    } else {
      // Message
      logtext = message.from + ': ' + message.text;
    }

    logfile.write('[' + (new Date()).toLocaleString() + '] ' + logtext + '\n');
  }

  //noinspection JSUnusedAssignment
  ChatClient = new Class({
    initialize: function(session, socket) {
      this.socket = socket;
      this.session = session;
      this.name = session.user.name;
    },

    joinUserChannel: function() {
      this.socket.join( userChannel(this.name) );
    },

    // Send data to the socket that sent the message we're handling
    respond: function(type, data) {
      if (typeOf(data.time) === 'null') data.time = (new Date()).getTime();
      this.socket.emit(type, data);
    },

    // Send to all connections of a user. Defaults to this user.
    sendToUser: function(type, data, user) {
      if (typeOf(data.time) === 'null') data.time = (new Date()).getTime();
      this.socket.namespace['in']( userChannel(typeOf(user) === 'null' ? this.name : user) ).emit(type, data);
    },

    // Send data to a channel, 'public' by default
    sendToChannel: function(type, data, channel) {
      if (typeOf(data.time) === 'null') data.time = (new Date()).getTime();
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
    leave: function(room) { return this.socket.leave( publicChannel(room) ); }
  });

  function withClient(callback) {
    return function(data, session, socket) {
      var client = new ChatClient(session, socket);
      callback(client, data, session, socket);
    }
  }

  return {
    get: {
      defaultAction: 'index',
      index: function(req, res) {
        res.render('chat');
      }
    },

    sio: {
      initialize: withClient(function(client) {
        client.respond('valid-login', {name: client.name});
        if (!client.userList().contains(client.name)) {
          client.sendToChannel(
            'announce', {type: 'login', name: client.name}
          );
          chatlog('public', 'default', {type: 'login', name: client.name});
        }
        client.join();
        client.joinUserChannel();
      }),

      message: withClient(function(client, data) {
        data.from = client.name;
        if (typeOf(data.type) === 'null'|| data.type === 'shout') {
          client.sendToChannel('message', data, data.channel);
          chatlog('public', 'default', data);
        } else if (data.type === 'whisper') {
          client.sendToUser('message', data, data.to);
        } else {
          client.respond('error', {text: 'Unknown message type "' + data.type + '"'});
        }
      }),

      disconnect: withClient(function(client) {
        client.sendToChannel('announce', {type: 'logout', name: client.name});
        chatlog('public', 'default', {type: 'logout', name: client.name});
      }),

      'get-userlist': withClient(function(client) {
        client.respond('user-list', client.userList());
      })
    }
  };
});
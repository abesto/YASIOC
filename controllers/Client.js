define(['mootools'], function() {
  function channelName(first) {
    var params = [];
    if (typeOf(first) === 'Array') params = first;
    else if (arguments.length > 0) params = Array.slice(arguments);
    params = params.flatten();
    return params.join('-');
  }

  var Client = new Class({
    initialize: function(session, socket) {
      this.socket = socket;
      this.session = session;
      this.name = session.user.name;
    },

    join: function() { this.socket.join( channelName(arguments) ); },
    leave: function() { this.socket.leave( channelName(arguments) ); },

    // Send data to the socket that sent the message we're handling
    respond: function(type, data) {
      if (typeOf(data.time) === 'null') data.time = (new Date()).getTime();
      this.socket.emit(type, data);
    },

    // Send data to a channel, 'public' by default
    send: function(type, data) {
      if (typeOf(data.time) === 'null') data.time = (new Date()).getTime();
      this.socket.namespace['in']( channelName(Array.prototype.slice.call(arguments, 2)) ).emit(type, data);
    },

    // Get a list of usernames on the same server as client
    userList: function(prefix) {
      var ret = [], room;
      for (room in this.socket.manager.rooms) {
        if (!this.socket.manager.rooms.hasOwnProperty(room)) continue;
        if (room.substring(0,prefix.length) === prefix)
          ret.push(room.substring(prefix.length));
      }
      return ret;
    }
  });

  return {
    Client: Client,
    withClient: function withClient(callback) {
      return function(data, session, socket) {
        var client = new Client(session, socket);
        callback(client, data, session, socket);
      }
    }
  };
});

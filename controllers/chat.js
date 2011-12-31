define(['fs', './Client', 'models/user', 'mootools'], function(fs, Client, userModel) {
  var withClient = Client.withClient;

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
        if (!client.userList('/chat/user-').contains(client.name)) {
          client.send('announce', {type: 'login', name: client.name}, 'chat', 'public');
          chatlog('public', 'default', {type: 'login', name: client.name});
        }
        client.join('user', client.name);
        client.join('chat', 'public');
      }),

      message: withClient(function(client, data) {
        data.from = client.name;
        if (typeOf(data.type) === 'null' || data.type === 'shout') {
          client.send('message', data, 'chat', 'public');
          chatlog('public', 'default', data);
        } else if (data.type === 'whisper') {
          client.send('message', data, 'user', data.to);
        } else {
          client.respond('error', {text: 'Unknown message type "' + data.type + '"'});
        }
      }),

      disconnect: withClient(function(client) {
        client.send('announce', {type: 'logout', name: client.name}, 'chat', 'public');
        chatlog('public', 'default', {type: 'logout', name: client.name});
      }),

      'get-userlist': withClient(function(client) {
        client.respond('user-list', client.userList('/chat/user-'));
      })
    }
  };
});
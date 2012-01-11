define ['fs', 'cs!./Client', 'models/user', 'mootools'], (fs, Client, userModel) ->
  withClient = Client.withClient

  chatlog = (type, name, message) ->
    files = {}
    filename = "chatlog/#{type}-#{name}.txt"
    files[filename] ?= fs.createWriteStream filename, flags: 'a'
    logfile = files[filename]

    # Announcements
    if message.type?
      if message.type == 'login' then logtext = message.name + ' logged in'
      else if message.type == 'logout' then logtext = message.name + ' left'
    # Message
    else
      logtext = message.from + ': ' + message.text;

    logfile.write('[' + (new Date()).toLocaleString() + '] ' + logtext + '\n');
  # EOF chatlog

  actions =
    get:
      defaultAction: 'index',
      index: (req, res) -> res.render('chat')

    sio:
      initialize: withClient (client) ->
        client.respond 'valid-login', {name: client.name}
        if !client.userList('/chat/user-').contains(client.name)
          client.send 'announce', {type: 'login', name: client.name}, 'chat', 'public'
          chatlog 'public', 'default', {type: 'login', name: client.name}
        client.join('user', client.name);
        client.join('chat', 'public');

      message: withClient (client, data) ->
        data.from = client.name;
        if typeOf data.type == 'null' || data.type == 'shout'
          client.send 'message', data, 'chat', 'public'
          chatlog 'public', 'default', data
        else if data.type == 'whisper' then client.send 'message', data, 'user', data.to
        else client.respond 'error', {text: 'Unknown message type "' + data.type + '"'}

      disconnect: withClient (client) ->
        client.send 'announce', {type: 'logout', name: client.name}, 'chat', 'public'
        chatlog 'public', 'default', {type: 'logout', name: client.name}

      'get-userlist': withClient (client) -> client.respond 'user-list', client.userList('/chat/user-')


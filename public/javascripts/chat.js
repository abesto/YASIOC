define(['lib/mootools', '/socket.io/socket.io.js'], function() {
  function log(msg)
  {
    $$('#log').grab((new Element('li').appendText(msg)));
  }

  var socket = io.connect('http://localhost');
  socket.on('get-name', function (data) {
    log('Got request to supply username');
    var name = prompt("Welcome! You must be new here. What's your name?");
    socket.emit('register', {name: name});
  });

  socket.on('login', function(data) {
    log(data.name + ' logged in');
  });

  socket.on('login-valid', function(data) {
    log('Logged in as ' + data.name);

    $$('#send').addEvent('click', function() {
      socket.emit('message', {text: $$('#message').get('value')});
      log('You: ' + $$('#message').get('value'));
      $$('#message').set('value', '');
    });
    $$('#change-name').addEvent('click', function() {
      var name = prompt("Choose your new name");
      socket.emit('register', {name: name});
      log('You are now known as ' + name);
    });
  });

  socket.on('message', function(data) {
    log(data.name + ': ' + data.text);
  });

  socket.on('new-user', function(data) {
    log('A new user has chosen the name ' + data.name);
  });

  socket.on('rename', function(data) {
    log(data.oldName + ' is now known as ' + data.newName);
  });

  socket.emit('login');
});
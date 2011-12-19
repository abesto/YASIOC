define(['lib/mootools', '/socket.io/socket.io.js'], function() {
  function log(msg)
  {
    $$('#log').grab((new Element('li').appendText(msg)));
  }

  function inputUsername(text)
  {
    return prompt(text);
  }

  var socket = io.connect('http://localhost');

  function sendMessage()
  {
    socket.emit('message', {text: $$('#message').get('value')});
    $$('#message').set('value', '');
  }

  socket.on('input-name', function (data) {
    var text = {
      register: 'Welcome. Please enter the nickname you will use',
      empty: 'You\'ve entered an empty name. Please try again',
      taken: 'The name you\'ve entered is already. Please try again'
    }[data.cause] + ':';
    log('Got request to supply username');
    socket.emit(data.action, {name: inputUsername(text)});
  });

  socket.on('announce', function(data) {
    var text = {
      login: {
        self: 'You\'ve logged in as ' + data.name,
        other: data.name + ' has logged in'
      },
      rename: {
        self: 'You\'re now known as ' + data.to + ' (was: ' + data.from + ')',
        other : data.from + ' is now known as ' + data.to
      }
    }[data.type][data.self ? 'self' : 'other'];
    log(text);

    if (data.type == 'login' && data.self) {
      $$('#message').addEvent('keyup', function(event) {
        if (event.key == 'enter') {
          sendMessage();
        }
      });
      $$('#send').addEvent('click', sendMessage);
      $$('#change-name').addEvent('click', function() {
        var name = inputUsername('Enter your new name:');
        socket.emit('rename', {name: name});
      });
    }
  });

  socket.on('message', function(data) {
    log(data.name + ': ' + data.text);
  });

  socket.emit('login');
});
define(['lib/mootools', '/socket.io/socket.io.js'], function() {
  var socket = io.connect('http://localhost/chat'), name, inited = false;

  function log(msg)
  {
    $$('#log').grab((new Element('li').appendText(msg)));
  }

  function inputUsername(text)
  {
    return prompt(text);
  }

  function sendMessage()
  {
    socket.emit('message', {text: $$('#message').get('value')});
    $$('#message').set('value', '');
  }

  socket.on('error', function(data) { console.error(data); });

  socket.on('valid-login', function(data) {
    name = data.name;
    socket.emit('valid-login-ack', {});

    if (!inited) {
      log('You\'ve logged in as ' + data.name);
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
      inited = true;
    }
  });

  socket.on('input-name', function (data) {
    var text = {
      register: 'Welcome. Please enter the nickname you will use',
      empty: 'You\'ve entered an empty name. Please try again',
      taken: 'The name you\'ve entered is already taken. Please try again'
      }[data.cause] + ':';
      socket.emit(data.action, {name: inputUsername(text)});
    });

    socket.on('announce', function(data) {
      var text = {
        login: {
          other: data.name + ' has logged in'
        },
        rename: {
          self: 'You\'re now known as ' + data.to + ' (was: ' + data.from + ')',
          other : data.from + ' is now known as ' + data.to
        }
        }[data.type][(data.name || data.to) == name ? 'self' : 'other'];

        if (typeOf(text) === 'string') log(text);
      });

      socket.on('message', function(data) {
        log(data.from + ': ' + data.text);
      });
    });
define(['order!lib/mootools', 'order!lib/mootools-more', '/socket.io/socket.io.js'], function() {
  var socket = io.connect('/chat'), name, inited = false, ui;

  /* Simple caching HTML5 audio */
  var Sounds = {
    cache: {},
    extension: null,
    load: function(name) {
      if ('Audio' in window && !(name in this.cache)) {
        this.cache[name] = new Audio();
        this.cache[name].src = '/sounds/' + name + '.' + this.extension;
      }
    },

    play: function(name) {
      if ('Audio' in window) {
        if (!(name in this.cache))
          this.load(name);
        this.cache[name].play();
      }
    }
  };

  /* Select a supported audio format */
  if("Audio" in window){
    var a = new Audio();
    if(!!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, '')))
      Sounds.extension = 'ogg';
    else if(!!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, '')))
      Sounds.extension = 'mp3';
    else if(!!(a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, '')))
      Sounds.extension = 'm4a';
    else
      Sounds.extension = 'mp3';
  }

  /**
   * Simple caching theme loader
   * Note that only the link tag is cached, not the CSS itself.
   * The browser is still responsible for that.
   */
  var Themes = {
    cache: {},
    current: null,
    apply: function(name) {
      if (!(name in this.cache))
        this.cache[name] = Asset.css('/stylesheets/chat/' + name + '.css', {id: 'css-chat'});

      if (this.current !== null)
        this.current.dispose();

      $$('head')[0].grab(this.cache[name]);
      this.current = this.cache[name];
    }
  };


  $(window).addEvent('domready', function() {
    Themes.apply('simple');

    // Set up UI elements and methods
    ui = {};
    ui.chat = $$('.chat')[0];
    ui.chat_head = ui.chat.getChildren('.head')[0];
    ui.chat_view = ui.chat.getChildren('.chat-view')[0];
    ui.chat_view_tbody = ui.chat_view.getChildren('tbody')[0];
    ui.filler = ui.chat_view_tbody.getChildren('tr.filler')[0];

    ui.userlist_container = ui.chat.getElements('.userlist-container')[0];
    ui.userlist = ui.chat.getElements('ul.userlist')[0];

    ui.logout = ui.chat.getElements('.logout')[0];
    ui.select_theme = ui.chat.getElements('.theme')[0];

    ui.message = ui.chat.getElements('.message')[0];
    ui.send = ui.chat.getElements('.send')[0];

    ui.scrollToBottom = function() {
      (new Fx.Scroll(ui.chat_view_tbody, {duration:0})).toBottom();
    };

    ui.resizeChatFiller = function() {
      var targetHeight =
        ui.chat_view.getSize().y - $$('.chat-row').getSize().map(function(o) { return o.y; }).sum();
      ui.filler.setStyle('height', targetHeight);
    };

    ui.resizeChatToWindow = function()
    {
      ui.chat_view_tbody.setStyle('height',
        $(window).getSize().y - 230
      );
      ui.message.setStyle('width',
        ui.chat.getSize().x - ui.send.getSize().x - 25
      );

      ui.userlist_container.setStyle('width',
        ui.chat.getSize().x - ui.chat_view.getSize().x - 65
      );
      ui.resizeChatFiller();
    };

    ui.resizeChatToWindow();
    ui.message.focus();

    var resizeTimer;
    window.addEvent('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = ui.resizeChatToWindow.delay(30);
    })
  });

  function log(time, sender, msg)
  {
    var tr = new Element('tr'),
      tdTime = new Element('td'), tdSender = new Element('td'), tdMsg = new Element('td'),
      date = new Date();

    tr.addClass('chat-row');

    date.setTime(time);
    tdTime.set('text', date.toLocaleTimeString());
    tdTime.addClass('time');

    tdSender.addClass('left');
    if (sender === null) {
      tdMsg.addClass('announcement');
    } else {
      tdSender.addClass('user');
      tdSender.appendText(sender);
    }
    tdMsg.appendText(msg);
    tr.grab(tdTime).grab(tdSender).grab(tdMsg);

    ui.resizeChatFiller();

    ui.chat_view_tbody.grab(tr);
    ui.scrollToBottom();
  }

  function inputUsername(text)
  {
    return prompt(text);
  }

  function sendMessage()
  {
    var msg = ui.message.get('value').trim(), date = new Date();
    if (msg.length > 0) {
      socket.emit('message', {text: ui.message.get('value'), time: date.getTime()});
      ui.message.set('value', '');
    }
  }

  socket.on('error', function(data) { console.error(data); });

  socket.on('valid-login', function(data) {
    name = data.name;
    socket.emit('valid-login-ack', {});

    if (!inited) {
      socket.emit('get-userlist', {});
      log(data.time, null, 'You\'ve logged in as ' + data.name);
      ui.message.addEvent('keyup', function(event) {
        if (event.key == 'enter') {
          sendMessage();
        }
      });

      ui.send.addEvent('click', sendMessage);

      ui.select_theme.addEvent('change', function() {
        Themes.apply(ui.select_theme.getProperty('value'));
        ui.resizeChatFiller();
        ui.scrollToBottom();
      });

      ui.logout.addEvent('click', function() {
        window.location = '/openid/logout';
      });

      inited = true;
    }
  });

  socket.on('invalid-login', function (data) {
    window.location = '/openid';
  });

  socket.on('announce', function(data) {
    var el, text = {
      login: {
        other: data.name + ' has logged in'
      },
      logout: {
        other: data.name + ' has left'
      }
    }[data.type][(data.name || data.to) == name ? 'self' : 'other'];

    if (typeOf(text) === 'string') log(data.time, null, text);

    if (data.type === 'login' && data.name !== name) {
      el = new Element('li');
      el.appendText(data.name);
      el.setProperty('rel', data.name);
      ui.userlist.grab(el);
    }

    else  if (data.type === 'logout') {
      ui.userlist.getElements('[rel=' + data.name + ']').dispose();
    }
  });

  socket.on('message', function(data) {
    log(data.time, data.from, data.text);
    if (data.from === name) Sounds.play('send');
    else Sounds.play('receive');
  });

  socket.on('user-list', function(data) {
    var i, name;
    ui.userlist.getElements().dispose();
    data.each(function(name) {
      var el = new Element('li');
      el.appendText(name);
      el.setProperty('rel', name);
      ui.userlist.grab(el);
    });
  })
});
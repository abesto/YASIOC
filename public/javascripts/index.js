var socket = io.connect('http://localhost');
socket.on('sid', function (data) {
  socket.emit('a', data);
  console.log(data);
});
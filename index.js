const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = { origin: "*", credentials: true };
const io = require('socket.io')(http, { cors });
const port = process.env.PORT || 9000;

io.on('connection', socket => {
  console.log(`a user connected at ${socket.id}`);

  socket.on('private message', (anotherSocketId, message) => {
    socket.to(anotherSocketId).emit('private message', socket.id, message);
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected');
  });

  socket.on('chat message', message => {
    socket.broadcast.emit('message', message);
  });

  socket.on('join room', room => socket.join(room));
  socket.on('leave room', room => {
    socket.leave(room)
    console.log(socket.rooms);
  });

  socket.on('room message', (room, message) => {
    socket.to(room).emit('room message', message);
  })
});

http.listen(port, () => console.log(`listening on port ${port}`));
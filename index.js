const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = { origin: "*", credentials: true };
const io = require('socket.io')(http, { cors });
const port = process.env.PORT || 9000;

const users = {};
const rooms = {};

io.on('connection', socket => {
  console.log(`a user connected at ${socket.id}`);
  users[socket.id] = socket.handshake.query.name;

  socket.on('private message', (anotherSocketId, message) => {
    socket.to(anotherSocketId).emit('private message', socket.id, message);
  });

  socket.on('disconnect', () => {
    leaveAllRooms(socket.handshake.query.name);

    console.log('a user disconnected');
  });

  socket.on('chat message', message => {
    socket.broadcast.emit('message', message);
  });

  socket.on('join room', (room, sendPeople) => {
    const { name } = socket.handshake.query;
    socket.join(room)
    rooms[room]
      ? rooms[room].push(name)
      : rooms[room] = [name];
    sendPeople(rooms[room].filter(person => person !== name));
  });
  socket.on('leave room', room => {
    socket.leave(room)
    leaveRoom(room, socket.handshake.query.name);
  });

  socket.on('room message', (room, message) => {
    socket.to(room).emit('room message', message);
  })
});

function leaveRoom(room, username) {
  if (rooms[room]) {
    const index = rooms[room].indexOf(username);
    if (index > -1) {
      rooms[room].splice(index, 1);
    }
  }
}

function leaveAllRooms(username) {
  Object.keys(rooms).forEach(room => {
    const foundPerson = rooms[room].find(person => person === username);
    if (foundPerson) {
      leaveRoom(room, username);
    }
  });
}

http.listen(port, () => console.log(`listening on port ${port}`));
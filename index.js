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
  users[socket.id] = socket.handshake.query.username;

  socket.on('disconnect', () => {
    leaveAllRooms(socket);
    socket.broadcast.emit('disconnect video', socket.id);
    delete users[socket.id];
    console.log('a user disconnected');
  });

  socket.on('private message', (anotherSocketId, message) => {
    socket.to(anotherSocketId).emit('private message', socket.id, message);
  });

  socket.on('chat message', message => {
    socket.broadcast.emit('message', message);
  });

  socket.on('join room', (room, sendPeople) => joinRoom(room, sendPeople, socket));
  socket.on('leave room', room => leaveRoom(room, socket));

  socket.on('room message', (room, message) => {
    const { username } = socket.handshake.query;
    socket.to(room).emit('room message', message, username);
  });

  socket.on('ask for users', room => {
    io.to(socket.id).emit('get users', otherUsers(room, socket.id));
  })

  socket.on('enter offer', (offer, receiverSocketId) => {
    const username = users[socket.id];
    socket.to(receiverSocketId).emit('enter offer', offer, socket.id, username, true);
  });
  socket.on('return offer', (offer, senderSocketId) => {
    const username = users[socket.id];
    socket.to(senderSocketId).emit('return offer', offer, socket.id, username, false);
  });
  socket.on('offer candidate', (candidate, receiverSocketId) => {
    socket.to(receiverSocketId).emit('offer candidate', candidate, socket.id);
  });

  socket.on('answer', (answer, senderSocketId) => {
    socket.to(senderSocketId).emit('answer', answer, socket.id);
  });
  socket.on('answer candidate', (candidate, senderSocketId) => {
    socket.to(senderSocketId).emit('answer candidate', candidate, socket.id);
  });
});

function otherUsers(room, currentUserSocketId) {
  return Object.keys(rooms[room])
    .filter(socketId => socketId !== currentUserSocketId);
}

function joinRoom(room, sendPeople, socket) {
  const { username } = socket.handshake.query;
  socket.join(room);
  socket.to(room).emit('someone joined', username);
  addToRoom(room, socket.id, username);
  const allOtherPeopleInRoom = Object.values(rooms[room])
    .filter(roomUsername => roomUsername !== username);
  sendPeople(allOtherPeopleInRoom);
}

function addToRoom(room, socketId, username) {
  rooms[room]
    ? rooms[room][socketId] = username
    : rooms[room] = { [socketId]: username };
}

function leaveRoom(room, socket) {
  socket.broadcast.emit('disconnect video', socket.id);

  const { username } = socket.handshake.query;
  socket.leave(room);
  socket.to(room).emit('someone left', username);
  removeFromRoom(room, socket.id);
}

function removeFromRoom(room, socketId) {
  if (rooms[room]) {
    delete rooms[room][socketId];
    if (!Object.keys(rooms[room]).length) {
      delete rooms[room]
    }
  }
}

function leaveAllRooms(socket) {
  Object.keys(rooms).forEach(room => {
    const foundPerson = rooms[room][socket.id];
    if (foundPerson) {
      leaveRoom(room, socket);
    }
  });
}

http.listen(port, () => console.log(`listening on port ${port}`));
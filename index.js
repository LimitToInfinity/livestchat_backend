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

  socket.on('stop screen share', () => socket.emit('stop screen share', socket.id));

  socket.on('room message', (room, message) => {
    const { username } = socket.handshake.query;
    socket.to(room).emit('room message', message, username);
  });

  socket.on('ask for users', (room, mediaType) => {
    io.to(socket.id).emit('get users', otherUsers(room, socket.id), mediaType);
  })

  socket.on('offer', (offer, socketId, offerType, mediaType) => {
    const username = users[socket.id];
    socket.to(socketId).emit('offer', offer, socket.id, username, offerType, mediaType);
  });

  socket.on('answer', (answer, senderSocketId, mediaType) => {
    socket.to(senderSocketId).emit('answer', answer, socket.id, mediaType);
  });

  socket.on('candidate', (candidate, socketId, offerOrAnswer, mediaType) => {
    socket.to(socketId).emit('candidate', candidate, socket.id, offerOrAnswer, mediaType);
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
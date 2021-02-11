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

  socket.on('private message', (anotherSocketId, message) => {
    socket.to(anotherSocketId).emit('private message', socket.id, message);
  });

  // socket.on("disconnect", () => {
  //   // socket.to(broadcaster).emit("disconnect peer", socket.id);
  //   console.log('disconnect');
  // });
  socket.on('disconnect', () => {
    leaveAllRooms(socket);
    socket.broadcast.emit('disconnect video', socket.id);
    console.log('a user disconnected');
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

  socket.on('video chat', () => {
    console.log('video chat');
  });

  // socket.on("offer", (id, message) => {
  //   socket.to(id).emit("offer", socket.id, message);
  // });
  socket.on('offer', offer => {
    console.log('offer', offer);
    socket.broadcast.emit('offer', offer, socket.id);
  });

  // socket.on("candidate", (id, message) => {
  //   socket.to(id).emit("candidate", socket.id, message);
  // });
  socket.on('candidate', candidate => {
    console.log('candidate', candidate);
    socket.broadcast.emit('candidate', candidate, socket.id);
  });

  socket.on("broadcaster", () => {
    // broadcaster = socket.id;
    // socket.broadcast.emit("broadcaster");
    console.log('broadcaster');
  });

  socket.on("watcher", () => {
    // socket.to(broadcaster).emit("watcher", socket.id);
    console.log('watcher');
  });

  socket.on('answer', description => {
    // socket.to(id).emit("answer", socket.id, message);
    console.log('answer', description);
    socket.broadcast.emit('answer', description);
  });
});

function joinRoom(room, sendPeople, socket) {
  const { username } = socket.handshake.query;
  socket.join(room);
  socket.to(room).emit('someone joined', username);
  addToRoom(room, username);
  const allOtherPeopleInRoom = rooms[room].filter(person => person !== username);
  sendPeople(allOtherPeopleInRoom);
}

function addToRoom(room, username) {
  rooms[room]
    ? rooms[room].push(username)
    : rooms[room] = [username];
}

function leaveRoom(room, socket) {
  const { username } = socket.handshake.query;
  socket.leave(room);
  socket.to(room).emit('someone left', username);
  removeFromRoom(room, username);
}

function removeFromRoom(room, username) {
  if (rooms[room]) {
    const index = rooms[room].indexOf(username);
    if (index > -1) {
      rooms[room].splice(index, 1);
    }
  }
}

function leaveAllRooms(socket) {
  const { username } = socket.handshake.query;
  Object.keys(rooms).forEach(room => {
    const foundPerson = rooms[room].find(person => person === username);
    if (foundPerson) {
      leaveRoom(room, socket);
    }
  });
}

http.listen(port, () => console.log(`listening on port ${port}`));
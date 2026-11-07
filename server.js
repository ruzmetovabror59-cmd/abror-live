const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true }));

// Signaling only: live audio/video travels peer-to-peer through WebRTC.
io.on("connection", (socket) => {
  socket.on("join-room", (room, reply) => {
    if (typeof room !== "string" || !/^[A-Z0-9]{6}$/.test(room)) {
      if (reply) reply({ ok: false, error: "Kod noto‘g‘ri." });
      return;
    }
    const members = io.sockets.adapter.rooms.get(room);
    if (members && members.size >= 2) {
      if (reply) reply({ ok: false, error: "Bu xona band. Yangi kod yarating." });
      return;
    }
    socket.join(room);
    socket.data.room = room;
    const count = io.sockets.adapter.rooms.get(room)?.size || 1;
    if (reply) reply({ ok: true, count });
    socket.to(room).emit("peer-joined");
  });

  for (const event of ["offer", "answer", "ice-candidate"]) {
    socket.on(event, (payload) => {
      const room = socket.data.room;
      if (room && payload) socket.to(room).emit(event, payload);
    });
  }

  socket.on("disconnect", () => {
    if (socket.data.room) socket.to(socket.data.room).emit("peer-left");
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Abror Live listening on ${port}`));

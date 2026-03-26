const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.redirect("/pantalla.html");
});

app.get("/pantalla", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pantalla.html"));
});

app.get("/mando", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mando.html"));
});

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on("clientReady", (data) => {
    io.emit("statusMessage", {
      text: `${data?.role || "cliente"} conectado`,
      socketId: socket.id
    });
  });

  socket.on("nextStep", () => io.emit("nextStep"));
  socket.on("prevStep", () => io.emit("prevStep"));
  socket.on("zoomIn", () => io.emit("zoomIn"));
  socket.on("zoomOut", () => io.emit("zoomOut"));
  socket.on("toggleMode", () => io.emit("toggleMode"));
  socket.on("recenter", () => io.emit("recenter"));
  socket.on("confirm", () => io.emit("confirm"));
  socket.on("exit", () => io.emit("exit"));

  socket.on("orientationData", (data) => {
    io.emit("orientationData", data);
  });

  socket.on("disconnect", () => {
    io.emit("statusMessage", {
      text: "Un cliente se ha desconectado",
      socketId: socket.id
    });
  });
});

server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
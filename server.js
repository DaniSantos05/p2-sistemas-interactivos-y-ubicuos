// Importamos el módulo 'path' para trabajar con rutas de archivos y carpetas
const path = require("path");

// Importamos Express para crear el servidor web
const express = require("express");

// Importamos 'http' para crear el servidor HTTP manualmente
const http = require("http");

// Importamos la clase Server de Socket.IO para la comunicación en tiempo real
const { Server } = require("socket.io");

// Creamos la aplicación Express
const app = express();

// Creamos un servidor HTTP usando la app de Express
const server = http.createServer(app);

// Creamos el servidor de Socket.IO asociado al servidor HTTP
const io = new Server(server);

// Definimos el puerto donde se ejecutará el servidor
// Si existe una variable de entorno PORT la usa, si no usa el 3000
const PORT = process.env.PORT || 3000;

// Le decimos a Express que sirva todos los archivos estáticos de la carpeta 'public'
// Así podrá abrir HTML, CSS y JS desde esa carpeta
app.use(express.static(path.join(__dirname, "public")));

// Cuando alguien entre en la raíz "/", lo redirigimos a pantalla.html
app.get("/", (req, res) => {
  res.redirect("/pantalla.html");
});

// Ruta opcional para abrir directamente la pantalla principal
app.get("/pantalla", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pantalla.html"));
});



// Actualmente el mando no se usa, se ha sustituido por el boton hamburguesa
// Pero se deja el codigo por si se quiere volver a usar en el futuro

// Escuchamos cuando un cliente se conecta por Socket.IO
io.on("connection", (socket) => {
  // Mostramos en consola el id del cliente que se ha conectado
  console.log(`Cliente conectado: ${socket.id}`);

  // Escuchamos el evento "clientReady", que manda cada cliente al conectarse
  socket.on("clientReady", (data) => {
    // Mostramos en consola qué tipo de cliente se ha conectado
    console.log("clientReady recibido:", data);

    // Reenviamos a todos los clientes un mensaje de estado indicando quién se ha conectado
    io.emit("statusMessage", {
      text: `${data?.role || "cliente"} conectado`,
      socketId: socket.id
    });
  });

  // Cuando el mando emita "nextStep", lo mostramos por consola y lo reenviamos
  socket.on("nextStep", () => {
    console.log("Servidor recibió: nextStep");
    io.emit("nextStep");
  });

  // Cuando el mando emita "prevStep", lo mostramos por consola y lo reenviamos
  socket.on("prevStep", () => {
    console.log("Servidor recibió: prevStep");
    io.emit("prevStep");
  });

  // Cuando el mando emita "zoomIn", lo mostramos por consola y lo reenviamos
  socket.on("zoomIn", () => {
    console.log("Servidor recibió: zoomIn");
    io.emit("zoomIn");
  });

  // Cuando el mando emita "zoomOut", lo mostramos por consola y lo reenviamos
  socket.on("zoomOut", () => {
    console.log("Servidor recibió: zoomOut");
    io.emit("zoomOut");
  });

  // Cuando el mando emita "toggleMode", lo mostramos por consola y lo reenviamos
  socket.on("toggleMode", () => {
    console.log("Servidor recibió: toggleMode");
    io.emit("toggleMode");
  });

  // Cuando el mando emita "recenter", lo mostramos por consola y lo reenviamos
  socket.on("recenter", () => {
    console.log("Servidor recibió: recenter");
    io.emit("recenter");
  });

  // Cuando el mando emita "confirm", lo mostramos por consola y lo reenviamos
  socket.on("confirm", () => {
    console.log("Servidor recibió: confirm");
    io.emit("confirm");
  });

  // Cuando el mando emita "exit", lo mostramos por consola y lo reenviamos
  socket.on("exit", () => {
    console.log("Servidor recibió: exit");
    io.emit("exit");
  });

  // Si el mando envía datos de orientación más detallados, los mostramos y los reenviamos
  socket.on("orientationData", (data) => {
    console.log("Servidor recibió orientationData:", data);
    io.emit("orientationData", data);
  });

  // Escuchamos cuándo un cliente se desconecta
  socket.on("disconnect", () => {
    // Mostramos en consola el id del cliente que se ha desconectado
    console.log(`Cliente desconectado: ${socket.id}`);

    // Enviamos a todos un mensaje de estado avisando de la desconexión
    io.emit("statusMessage", {
      text: "Un cliente se ha desconectado",
      socketId: socket.id
    });
  });
});

// Ponemos el servidor a escuchar en el puerto indicado
server.listen(PORT, () => {
  // Mostramos en consola la URL local del servidor
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
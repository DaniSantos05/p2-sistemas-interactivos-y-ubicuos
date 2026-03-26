// Creamos la conexión con el servidor Socket.IO
const socket = io();

// Guardamos el párrafo donde se mostrará el estado de conexión
const connectionStatus = document.getElementById("connectionStatus");

// Seleccionamos todos los botones que tienen el atributo data-event
const buttons = document.querySelectorAll("button[data-event]");

// Cuando el mando se conecta correctamente al servidor
socket.on("connect", () => {
  // Mostramos el id de conexión en pantalla
  connectionStatus.textContent = `Conectado. ID: ${socket.id}`;

  // Avisamos al servidor de que este cliente es el mando
  socket.emit("clientReady", { role: "mando" });
});

// Recorremos todos los botones encontrados
buttons.forEach((button) => {
  // A cada botón le añadimos un evento de clic
  button.addEventListener("click", () => {
    // Guardamos el nombre del evento que está en el atributo data-event
    const eventName = button.dataset.event;

    // Enviamos ese evento al servidor por Socket.IO
    socket.emit(eventName);
  });
});
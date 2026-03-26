// Creamos la conexión con el servidor Socket.IO
const socket = io();

// Guardamos referencias a los elementos HTML que vamos a actualizar
const connectionStatus = document.getElementById("connectionStatus");
const lastEvent = document.getElementById("lastEvent");
const modeStatus = document.getElementById("modeStatus");
const orientationBox = document.getElementById("orientationBox");

// Variable para guardar el modo actual de la interfaz
let currentMode = "2D";

// Cuando la pantalla se conecta correctamente al servidor
socket.on("connect", () => {
  // Mostramos en pantalla que se ha conectado y el id del socket
  connectionStatus.textContent = `Conectado. ID: ${socket.id}`;

  // Avisamos al servidor de que este cliente es la pantalla
  socket.emit("clientReady", { role: "pantalla" });
});

// Cuando recibimos el evento "nextStep"
socket.on("nextStep", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: nextStep";
});

// Cuando recibimos el evento "prevStep"
socket.on("prevStep", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: prevStep";
});

// Cuando recibimos el evento "zoomIn"
socket.on("zoomIn", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: zoomIn";
});

// Cuando recibimos el evento "zoomOut"
socket.on("zoomOut", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: zoomOut";
});

// Cuando recibimos el evento "toggleMode"
socket.on("toggleMode", () => {
  // Cambiamos el modo actual: si era 2D pasa a 3D, y si era 3D pasa a 2D
  currentMode = currentMode === "2D" ? "3D" : "2D";

  // Mostramos en pantalla el nuevo modo
  modeStatus.textContent = `Modo: ${currentMode}`;

  // Indicamos que el último evento recibido fue toggleMode
  lastEvent.textContent = "Último evento: toggleMode";
});

// Cuando recibimos el evento "recenter"
socket.on("recenter", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: recenter";
});

// Cuando recibimos el evento "confirm"
socket.on("confirm", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: confirm";
});

// Cuando recibimos el evento "exit"
socket.on("exit", () => {
  // Actualizamos el texto del último evento recibido
  lastEvent.textContent = "Último evento: exit";
});

// Cuando recibimos datos más completos de orientación
socket.on("orientationData", (data) => {
  // Mostramos esos datos formateados en el bloque <pre>
  orientationBox.textContent = JSON.stringify(data, null, 2);
});
const socket = io();

const connectionStatus = document.getElementById("connectionStatus");
const lastEvent = document.getElementById("lastEvent");
const modeStatus = document.getElementById("modeStatus");
const orientationBox = document.getElementById("orientationBox");

let currentMode = "2D";

socket.on("connect", () => {
  connectionStatus.textContent = `Conectado. ID: ${socket.id}`;
  socket.emit("clientReady", { role: "pantalla" });
});

socket.on("nextStep", () => {
  lastEvent.textContent = "Último evento: nextStep";
});

socket.on("prevStep", () => {
  lastEvent.textContent = "Último evento: prevStep";
});

socket.on("zoomIn", () => {
  lastEvent.textContent = "Último evento: zoomIn";
});

socket.on("zoomOut", () => {
  lastEvent.textContent = "Último evento: zoomOut";
});

socket.on("toggleMode", () => {
  currentMode = currentMode === "2D" ? "3D" : "2D";
  modeStatus.textContent = `Modo: ${currentMode}`;
  lastEvent.textContent = "Último evento: toggleMode";
});

socket.on("recenter", () => {
  lastEvent.textContent = "Último evento: recenter";
});

socket.on("confirm", () => {
  lastEvent.textContent = "Último evento: confirm";
});

socket.on("exit", () => {
  lastEvent.textContent = "Último evento: exit";
});

socket.on("orientationData", (data) => {
  orientationBox.textContent = JSON.stringify(data, null, 2);
});
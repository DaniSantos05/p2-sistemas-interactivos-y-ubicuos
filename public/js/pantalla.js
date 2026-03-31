// =========================
// CONEXIÓN CON SOCKET.IO
// =========================

// Creamos la conexión con el servidor Socket.IO
const socket = io();

// Referencias a elementos del panel de estado
const connectionStatus = document.getElementById("connectionStatus");
const lastEvent = document.getElementById("lastEvent");
const modeStatus = document.getElementById("modeStatus");
const stepBox = document.getElementById("stepBox");

// Cuando la pantalla se conecta correctamente al servidor
socket.on("connect", () => {
  // Mostramos el estado de conexión
  connectionStatus.textContent = `Conectado. ID: ${socket.id}`;

  // Avisamos al servidor de que este cliente es la pantalla principal
  socket.emit("clientReady", { role: "pantalla" });
});

// =========================
// ELEMENTOS DEL DOM
// =========================

// Campo de texto del destino
const destinoInput = document.getElementById("destinoInput");

// Botón de calcular ruta
const btnRuta = document.getElementById("btnRuta");

// Checkbox para elegir destino haciendo clic
const clickMode = document.getElementById("clickMode");

// Texto del estado de la ruta
const estadoRuta = document.getElementById("estadoRuta");



// =========================
// INICIALIZACIÓN DEL MAPA
// =========================

// Creamos el mapa con una vista inicial en Madrid
const mapa = L.map("mapa").setView([40.4168, -3.7038], 15);

// Añadimos la capa base de OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

// =========================
// VARIABLES DE ESTADO
// =========================

// Coordenadas actuales del usuario
let miLatitud = null;
let miLongitud = null;

// Marcador del usuario
let marcadorUsuario = null;

// Control de la ruta actual
let controlRuta = null;

// Marcador del destino elegido al hacer clic
let marcadorDestino = null;

// Coordenadas del destino seleccionado con clic
let destinoClickLat = null;
let destinoClickLon = null;

// Ruta e instrucciones actuales
let instruccionesRuta = [];
let coordenadasRuta = [];
let indicePasoActual = -1;

// Modo actual visual
let currentMode = "2D";

// =========================
// OBTENER UBICACIÓN DEL USUARIO
// =========================

// Comprobamos si el navegador soporta geolocalización
if ("geolocation" in navigator) {
  // Empezamos a vigilar la posición del usuario
  navigator.geolocation.watchPosition(
    (pos) => {
      // Guardamos latitud y longitud actuales
      miLatitud = pos.coords.latitude;
      miLongitud = pos.coords.longitude;

      // Si todavía no existe el marcador del usuario, lo creamos
      if (!marcadorUsuario) {
        mapa.setView([miLatitud, miLongitud], 16);

        marcadorUsuario = L.marker([miLatitud, miLongitud])
          .addTo(mapa)
          .bindPopup("Estás aquí")
          .openPopup();

        estadoRuta.textContent = "Ubicación obtenida. Ya puedes buscar una ruta.";
      } else {
        // Si ya existe, solo actualizamos su posición
        marcadorUsuario.setLatLng([miLatitud, miLongitud]);
      }
    },
    (err) => {
      // Si falla el GPS, mostramos error
      estadoRuta.textContent = "No se pudo obtener el GPS. Permite el acceso a la ubicación.";
      console.error("Error GPS:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
} else {
  // Si el navegador no soporta geolocalización
  estadoRuta.textContent = "Tu navegador no soporta geolocalización.";
}

// =========================
// SELECCIÓN DE DESTINO CON CLIC
// =========================

// Cuando se hace clic sobre el mapa
mapa.on("click", (e) => {
  // Solo actuamos si el modo clic está activado
  if (!clickMode.checked) return;

  // Guardamos la latitud y la longitud del punto clicado
  destinoClickLat = e.latlng.lat;
  destinoClickLon = e.latlng.lng;

  // Si ya había un marcador de destino, lo movemos
  if (marcadorDestino) {
    marcadorDestino.setLatLng(e.latlng);
  } else {
    // Si no había marcador, lo creamos
    marcadorDestino = L.marker(e.latlng, {
      icon: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(mapa);
  }

  // Mostramos la información del destino en un popup
  marcadorDestino
    .bindPopup(`Destino: ${destinoClickLat.toFixed(5)}, ${destinoClickLon.toFixed(5)}`)
    .openPopup();

  // Actualizamos el texto de estado
  estadoRuta.textContent = "Destino seleccionado en el mapa. Pulsa 'Buscar y calcular ruta'.";
});

// =========================
// FUNCIONES AUXILIARES
// =========================

// Función para limpiar la ruta actual
function limpiarRuta() {
  // Si existe el control de ruta, lo quitamos
  if (controlRuta) {
    mapa.removeControl(controlRuta);
    controlRuta = null;
  }

  // Reiniciamos las instrucciones
  instruccionesRuta = [];

  // Reiniciamos las coordenadas
  coordenadasRuta = [];

  // Reiniciamos el índice del paso actual
  indicePasoActual = -1;

  // Actualizamos el cuadro del paso actual
  stepBox.textContent = "No hay una ruta activa.";


}

// Función para mostrar el paso actual
function mostrarPasoActual() {
  // Si no hay instrucciones, avisamos
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No hay instrucciones disponibles para esta ruta.";
    return;
  }

  // Si el índice se ha salido por debajo, lo corregimos
  if (indicePasoActual < 0) {
    indicePasoActual = 0;
  }

  // Si el índice se ha salido por arriba, lo corregimos
  if (indicePasoActual >= instruccionesRuta.length) {
    indicePasoActual = instruccionesRuta.length - 1;
  }

  // Cogemos la instrucción actual
  const instruccion = instruccionesRuta[indicePasoActual];

  // Construimos el texto que se mostrará
  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}\n\n` +
    `${instruccion.text || "Sin texto disponible"}\n\n` +
    `Distancia aproximada: ${Math.round((instruccion.distance || 0))} m`;

  // Lo mostramos en pantalla
  stepBox.textContent = textoPaso;

  // Si la instrucción tiene un índice de coordenada válido, movemos el mapa allí
  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    const punto = coordenadasRuta[instruccion.index];
    mapa.panTo([punto.lat, punto.lng]);
  }
}

// Función para ir al siguiente paso
function siguientePaso() {
  // Si no hay ruta, avisamos
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No puedes avanzar pasos porque todavía no hay una ruta calculada.";
    return;
  }

  // Avanzamos un paso si no estamos al final
  if (indicePasoActual < instruccionesRuta.length - 1) {
    indicePasoActual++;
  }

  // Mostramos el paso actual
  mostrarPasoActual();
}

// Función para ir al paso anterior
function pasoAnterior() {
  // Si no hay ruta, avisamos
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No puedes retroceder pasos porque todavía no hay una ruta calculada.";
    return;
  }

  // Retrocedemos un paso si no estamos al principio
  if (indicePasoActual > 0) {
    indicePasoActual--;
  }

  // Mostramos el paso actual
  mostrarPasoActual();
}

// Función para cambiar visualmente entre modo 2D y 3D
function toggleModeVisual() {
  // Si el modo actual es 2D, pasamos a 3D
  if (currentMode === "2D") {
    currentMode = "3D";
    document.body.classList.remove("modo-2d");
    document.body.classList.add("modo-3d");
  } else {
    // Si estaba en 3D, volvemos a 2D
    currentMode = "2D";
    document.body.classList.remove("modo-3d");
    document.body.classList.add("modo-2d");
  }

  // Actualizamos el texto del modo
  modeStatus.textContent = `Modo: ${currentMode}`;

  // Forzamos a Leaflet a recalcular el tamaño del mapa tras el cambio visual
  setTimeout(() => {
    mapa.invalidateSize();
  }, 450);
}

// Función para recentrar el mapa en el usuario
function recentrarMapa() {
  // Si ya tenemos la posición del usuario
  if (miLatitud !== null && miLongitud !== null) {
    mapa.setView([miLatitud, miLongitud], 16);
    estadoRuta.textContent = "Mapa recentrado en tu posición.";
  } else {
    estadoRuta.textContent = "Todavía no se conoce tu posición actual.";
  }
}

// =========================
// CÁLCULO DE RUTA
// =========================

// Función principal para calcular una ruta
async function calcularRuta() {
  // Si aún no tenemos GPS, no seguimos
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent = "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  // Leemos el texto del destino
  const destino = destinoInput.value.trim();

  // Comprobamos si está activado el modo clic
  const usarClic = clickMode.checked;

  // Variables donde guardaremos destino final
  let destLat;
  let destLon;
  let destNombre;

  // Si el modo clic está activo y hay un punto seleccionado
  if (usarClic && destinoClickLat !== null) {
    destLat = destinoClickLat;
    destLon = destinoClickLon;
    destNombre = `Punto: ${destLat.toFixed(5)}, ${destLon.toFixed(5)}`;
  } else if (destino) {
    // Si se ha escrito un texto, usamos Nominatim
    estadoRuta.textContent = "Buscando el lugar...";

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      // Si no encuentra nada
      if (geoData.length === 0) {
        estadoRuta.textContent = "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      // Guardamos latitud, longitud y nombre del destino
      destLat = parseFloat(geoData[0].lat);
      destLon = parseFloat(geoData[0].lon);
      destNombre = geoData[0].display_name;
    } catch (error) {
      // Si falla la petición
      estadoRuta.textContent = "Error de conexión con los servicios de mapas.";
      console.error(error);
      return;
    }
  } else {
    // Si no hay ni clic ni texto
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  // Limpiamos una ruta anterior si existía
  limpiarRuta();

  // Informamos de que se está calculando la ruta
  estadoRuta.textContent = "Calculando ruta a pie...";

  // Creamos el control de ruta
  controlRuta = L.Routing.control({
    waypoints: [
      L.latLng(miLatitud, miLongitud),
      L.latLng(destLat, destLon)
    ],
    routeWhileDragging: false,
    router: L.Routing.osrmv1({
      serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",
      profile: "foot"
    }),
    lineOptions: {
      styles: [{ color: "#1f6feb", weight: 5, opacity: 0.85 }]
    },
    createMarker: function (i, waypoint) {
      // No queremos duplicar el marcador de origen
      if (i === 0) return null;

      // Creamos el marcador del destino
      return L.marker(waypoint.latLng).bindPopup(destNombre);
    },
    language: "es",
    show: true,
    collapsible: true,
    fitSelectedRoutes: true
  }).addTo(mapa);

  // Cuando se encuentra la ruta correctamente
  controlRuta.on("routesfound", (e) => {
    // Cogemos la primera ruta encontrada
    const ruta = e.routes[0];

    // Guardamos instrucciones y coordenadas
    instruccionesRuta = ruta.instructions || [];
    coordenadasRuta = ruta.coordinates || [];

    // Reiniciamos el índice del paso actual
    indicePasoActual = 0;

    // Resumen de distancia y tiempo
    const distKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const tiempoMin = Math.round(ruta.summary.totalTime / 60);

    // Mostramos el estado
    estadoRuta.textContent = `Ruta calculada: ${distKm} km, ~${tiempoMin} min a pie.`;


    // Mostramos el primer paso
    mostrarPasoActual();
  });

  // Si falla el cálculo de la ruta
  controlRuta.on("routingerror", () => {
    estadoRuta.textContent = "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}

// =========================
// EVENTOS DEL DOM
// =========================

// Al pulsar el botón, calculamos la ruta
btnRuta.addEventListener("click", calcularRuta);

// Si se pulsa Enter en el input, también calculamos la ruta
destinoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    calcularRuta();
  }
});

// =========================
// EVENTOS RECIBIDOS DESDE EL MANDO
// =========================

// Si recibimos nextStep
socket.on("nextStep", () => {
  lastEvent.textContent = "Último evento: nextStep";
  siguientePaso();
});

// Si recibimos prevStep
socket.on("prevStep", () => {
  lastEvent.textContent = "Último evento: prevStep";
  pasoAnterior();
});

// Si recibimos zoomIn
socket.on("zoomIn", () => {
  lastEvent.textContent = "Último evento: zoomIn";
  mapa.zoomIn();
});

// Si recibimos zoomOut
socket.on("zoomOut", () => {
  lastEvent.textContent = "Último evento: zoomOut";
  mapa.zoomOut();
});

// Si recibimos toggleMode
socket.on("toggleMode", () => {
  lastEvent.textContent = "Último evento: toggleMode";
  toggleModeVisual();
});

// Si recibimos recenter
socket.on("recenter", () => {
  lastEvent.textContent = "Último evento: recenter";
  recentrarMapa();
});

// Si recibimos confirm
socket.on("confirm", () => {
  lastEvent.textContent = "Último evento: confirm";
  estadoRuta.textContent = "Acción confirmada desde el mando.";
});

// Si recibimos exit
socket.on("exit", () => {
  lastEvent.textContent = "Último evento: exit";
  limpiarRuta();
  estadoRuta.textContent = "Ruta cancelada desde el mando.";
});

// Si llegan datos más detallados de orientación
socket.on("orientationData", (data) => {
  // De momento solo los mostramos por consola
  console.log("orientationData recibido en pantalla:", data);
});

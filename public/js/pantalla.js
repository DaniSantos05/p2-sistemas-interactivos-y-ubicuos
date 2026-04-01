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

const destinoInput = document.getElementById("destinoInput");   // Campo de texto del destino
const btnRuta = document.getElementById("btnRuta");             // Botón de calcular ruta
const clickMode = document.getElementById("clickMode");         // Checkbox para elegir destino haciendo clic
const estadoRuta = document.getElementById("estadoRuta");       // Texto del estado de la ruta

// Elementos del DOM de la barra lateral
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const closeSidebar = document.getElementById("closeSidebar");

// Eventos para abrir y cerrar la barra lateral
menuToggle.addEventListener("click", () => {
  sidebar.classList.add("visible");
});
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("visible");
});

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

let marcadorUsuario = null;   // Marcador del usuario
let controlRuta = null;       // Control de la ruta actual
let marcadorDestino = null;   // Marcador del destino elegido al hacer clic

let destinoClickLat = null;   // Coordenadas de la latitud del destino seleccionado con clic
let destinoClickLon = null;   // Coordenadas de la longitud del destino seleccionado con clic

let instruccionesRuta = [];   // Ruta e instrucciones actuales
let coordenadasRuta = [];     // Coordenadas de la ruta actual
let indicePasoActual = -1;    // Índice del paso actual

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

        marcadorUsuario = L.marker([miLatitud, miLongitud])  // Creamos el marcador del usuario
          .addTo(mapa)              // Lo añadimos al mapa
          .bindPopup("Estás aquí")  // Le ponemos un popup
          .openPopup();             // Lo abrimos

        estadoRuta.textContent = "Ubicación obtenida. Ya puedes buscar una ruta."; // Actualizamos el texto de estado
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
      // Estas opciones son para mejorar la precisión del GPS
      enableHighAccuracy: true,  // Mejor precisión
      maximumAge: 0,             // No usar caché
      timeout: 10000             // Tiempo máximo de espera
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
        // Los marcadores los sacamos de internet
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],  // Tamaño del icono
        iconAnchor: [12, 41] // Punto de anclaje del icono
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

  instruccionesRuta = [];  // Reiniciamos las instrucciones
  coordenadasRuta = [];    // Reiniciamos las coordenadas
  indicePasoActual = -1;   // Reiniciamos el índice del paso actual

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

  /* Esto de los indices se usa para que si por ejemplo estamos en el paso 2 
  y le damos a anterior, no se vaya al paso -1, sino que se quede en el 1*/

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

  // Construimos el texto que se mostrará en el cuadro del paso actual
  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}\n\n` +
    `${instruccion.text || "Sin texto disponible"}\n\n` +
    `Distancia aproximada: ${Math.round((instruccion.distance || 0))} m`;

  // Lo mostramos en pantalla
  stepBox.textContent = textoPaso;

  /* Este fragmento es el encargado de que la cámara del mapa se deslice automáticamente hacia
  el lugar donde ocurre la instrucción. Para entender cómo funciona internamente, hay que tener cuenta 
  que el trazador de rutas (Leaflet Routing Machine) nos devuelve dos listas separadas:
  - instruccionesRuta: El listado de maniobras en texto (Gira a la derecha, Sigue recto 200m, etc.)
  - coordenadasRuta: Un listado gigante de puntos GPS (Latitud y Longitud) de toda la línea azul dibujada en el mapa, punto por punto.
  Cada vez que da una instrucción, suele venir con una propiedad llamada 'index' que nos indica en qué punto de la lista de coordenadas 
  se encuentra esa instrucción.*/

  /* Este 'if' realiza 2 comprobaciones de seguridad:
   - Verifica que la propiedad 'index' traiga un número asociado a la instrucción
   - Verifica que exista un punto en la lista de coordenadas con ese índice
   */
  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    // Si ambas comprobaciones son correctas, cogemos ese punto y movemos el mapa hacia él
    const punto = coordenadasRuta[instruccion.index];
    // panTo es una función de Leaflet que mueve el mapa a una posición determinada
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

  const destino = destinoInput.value.trim();  // Obtenemos el texto del destino
  const usarClic = clickMode.checked;         // Comprobamos si está activado el modo clic

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

    /*Este fragmento es el encargado de buscar el destino en Nominatim
    y obtener sus coordenadas. Para entender cómo funciona internamente, 
    hay que tener cuenta que Nominatim es un servicio de geocodificación que 
    nos devuelve un listado de coordenadas para una búsqueda dada, ya que el sistema
    no entiende de nombres de lugares. Por lo tanto, necesitamos convertir el nombre 
    del destino en coordenadas para poder calcular la ruta.*/
    try {
      /*Construimos la URL para hacer la petición a Nominatim. 
      format=json indica que queremos la respuesta en formato JSON.
      q=${encodeURIComponent(destino)} sirve para codificar el destino y que se pueda enviar por URL.
      limit=1 indica que queremos solo un resultado*/
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
      // Hacemos la petición a Nominatim y usamos await para obligar al programa a esperar la respuesta
      const geoRes = await fetch(geoUrl);
      // Convertimos la respuesta a JSON
      const geoData = await geoRes.json();

      // Si Nominatim no encuentra nada, nos lo dice y no seguimos
      if (geoData.length === 0) {
        estadoRuta.textContent = "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      // Si Nominatim encuentra algo, guardamos latitud, longitud y nombre del destino
      destLat = parseFloat(geoData[0].lat);    
      destLon = parseFloat(geoData[0].lon);     // parseFloat convierte el texto en número
      destNombre = geoData[0].display_name;     // Guardamos el nombre del destino

    } catch (error) {
      // Si falla la petición
      estadoRuta.textContent = "Error de conexión con los servicios de mapas.";
      console.error(error);
      return;
    }
  // Si no hay ni clic ni texto
  } else {
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  // Limpiamos una ruta anterior si existía
  limpiarRuta();

  // Informamos de que se está calculando la ruta
  estadoRuta.textContent = "Calculando ruta a pie...";

  /*Este fragmento es el verdadero cerebro de la nabegación. Teniendo ya las coordenadas
  de inicio y fin, llamamos a la librería Leaflet Routing Machine para que 
  trace la línea azul y redacte el "paso a paso".
  */

  // Llama a la herramienta principal de trazado de rutas
  controlRuta = L.Routing.control({
    // Waypoints: Son los puntos de inicio y fin de la ruta
    waypoints: [
      L.latLng(miLatitud, miLongitud),    // Coordenadas de inicio
      L.latLng(destLat, destLon)          // Coordenadas de destino
    ],
    // RouteWhileDragging: false: Indica que no queremos que se recalcule la ruta mientras arrastramos el control
    routeWhileDragging: false,
    // Es el motor que calcula la ruta. En este caso, usamos OSRM (Open Source Routing Machine)
    router: L.Routing.osrmv1({
      serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",  // URL del servidor OSRM
      profile: "foot"                                                       // Aquí indicamos que queremos una ruta a pie
    }),
    // LineOptions: Son las opciones de estilo de la línea de la ruta
    lineOptions: {
      // Color azul, grosor 5 y opacidad 0.85
      styles: [{ color: "#1f6feb", weight: 5, opacity: 0.85 }]
    },

    // createMarker: Función que crea clava 2 chinchetas en el mapa
    createMarker: function (i, waypoint) {
      // Borra la chincheta de inicio porque el usuario ya tiene marcadorUsuario
      if (i === 0) return null;

      // Creamos el marcador del destino
      return L.marker(waypoint.latLng).bindPopup(destNombre);
    },
    language: "es",           // Idioma de las instrucciones
    show: true,               // Muestra la ruta en el mapa
    collapsible: true,        // Permite ocultar la ruta
    fitSelectedRoutes: true   // Ajusta el mapa a la ruta
  }).addTo(mapa);

  /*Este fragmento se ejecuta cuando se encuentra la ruta correctamente.
  Lo que hace es guardar las instrucciones y coordenadas de la ruta para poder 
  navegar por ella*/
  controlRuta.on("routesfound", (e) => {
    // Cogemos la primera ruta encontrada
    const ruta = e.routes[0];

    // Guardamos instrucciones y coordenadas
    instruccionesRuta = ruta.instructions || []; // Si no hay instrucciones, guardamos un array vacío
    coordenadasRuta = ruta.coordinates || [];    // Si no hay coordenadas, guardamos un array vacío

    // Reiniciamos el índice del paso actual
    indicePasoActual = 0;

    // Este fragmento calcula la distancia y el tiempo de la ruta
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
// BOTON y PULSACIÓN DE ENTER PARA CALCULAR LA RUTA
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
// EVENTOS RECIBIDOS DESDE EL MANDO ACTUALMENTE DESHABILITADOS
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


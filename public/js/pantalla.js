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

// Elementos de AR
const btnAR = document.getElementById("btnAR");                 // Botón de activar/desactivar AR
const arContainer = document.getElementById("arContainer");     // Contenedor de AR
const arVideo = document.getElementById("arVideo");             // Video de la cámara
const arCanvas = document.getElementById("arCanvas");           // Canvas para dibujar sobre el video

const destinoInput = document.getElementById("destinoInput");   // Campo de texto del destino
const btnRuta = document.getElementById("btnRuta");             // Botón de calcular ruta
const clickMode = document.getElementById("clickMode");         // Checkbox para elegir destino haciendo clic
const estadoRuta = document.getElementById("estadoRuta");       // Texto del estado de la ruta

// Elementos del DOM de la barra lateral
const sidebar = document.getElementById("sidebar");             // Barra lateral
const menuToggle = document.getElementById("menuToggle");       // Botón de abrir barra lateral
const closeSidebar = document.getElementById("closeSidebar");   // Botón de cerrar barra lateral

// Eventos para abrir y cerrar la barra lateral

menuToggle.addEventListener("click", () => {
  sidebar.classList.add("visible");
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("visible");
});





// =========================
// MAPA
// =========================

// Inicializamos el mapa con la vista centrada en Madrid
const mapa = L.map("mapa").setView([40.4168, -3.7038], 15);

// Añadimos la capa base del mapa
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  }
).addTo(mapa);




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
let marcadorPasoActual = null; // Marcador visual (punto azul) del paso actual




// =========================
// AUTOAVANCE DE PASOS
// =========================

const DISTANCIA_CAMBIO_PASO = 18;      // Metros para pasar al siguiente paso
const DISTANCIA_LLEGADA_DESTINO = 12;  // Metros para considerar que hemos llegado
const RETARDO_CAMBIO_PASO_MS = 2500;   // Evita saltos demasiado seguidos

let ultimoCambioAutomatico = 0;
let rutaTerminada = false;




// =========================
// AJUSTES DE AR
// =========================

const DISTANCIA_MINIMA_OBJETIVO_AR = 12;
const DISTANCIA_ADELANTE_OBJETIVO_AR = 18;
const PUNTOS_VENTANA_BUSQUEDA_AR = 35;
const SUAVIZADO_RUMBO_OBJETIVO = 0.14;
const SUAVIZADO_ROTACION_FLECHA = 0.16;
const ZONA_MUERTA_RECTO_GRADOS = 12;

let rumboObjetivoSuavizado = null;
let anguloFlechaRenderizado = null;

let currentMode = "2D";




// =========================
// GPS DEL USUARIO
// =========================

// Comprueba si el navegador soporta geolocalización
if ("geolocation" in navigator) {
  // Empezamos a vigilar la posición del usuario
  navigator.geolocation.watchPosition(
    (pos) => {
      // Actualizamos las coordenadas actuales
      miLatitud = pos.coords.latitude;
      miLongitud = pos.coords.longitude;

      // Si no existe el marcador del usuario, lo creamos
      if (!marcadorUsuario) {
        mapa.setView([miLatitud, miLongitud], 16);

        // Creamos el marcador del usuario
        marcadorUsuario = L.marker([miLatitud, miLongitud])
          .addTo(mapa)              // Lo añadimos al mapa
          .bindPopup("Estás aquí")  // Le ponemos un popup
          .openPopup();             // Lo abrimos

        estadoRuta.textContent = "Ubicación obtenida. Ya puedes buscar una ruta.";
      } else {
        // Actualizamos la posición del marcador
        marcadorUsuario.setLatLng([miLatitud, miLongitud]);
      }

      // Actualizamos el paso automático
      actualizarPasoAutomatico();
    },
    (err) => {
      // Si hay un error, mostramos un mensaje
      estadoRuta.textContent =
        "No se pudo obtener el GPS. Permite el acceso a la ubicación.";
      console.error("Error GPS:", err);
    },
    {
      // Estas opciones son para mejorar la precisión del GPS
      enableHighAccuracy: true,  // Alta precisión
      maximumAge: 0,             // Sin caché
      timeout: 10000             // 10 segundos de timeout
    }
  );
// Si el navegador no soporta geolocalización
} else {
  estadoRuta.textContent = "Tu navegador no soporta geolocalización.";
}




// =========================
// SELECCIÓN DE DESTINO CON CLIC
// =========================

// Evento que se ejecuta cuando se hace clic en el mapa
mapa.on("click", (e) => {
  // Si no está activado el modo de clic, no hacemos nada
  if (!clickMode.checked) return;

  // Guardamos las coordenadas del clic
  destinoClickLat = e.latlng.lat;
  destinoClickLon = e.latlng.lng;

  // Si existe el marcador de destino, lo actualizamos
  if (marcadorDestino) {
    marcadorDestino.setLatLng(e.latlng);
  } else {
    // Si no existe, lo creamos
    marcadorDestino = L.marker(e.latlng, {
      icon: L.icon({
        // Los marcadores los sacamos de internet
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],   // Tamaño del icono
        iconAnchor: [12, 41]  // Punto de anclaje del icono
      })
    }).addTo(mapa);
  }

  // Mostramos el popup con las coordenadas del destino
  marcadorDestino
    .bindPopup(
      `Destino: ${destinoClickLat.toFixed(5)}, ${destinoClickLon.toFixed(5)}`
    )
    .openPopup();

  // Actualizamos el estado de la ruta
  estadoRuta.textContent =
    "Destino seleccionado en el mapa. Pulsa 'Buscar y calcular ruta'.";
});




// =========================
// FUNCIONES AUXILIARES (navegación y controles)
// =========================

// Función para limpiar la ruta
function limpiarRuta() {
  // Si existe el control de ruta, lo eliminamos
  if (controlRuta) {
    mapa.removeControl(controlRuta);
    controlRuta = null;
  }

  // Si existe el modo AR, lo desactivamos
  if (typeof ActivarDesactivarARMode === "function" && typeof isARMode !== "undefined" && isARMode) {
    ActivarDesactivarARMode();
  }

  // Si existe el botón AR, lo ocultamos
  if (btnAR) {
    btnAR.classList.add("oculto");
  }

  // Reseteamos las variables de la ruta
  instruccionesRuta = [];       // Array de instrucciones
  coordenadasRuta = [];         // Array de coordenadas
  indicePasoActual = -1;        // Índice del paso actual
  ultimoCambioAutomatico = 0;   // Momento del último cambio automático
  rutaTerminada = false;        // Estado de la ruta

  rumboObjetivoSuavizado = null;  // Rumbo objetivo suavizado
  anguloFlechaRenderizado = null; // Ángulo de la flecha renderizado

  // Actualizamos el estado de la ruta
  stepBox.textContent = "No hay una ruta activa.";
}

// Función para calcular la distancia en metros entre dos puntos usando la fórmula de Haversine
function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const aRadianes = (grados) => (grados * Math.PI) / 180;

  const dLat = aRadianes(lat2 - lat1);
  const dLon = aRadianes(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Función que devuelve el punto GPS asociado a una instrucción concreta
function obtenerPuntoDeInstruccion(indiceInstruccion) {
  if (
    indiceInstruccion < 0 ||
    indiceInstruccion >= instruccionesRuta.length
  ) {
    return null;
  }

  const instruccion = instruccionesRuta[indiceInstruccion];

  if (
    !instruccion ||
    typeof instruccion.index !== "number" ||
    !coordenadasRuta[instruccion.index]
  ) {
    return null;
  }

  return coordenadasRuta[instruccion.index];
}

// Función que cambia automáticamente al siguiente paso cuando te acercas al punto de maniobra
function actualizarPasoAutomatico() {
  if (
    rutaTerminada ||
    miLatitud === null ||
    miLongitud === null ||
    !instruccionesRuta.length ||
    !coordenadasRuta.length ||
    indicePasoActual < 0
  ) {
    return;
  }

  const ahora = Date.now();

  if (ahora - ultimoCambioAutomatico < RETARDO_CAMBIO_PASO_MS) {
    return;
  }

  const puntoFinal = coordenadasRuta[coordenadasRuta.length - 1];

  if (puntoFinal) {
    const distanciaFinal = distanciaEnMetros(
      miLatitud,
      miLongitud,
      puntoFinal.lat,
      puntoFinal.lng
    );

    if (distanciaFinal <= DISTANCIA_LLEGADA_DESTINO) {
      rutaTerminada = true;
      indicePasoActual = instruccionesRuta.length - 1;
      estadoRuta.textContent = "Has llegado al destino.";
      stepBox.textContent = "Has llegado al destino.";
      ultimoCambioAutomatico = ahora;
      return;
    }
  }

  let haAvanzado = false;

  while (indicePasoActual < instruccionesRuta.length - 1) {
    const siguienteIndice = indicePasoActual + 1;
    const puntoSiguiente = obtenerPuntoDeInstruccion(siguienteIndice);

    if (!puntoSiguiente) break;

    const distanciaSiguiente = distanciaEnMetros(
      miLatitud,
      miLongitud,
      puntoSiguiente.lat,
      puntoSiguiente.lng
    );

    if (distanciaSiguiente <= DISTANCIA_CAMBIO_PASO) {
      indicePasoActual = siguienteIndice;
      haAvanzado = true;
      ultimoCambioAutomatico = ahora;
    } else {
      break;
    }
  }

  if (haAvanzado) {
    mostrarPasoActual();
    estadoRuta.textContent = "Paso actualizado automáticamente.";
  }
}

// Función que muestra el paso actual
function mostrarPasoActual() {
  // Si no hay instrucciones, mostramos un mensaje
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No hay instrucciones disponibles para esta ruta.";
    return;
  }
  /* Esto de los indices se usa para que si por ejemplo estamos en el paso 2 
  y le damos a anterior, no se vaya al paso -1, sino que se quede en el 1*/

  // Si el índice se ha salido por abajo, lo ajustamos
  if (indicePasoActual < 0) {
    indicePasoActual = 0;
  }
  // Si el índice se ha salido por arriba, lo ajustamos
  if (indicePasoActual >= instruccionesRuta.length) {
    indicePasoActual = instruccionesRuta.length - 1;
  }

  // Cogemos la instrucción actual
  const instruccion = instruccionesRuta[indicePasoActual];

  // Mostramos el paso actual
  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}:<br><br>` +
    `<strong>${instruccion.text || "Sin texto disponible"}</strong><br><br>` +
    `Distancia aproximada: ${Math.round((instruccion.distance || 0))} m`;

  // Usamos innerHTML para que se interpreten los saltos de línea
  stepBox.innerHTML = textoPaso;

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
    // Ponemos un puntito rojo para que se vea donde está la instrucción
    if (marcadorPasoActual) {
        marcadorPasoActual.setLatLng([punto.lat, punto.lng]);
    } else {
        marcadorPasoActual = L.circleMarker([punto.lat, punto.lng], {
            color: 'white',           // Borde blanco
            weight: 5,                // Grosor del borde
            fillColor: 'red',         // Color rojo
            fillOpacity: 1,           // Opacidad total
            radius: 9                 // Tamaño del punto
        }).addTo(mapa);
    }
  }
}

// Función que avanza al siguiente paso
function siguientePaso() {
  // Si no hay instrucciones, mostramos un mensaje
  if (!instruccionesRuta.length) {
    stepBox.textContent =
      "No puedes avanzar pasos porque todavía no hay una ruta calculada.";
    return;
  }

  // Avanzamos al siguiente paso si no hemos llegado al final
  if (indicePasoActual < instruccionesRuta.length - 1) {
    indicePasoActual++;
  }

  // Mostramos el paso actual
  mostrarPasoActual();
}

// Función que retrocede al paso anterior
function pasoAnterior() {
  // Si no hay instrucciones, mostramos un mensaje
  if (!instruccionesRuta.length) {
    stepBox.textContent =
      "No puedes retroceder pasos porque todavía no hay una ruta calculada.";
    return;
  }

  // Retrocedemos al paso anterior si no hemos llegado al principio
  if (indicePasoActual > 0) {
    indicePasoActual--;
  }

  // Mostramos el paso actual
  mostrarPasoActual();
}

// Función que cambia entre modo 2D y 3D
function toggleModeVisual() {
  if (currentMode === "2D") {
    currentMode = "3D";
    document.body.classList.remove("modo-2d");
    document.body.classList.add("modo-3d");
  } else {
    currentMode = "2D";
    document.body.classList.remove("modo-3d");
    document.body.classList.add("modo-2d");
  }

  modeStatus.textContent = `Modo: ${currentMode}`;

  setTimeout(() => {
    mapa.invalidateSize();
  }, 450);
}

// Función para hacer zoom in
function zoomIn() {
    mapa.zoomIn();
}

// Función para hacer zoom out
function zoomOut() {
    mapa.zoomOut();
}

// Función que recentra el mapa en la posición actual
function recentrarMapa() {
  // Si la posición actual es conocida, movemos el mapa hacia ella
  if (miLatitud !== null && miLongitud !== null) {
    mapa.setView([miLatitud, miLongitud], 16);
    estadoRuta.textContent = "Mapa recentrado en tu posición.";
  } else {
    estadoRuta.textContent = "Todavía no se conoce tu posición actual.";
  }
}

// Función que elimina la ruta actual
function eliminarRuta() {
    // Si no hay ruta que se esté mostrando, avisamos
    if (!controlRuta) {
        stepBox.innerHTML = "No puedes eliminar la ruta porque todavía no hay una activa.";
        return;
    }

    // Usamos limpiarRuta() que quita la línea azul del mapa, el punto de paso y resetea las listas
    limpiarRuta();

    // Quitamos también la chincheta del destino si fue seleccionada con el ratón
    if (marcadorDestino) {
        mapa.removeLayer(marcadorDestino);
        marcadorDestino = null;
        destinoClickLat = null;
        destinoClickLon = null;
    }

    // Actualizamos el texto de la caja de información
    stepBox.innerHTML = "Ruta eliminada.";
    estadoRuta.textContent = "Ruta eliminada. Elige un nuevo destino.";
}

// Asignamos la funcionalidad a cada botón del panel lateral usando su atributo data-event
document.querySelectorAll(".btn-control").forEach(boton => {
    boton.addEventListener("click", () => {
        const evento = boton.getAttribute("data-event");

        switch (evento) {
            case "zoomIn":
                zoomIn();
                break;
            case "zoomOut":
                zoomOut();
                break;
            case "prevStep":
                pasoAnterior();
                break;
            case "nextStep":
                siguientePaso();
                break;
            case "toggleMode":
                toggleModeVisual();
                break;
            case "recenter":
                recentrarMapa();
                break;
            case "deleteRoute":
                eliminarRuta();
                break;
        }
    });
});




// =========================
// CÁLCULO DE RUTA
// =========================

// Función que calcula la ruta
async function calcularRuta() {
  // Si no se conoce la posición actual, se muestra un mensaje
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent = "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  const destino = destinoInput.value.trim();  // Obtenemos el destino del input
  const usarClic = clickMode.checked;         // Obtenemos si se está usando el modo clic

  // Variables para almacenar las coordenadas y el nombre del destino
  let destLat;
  let destLon;
  let destNombre;

  // Si se está usando el modo clic y se ha seleccionado un punto en el mapa, usamos ese punto
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
        estadoRuta.textContent =
          "No se encontró ese destino. Intenta ser más específico.";
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
  // Si no se ha escrito nada y no se ha usado el modo clic, se muestra un mensaje
  } else {
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  /*Llamamos a la función limpiarRuta() para eliminar cualquier ruta que pudiera estar mostrándose
  en el mapa. Esto es necesario para evitar conflictos entre rutas y asegurar que solo se muestre
  la ruta que se acaba de calcular.*/
  limpiarRuta();

  estadoRuta.textContent = "Calculando ruta a pie...";

  /*Creamos el control de ruta con Leaflet Routing Machine. 
  Le pasamos como parámetros los waypoints (punto de inicio y fin), 
  la URL del servicio de routing (OSRM en este caso), 
  el perfil de routing (a pie), 
  el idioma (español) y algunas opciones de visualización.*/
  controlRuta = L.Routing.control({
    waypoints: [
      L.latLng(miLatitud, miLongitud),   // Punto de inicio
      L.latLng(destLat, destLon)         // Punto de destino
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
    ultimoCambioAutomatico = 0;
    rutaTerminada = false;

    // Este fragmento calcula la distancia y el tiempo de la ruta
    const distKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const tiempoMin = Math.round(ruta.summary.totalTime / 60);

    // Mostramos el estado
    estadoRuta.textContent = `Ruta calculada: ${distKm} km, ~${tiempoMin} min a pie.`;

    // Activamos la opción de lanzar cámara AR
    btnAR.classList.remove("oculto");

    // Mostramos el primer paso
    mostrarPasoActual();
  });

  // Si falla el cálculo de la ruta
  controlRuta.on("routingerror", () => {
    estadoRuta.textContent = "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}




// =========================
// BOTÓN Y ENTER PARA CALCULAR LA RUTA
// =========================

// Evento que se ejecuta cuando se hace clic en el botón de calcular ruta
btnRuta.addEventListener("click", calcularRuta);

// Evento que se ejecuta cuando se presiona una tecla en el campo de destino
destinoInput.addEventListener("keydown", (e) => {
  // Si la tecla presionada es Enter, se calcula la ruta
  if (e.key === "Enter") {
    calcularRuta();
  }
});




// =========================
// MODO REALIDAD AUMENTADA
// =========================

let isARMode = false;       // Indica si estamos en modo AR
let videoStream = null;     // Stream de video de la cámara
let arAnimation = null;     // Animación de AR
let rumboActual = 0;        // Rumbo actual del usuario
let rumboSuavizado = 0;     // Rumbo suavizado del usuario




// =========================
// FUNCIONES DE ÁNGULOS Y RUMBO
// =========================

/* Función que calcula el rumbo entre dos puntos basandose en trigonometría.
Las fórmulas no entienden de grados, por lo que convertimos a radianes.
'x' e 'y' son los catetos del triángulo rectángulo que forman los dos puntos.
'brng' es el rumbo que queremos calcular. Al final convertimos de nuevo a grados.*/
function calcularRumbo(lat1, lon1, lat2, lon2) {
  const aRadianes = p => p * Math.PI / 180;         // Convierte grados a radianes
  const aGrados = p => p * 180 / Math.PI;           // Convierte radianes a grados

  const difLon = aRadianes(lon2 - lon1);            // Diferencia de longitud en radianes

  // Fórmula para calcular el rumbo
  /* Seno de la diferencia de longitud multiplicado por el coseno de la latitud del destino */
  const y = Math.sin(difLon) * Math.cos(aRadianes(lat2));
  /* Coseno de la latitud del origen multiplicado por el seno de la latitud del destino menos 
  el seno de la latitud del origen multiplicado por el coseno de la latitud del destino multiplicado 
  por el coseno de la diferencia de longitud */
  const x = Math.cos(aRadianes(lat1)) * Math.sin(aRadianes(lat2)) -
    Math.sin(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.cos(difLon);

  // Calcula el rumbo en radianes y lo convierte a grados
  let rumbo = aGrados(Math.atan2(y, x));

  // Asegura que el rumbo esté entre 0 y 360 grados
  return (rumbo + 360) % 360;
}

function normalizarAngulo(angulo) {
  return (angulo % 360 + 360) % 360;
}

function diferenciaAngular(a, b) {
  let diff = normalizarAngulo(a - b);
  if (diff > 180) diff -= 360;
  return diff;
}

function normalizarRadianes(angulo) {
  const dosPi = Math.PI * 2;
  return (angulo % dosPi + dosPi) % dosPi;
}

function diferenciaAngularRad(a, b) {
  let diff = normalizarRadianes(a - b);
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

function gradosARadianes(grados) {
  return (grados * Math.PI) / 180;
}

function limitar(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

function obtenerIndiceBaseAR() {
  if (
    indicePasoActual >= 0 &&
    instruccionesRuta &&
    instruccionesRuta[indicePasoActual] &&
    typeof instruccionesRuta[indicePasoActual].index === "number"
  ) {
    return instruccionesRuta[indicePasoActual].index;
  }

  return 0;
}

function obtenerIndiceMasCercanoEnVentana(indiceBase) {
  if (!coordenadasRuta || !coordenadasRuta.length) {
    return -1;
  }

  const ultimoIndice = coordenadasRuta.length - 1;
  const inicio = Math.max(0, indiceBase - 6);
  const fin = Math.min(ultimoIndice, indiceBase + PUNTOS_VENTANA_BUSQUEDA_AR);

  let mejorIndice = inicio;
  let mejorDistancia = Infinity;

  for (let i = inicio; i <= fin; i++) {
    const p = coordenadasRuta[i];
    if (!p) continue;

    const dist = distanciaEnMetros(miLatitud, miLongitud, p.lat, p.lng);
    if (dist < mejorDistancia) {
      mejorDistancia = dist;
      mejorIndice = i;
    }
  }

  return mejorIndice;
}

function obtenerObjetivoAR() {
  if (
    miLatitud === null ||
    miLongitud === null ||
    !coordenadasRuta ||
    !coordenadasRuta.length
  ) {
    return null;
  }

  const indiceBase = obtenerIndiceBaseAR();
  const indiceCercano = obtenerIndiceMasCercanoEnVentana(indiceBase);

  if (indiceCercano < 0) {
    return null;
  }

  const ultimoIndice = coordenadasRuta.length - 1;

  let distanciaAcumulada = 0;
  let indiceObjetivo = indiceCercano;

  for (let i = indiceCercano; i < ultimoIndice; i++) {
    const p1 = coordenadasRuta[i];
    const p2 = coordenadasRuta[i + 1];
    if (!p1 || !p2) continue;

    distanciaAcumulada += distanciaEnMetros(p1.lat, p1.lng, p2.lat, p2.lng);
    indiceObjetivo = i + 1;

    if (distanciaAcumulada >= DISTANCIA_ADELANTE_OBJETIVO_AR) {
      break;
    }
  }

  const objetivo = coordenadasRuta[indiceObjetivo];
  if (!objetivo) {
    return coordenadasRuta[ultimoIndice];
  }

  const distUsuarioObjetivo = distanciaEnMetros(
    miLatitud,
    miLongitud,
    objetivo.lat,
    objetivo.lng
  );

  if (distUsuarioObjetivo < DISTANCIA_MINIMA_OBJETIVO_AR) {
    return coordenadasRuta[Math.min(indiceObjetivo + 2, ultimoIndice)];
  }

  return objetivo;
}
 
// Función que maneja los eventos de orientación del dispositivo
/*Su funcion es capturar la orientación del dispositivo y guardarla en la variable rumboActual*/
// Variable para suavizar la rotación (Filtro paso bajo)
function handleOrientation(event) {
  // Variable temporal para el cálculo
  let rumboCrudo = null;

  // Si el dispositivo es iOS, usamos webkitCompassHeading para capturar la orientación
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    rumboCrudo = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    // Si la orientación es absoluta usamos 360 - alpha para invertir el giro
    if (event.absolute) {
      rumboCrudo = 360 - event.alpha;
    } else {
      // Si no es un compás absoluto, simplemente guardamos alpha mitigado
      rumboCrudo = 360 - event.alpha;
    }
  }

  // Aplicar un filtro paso bajo para evitar temblores excesivos y movimientos erráticos
  if (rumboCrudo !== null) {
    // Si la diferencia es muy grande (ej cruzando de 359 a 0), evitamos el salto brusco
    let diff = rumboCrudo - rumboSuavizado;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Ajusta este valor (0.1) si quieres que sea más lento o rápido el movimiento. 
    // 0.1 es muy suave (lento), 0.5 es más rápido pero con algo de temblor
    rumboSuavizado += diff * 0.08;

    // Normalizamos para no mantener valores gigantescos
    if (rumboSuavizado < 0) rumboSuavizado += 360;
    if (rumboSuavizado >= 360) rumboSuavizado -= 360;

    rumboActual = rumboSuavizado;
  }
}

// =========================
// DIBUJADO DEL AR
// =========================

//Función que dibuja el frame de AR
/*Su función es dibujar en la pantalla las imágenes para que se vean fluidas sobre el video
de la cámara*/
function drawARFrame() {
  //Si no estamos en modo AR, no hacemos nada
  if (!isARMode) return;

  //Si el canvas no tiene el tamaño de la pantalla, lo redimensionamos
  if (arCanvas.width !== window.innerWidth || arCanvas.height !== window.innerHeight) {
    arCanvas.width = window.innerWidth;
    arCanvas.height = window.innerHeight;
  }

  //Obtenemos el contexto 2D del canvas
  const ctx = arCanvas.getContext("2d");
  /*Limpia el canvas para dibujar el siguiente frame.
  Los parámetros son: x(representa la posición horizontal), 
  y(representa la posición vertical), 
  ancho(representa el ancho del canvas), alto(representa el alto del canvas)*/
  ctx.clearRect(0, 0, arCanvas.width, arCanvas.height);

  //Si tenemos latitud y longitud y coordenadas de la ruta
  if (miLatitud !== null && miLongitud !== null && coordenadasRuta && coordenadasRuta.length > 0) {
    //Obtenemos el objetivo AR
    const objetivoPaso = obtenerObjetivoAR();

    //Si tenemos un objetivo
    if (objetivoPaso) {
      //Calculamos el rumbo al objetivo
      const rumboObjetivoCrudo = calcularRumbo(miLatitud, miLongitud, objetivoPaso.lat, objetivoPaso.lng);

      if (rumboObjetivoSuavizado === null) {
        rumboObjetivoSuavizado = rumboObjetivoCrudo;
      } else {
        const diffObjetivo = diferenciaAngular(rumboObjetivoCrudo, rumboObjetivoSuavizado);

        rumboObjetivoSuavizado = normalizarAngulo(rumboObjetivoSuavizado + diffObjetivo * SUAVIZADO_RUMBO_OBJETIVO);
      }

      let anguloRelativo = diferenciaAngular(rumboObjetivoSuavizado, rumboActual);

      if (Math.abs(anguloRelativo) < ZONA_MUERTA_RECTO_GRADOS) {
        anguloRelativo = 0;
      }

      const anguloObjetivoRad = gradosARadianes(limitar(anguloRelativo, -170, 170));

      if (anguloFlechaRenderizado === null) {
        anguloFlechaRenderizado = anguloObjetivoRad;
      } else {
        const diffRot = diferenciaAngularRad(anguloObjetivoRad, anguloFlechaRenderizado);

        anguloFlechaRenderizado = normalizarRadianes(anguloFlechaRenderizado + diffRot * SUAVIZADO_ROTACION_FLECHA);
      }

      const cx = arCanvas.width / 2;
      const cy = arCanvas.height / 2;
      const escala = window.innerWidth < 600 ? 1.05 : 1.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(anguloFlechaRenderizado);

      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;

      ctx.beginPath();
      ctx.moveTo(0, -90 * escala);
      ctx.lineTo(60 * escala, 0);
      ctx.lineTo(25 * escala, 0);
      ctx.lineTo(25 * escala, 90 * escala);
      ctx.lineTo(-25 * escala, 90 * escala);
      ctx.lineTo(-25 * escala, 0);
      ctx.lineTo(-60 * escala, 0);
      ctx.closePath();

      ctx.fillStyle = "rgba(0, 102, 255, 0.88)";
      ctx.fill();

      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.stroke();

      ctx.restore();
    }
  }

  arAnimation = requestAnimationFrame(drawARFrame);
}




// =========================
// ACTIVAR / DESACTIVAR AR
// =========================

//Función que activa o desactiva el modo AR
/*Su función es activar o desactivar el modo AR, que permite ver la cámara del dispositivo
con una flecha que indica la dirección de la ruta*/
async function ActivarDesactivarARMode() {
  //Si estamos en modo AR, lo desactivamos
  if (isARMode) {
    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    document.body.classList.remove("modo-ar");   //Elimina la clase modo-ar del body
    arContainer.classList.add("oculto");         //Oculta el contenedor AR

    rumboObjetivoSuavizado = null;               //Reinicia el rumbo objetivo suavizado
    anguloFlechaRenderizado = null;              //Reinicia el ángulo de la flecha

    //Detiene el video de la cámara
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());  //track.stop() detiene la cámara
      videoStream = null;
    }

    //Cancela la animación
    if (arAnimation) {
      cancelAnimationFrame(arAnimation);
      arAnimation = null;
    }
    // Quitamos los event listeners de la brújula
    // deviceorientationabsolute: apunta al Norte real del planeta como una brújula de verdad.
    // deviceorientation: el norte es simplemente la dirección hacia la que apunta el teléfono cuando abres la página.
    window.removeEventListener("deviceorientationabsolute", handleOrientation);
    window.removeEventListener("deviceorientation", handleOrientation);

    // Forzamos que el mapa se redimensione correctamente. El 500 indica que se espere 500 milisegundos antes de redimensionar el mapa
    setTimeout(() => {mapa.invalidateSize();}, 500);

  //Si no estamos en modo AR, lo activamos
  } else {
    //Comprueba si el dispositivo soporta la API de orientación del dispositivo
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        //Solicita permiso para acceder a la brújula
        const permissionState = await DeviceOrientationEvent.requestPermission();

        //Si el permiso no es concedido, muestra una alerta
        if (permissionState !== "granted") {
          alert(
            "Necesitamos acceso a la brújula para que la flecha gire correctamente."
          );
          return;
        }
      //Si ocurre un error al pedir permisos, muestra una alerta
      } catch (error) {
        console.error("Error al pedir permisos de brújula", error);
        alert("Ocurrió un error al acceder a la brújula.");
        return;
      }
    }

    //Intenta acceder a la cámara trasera del dispositivo
    try {
      //Obtenemos el stream de video. Con 'environment' accedemos a la cámara trasera
      videoStream = await navigator.mediaDevices.getUserMedia({video: { facingMode: "environment" }});

      //Asignamos el flujo de video al elemento de video
      arVideo.srcObject = videoStream;
      arVideo.play().catch((e) => {
        console.warn("Autoplay evitado por el navegador", e);
      });

      //Actualizamos variables y estilos
      isARMode = true;
      btnAR.textContent = "Desactivar AR";

      //Reiniciamos valores de rumbo y ángulo
      rumboObjetivoSuavizado = null;
      anguloFlechaRenderizado = null;

      //Mostramos el contenedor AR y añadimos la clase modo-ar al body
      arContainer.classList.remove("oculto");
      document.body.classList.add("modo-ar");

      //Añadimos los event listeners para la brújula
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);

      //Dibujamos el frame AR
      drawARFrame();

      //Forzamos que el mapa se redimensione correctamente
      setTimeout(() => {mapa.invalidateSize();}, 500);
    
    //Si ocurre un error al acceder a la cámara, muestra una alerta
    } catch (error) {
      console.error("No se pudo acceder a la cámara:", error);
      alert("Error cámara: " + error.name + " - " + error.message);
    }
  }
}

//Añadimos el event listener al botón AR
btnAR.addEventListener("click", ActivarDesactivarARMode);




// =========================
// VISIBILIDAD DE LA PESTAÑA
// =========================

//Función que se ejecuta cuando la pestaña cambia de visibilidad
document.addEventListener("visibilitychange", () => {
  //Si la pestaña está oculta y estamos en modo AR, lo desactivamos
  if (document.hidden && isARMode) {
    //Detenemos el stream de video
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }

    //Pausamos el video
    arVideo.pause();
    arVideo.srcObject = null;

    //Cancelamos la animación
    if (arAnimation) {
      cancelAnimationFrame(arAnimation);
      arAnimation = null;
    }

    //Reiniciamos valores de rumbo y ángulo
    rumboObjetivoSuavizado = null;
    anguloFlechaRenderizado = null;

    //Reiniciamos variables y estilos
    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    document.body.classList.remove("modo-ar");
    arContainer.classList.add("oculto");
  }
});
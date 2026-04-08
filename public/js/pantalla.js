// La lógica de conexión, perfil y multiusuario vive en pantalla_multiusuario.js
// =========================
// ELEMENTOS DEL DOM
// =========================

// Elementos de AR
const btnAR = document.getElementById("btnAR");                 // Botón de activar/desactivar AR
const contenedorAR = document.getElementById("contenedorAR");     // Contenedor de AR
const videoAR = document.getElementById("videoAR");             // Video de la cámara
const canvasAR = document.getElementById("canvasAR");           // Canvas para dibujar sobre el video

const inputDestino = document.getElementById("inputDestino");   // Campo de texto del destino
const btnRuta = document.getElementById("btnRuta");             // Botón de calcular ruta
const modoClic = document.getElementById("modoClic");         // Checkbox para elegir destino haciendo clic
const modoCompartirUbicacion = document.getElementById("modoCompartirUbicacion"); // Checkbox para compartir ubicación
const modoContadorPasos = document.getElementById("modoContadorPasos");
const resumenContadorRuta = document.getElementById("resumenContadorRuta");
const actividadTotales = document.getElementById("actividadTotales");
const actividadHistorial = document.getElementById("actividadHistorial");
const botonesFiltroActividad = document.querySelectorAll(".btn-filtro-actividad");
const sugerenciasDestino = document.getElementById("sugerenciasDestino");
const estadoRuta = document.getElementById("estadoRuta");       // Texto del estado de la ruta

// Elementos del DOM del menú de pantalla completa
const menuOpciones = document.getElementById("menuOpciones");     // Menú de pantalla completa
const btnMenuToggle = document.getElementById("btnMenuToggle");       // Botón avatar para abrir menú
const cerrarMenuOpciones = document.getElementById("cerrarMenuOpciones");   // Botón de cerrar menú
const avatarMenu = document.getElementById("avatarMenu");               // Avatar grande del menú
const nombreMenu = document.getElementById("nombreMenu");                   // Nombre en el menú
const btnAvatarIcon = document.getElementById("btnAvatarIcon");       // Avatar pequeño en la barra flotante

// Actualizar el avatar del botón flotante con el del usuario
if (btnAvatarIcon) {
  btnAvatarIcon.src = miAvatar;
}

/* Sincroniza el interruptor "Compartir":
   - Actualiza el botón visual de compartir en la tarjeta.
   - Emite ubicación/ruta al activar y deja de compartir al desactivar. */
modoCompartirUbicacion.addEventListener("change", () => {
  const btnCompartir = document.getElementById("compartirTarjetaRuta");
  if (btnCompartir) {
    if (modoCompartirUbicacion.checked) {
      btnCompartir.classList.add("active");
      btnCompartir.innerHTML = '<span class="material-symbols-outlined">share</span> Compartiendo';
    } else {
      btnCompartir.classList.remove("active");
      btnCompartir.innerHTML = '<span class="material-symbols-outlined">share</span> Compartir';
    }
  }

  if (modoCompartirUbicacion.checked) {
    if (miLatitud !== null && miLongitud !== null) {
      socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
    }
    if (coordenadasRuta.length > 0) {
      socket.emit("shareRoute", coordenadasRuta);
    }
  } else {
    socket.emit("stopSharing");
  }
});

if (modoClic) {
  modoClic.addEventListener("change", () => {
    if (modoClic.checked) {
      // El menú tapa el mapa: cerramos para que el toque llegue al mapa.
      if (menuOpciones) {
        menuOpciones.classList.add("oculto");
      }
      estadoRuta.textContent = "Modo clic activado. Toca el mapa para seleccionar el destino.";
      return;
    }
    estadoRuta.textContent = "Modo clic desactivado. Puedes escribir destino en el buscador.";
  });
}

// Abre el menú a pantalla completa y refresca datos visibles del usuario.
btnMenuToggle.addEventListener("click", () => {
  avatarMenu.src = miAvatar;
  nombreMenu.textContent = miNombre;
  btnAvatarIcon.src = miAvatar;
  menuOpciones.classList.remove("oculto");
  cargarActividad(periodoActividadActual);
});

// Cerrar menú de pantalla completa
cerrarMenuOpciones.addEventListener("click", () => {
  menuOpciones.classList.add("oculto");
});




// =========================
// TARJETA INFERIOR DE RUTA
// =========================

const tarjetaRuta = document.getElementById("tarjetaRuta");
const tiempoTarjetaRuta = document.getElementById("tiempoTarjetaRuta");
const distanciaTarjetaRuta = document.getElementById("distanciaTarjetaRuta");
const pasoTarjetaRuta = document.getElementById("pasoTarjetaRuta");
const panelPasoAR = document.getElementById("panelPasoAR");
const cerrarTarjetaRuta = document.getElementById("cerrarTarjetaRuta");
const compartirTarjetaRuta = document.getElementById("compartirTarjetaRuta");
const btnARTarjetaRuta = document.getElementById("btnARTarjetaRuta");
const irTarjetaRuta = document.getElementById("irTarjetaRuta");

function actualizarBotonIrCancelar() {
  if (!irTarjetaRuta) return;
  if (navegacionIniciada) {
    irTarjetaRuta.classList.add("tarjeta-ruta-btn-cancel");
    irTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">close</span> Cancelar ruta';
  } else {
    irTarjetaRuta.classList.remove("tarjeta-ruta-btn-cancel");
    irTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">navigation</span> Ir';
  }
}

function mostrarTarjetaRuta(distanciaKm, tiempoFormateado) {
  tiempoTarjetaRuta.textContent = tiempoFormateado;
  distanciaTarjetaRuta.textContent = `${distanciaKm} km`;
  pasoTarjetaRuta.textContent = "Ruta lista. Pulsa Ir para empezar la navegación.";

  if (modoCompartirUbicacion.checked) {
    compartirTarjetaRuta.classList.add("active");
    compartirTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">share</span> Compartiendo';
  } else {
    compartirTarjetaRuta.classList.remove("active");
    compartirTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">share</span> Compartir';
  }

  tarjetaRuta.classList.remove("oculto");
  document.body.classList.add("tarjeta-ruta-visible");
  actualizarBotonIrCancelar();
}

function ocultarTarjetaRuta() {
  tarjetaRuta.classList.add("oculto");
  document.body.classList.remove("tarjeta-ruta-visible");
  compartirTarjetaRuta.classList.remove("active");
}

// Cerrar tarjeta de ruta → elimina la ruta
cerrarTarjetaRuta.addEventListener("click", () => {
  eliminarRuta();
});

// Compartir desde la tarjeta
compartirTarjetaRuta.addEventListener("click", () => {
    modoCompartirUbicacion.checked = !modoCompartirUbicacion.checked;
    modoCompartirUbicacion.dispatchEvent(new Event("change"));
});

// AR desde la tarjeta
btnARTarjetaRuta.addEventListener("click", () => {
  if (typeof activarDesactivarAR === "function") {
    activarDesactivarAR();
  }
});

// Alterna entre "Ir" y "Cancelar ruta" según el estado actual de navegación.
irTarjetaRuta.addEventListener("click", () => {
  if (!instruccionesRuta.length) return;
  if (navegacionIniciada) {
    eliminarRuta();
    return;
  }
  navegacionIniciada = true;
  actualizarBotonIrCancelar();
  indicePasoActual = 0;
  if (modoContadorPasos && modoContadorPasos.checked) {
    iniciarSesionContadorRuta();
  }
  mostrarPasoActual();
  actualizarPasoTarjetaRuta();
});

function actualizarPasoTarjetaRuta() {
  if (!instruccionesRuta.length || indicePasoActual < 0) return;
  const instruccion = instruccionesRuta[indicePasoActual];
  const textoInstruccion = traducirInstruccionRuta(instruccion.text || "");
  pasoTarjetaRuta.innerHTML = `<strong>Paso ${indicePasoActual + 1}/${instruccionesRuta.length}</strong>: ${textoInstruccion} (~${Math.round(instruccion.distance || 0)} m)`;
  actualizarPanelPasoAR();
}




// =========================
// MAPA
// =========================

// Definición de las capas base (Temas)
// Capa base clara
const capaClara = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
);

// Capa base oscura
const capaOscura = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
);

// Capa base satélite
const capaSatelite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' }
);

// Agrupamos las opciones en un objeto para el selector de Leaflet
const temas = {
  "Modo Claro": capaClara,
  "Modo Oscuro": capaOscura,
  "Satélite": capaSatelite
};

// Inicializamos el mapa y fijamos el Tema Claro por defecto
const mapa = L.map("mapa", {
  center: [40.4168, -3.7038],
  zoom: 15,
  layers: [capaClara],
  zoomControl: false
});

let ultimoUpdateVista3D = 0;
let pausaAutoCentrado3DHasta = 0;
let pausaAutoCentrado2DHasta = 0;
let map3DController = null;

function pausarAutoCentrado(milisegundos = 6000) {
  const hasta = Date.now() + milisegundos;
  pausaAutoCentrado2DHasta = hasta;
  pausaAutoCentrado3DHasta = Math.max(pausaAutoCentrado3DHasta, hasta);
}

function obtenerControladorMapa3D() {
  if (map3DController || typeof crearControladorMapa3D !== "function") return map3DController;
  map3DController = crearControladorMapa3D({
    leafletMap: mapa,
    obtenerModo: () => modoActual,
    obtenerPosicion: () => ({ lat: miLatitud, lng: miLongitud }),
    obtenerDestino: () => ({ lat: destinoClickLat, lng: destinoClickLon }),
    obtenerCoordenadasRuta: () => coordenadasRuta,
    obtenerSiguientePuntoReferencia: () => obtenerPuntoDeInstruccion(indicePasoActual + 1) || obtenerPuntoDeInstruccion(indicePasoActual),
    calcularRumboObjetivo: (lat1, lng1, lat2, lng2) => calcularRumbo(lat1, lng1, lat2, lng2),
    alSeleccionarDestino: (lat, lng) => seleccionarDestinoEnMapa(lat, lng),
    alInteractuarUsuarioConMapa: (ms) => pausarAutoCentrado(ms)
  });
  return map3DController;
}

function inicializarMapa3D() {
  const controlador = obtenerControladorMapa3D();
  if (controlador) controlador.inicializar();
}

function sincronizarMapa3D() {
  const controlador = obtenerControladorMapa3D();
  if (controlador) controlador.sincronizar();
}






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
let navegacionIniciada = false; // Se activa al pulsar "Ir"
let periodoActividadActual = "day";

let sesionPasosActiva = false;
let sesionPasosGuardada = false;
let pasosSesionActual = 0;
let caloriasSesionActual = 0;
let distanciaSesionMetros = 0;
let posicionAnteriorSesion = null;
let inicioSesionISO = null;
let destinoSesionNombre = "";




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

let rumboObjetivoSuavizado = null;
let anguloFlechaRenderizado = null;

let modoActual = "2D";

function actualizarVista3D() {
  if (modoActual !== "3D") return;
  inicializarMapa3D();
  const controlador = obtenerControladorMapa3D();
  if (!controlador || miLatitud === null || miLongitud === null) return;
  if (Date.now() < pausaAutoCentrado3DHasta) return;
  const ahora = Date.now();
  if (ahora - ultimoUpdateVista3D < 900) return;
  ultimoUpdateVista3D = ahora;
  controlador.actualizarVista();
}

// Si el usuario manipula el mapa 2D, pausamos auto-centrado temporalmente.
mapa.on("movestart", () => pausarAutoCentrado(6000));
mapa.on("zoomstart", () => pausarAutoCentrado(6000));


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

      // Compartir ubicación si está activado
      if (modoCompartirUbicacion.checked) {
        socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
      }

      actualizarContadorRutaConGPS();
      sincronizarMapa3D();
      actualizarVista3D();

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

function seleccionarDestinoEnMapa(lat, lng) {
  // Si no está activado el modo de clic, no hacemos nada
  if (!modoClic.checked) return;
  // Mientras estás en navegación ("Ir"), no dejamos recalcular por clic.
  if (navegacionIniciada) {
    estadoRuta.textContent = "Ya estás en navegación. Cancela la ruta actual para elegir otro destino.";
    return;
  }

  // Guardamos las coordenadas del clic
  destinoClickLat = lat;
  destinoClickLon = lng;
  const latlngLeaflet = L.latLng(destinoClickLat, destinoClickLon);

  // Si existe el marcador de destino, lo actualizamos
  if (marcadorDestino) {
    marcadorDestino.setLatLng(latlngLeaflet);
  } else {
    // Si no existe, lo creamos
    marcadorDestino = L.marker(latlngLeaflet, {
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
    "Destino seleccionado en el mapa. Calculando ruta...";

  sincronizarMapa3D();

  // En modo clic, lanzar el cálculo automáticamente para mostrar la tarjeta con "Ir".
  calcularRuta();
}

// Evento que se ejecuta cuando se hace clic en el mapa
mapa.on("click", (e) => {
  if (!e || !e.latlng) return;
  seleccionarDestinoEnMapa(e.latlng.lat, e.latlng.lng);
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
  if (typeof activarDesactivarAR === "function" && typeof isARMode !== "undefined" && isARMode) {
    activarDesactivarAR();
  }

  // Si existe el botón AR, lo ocultamos
  if (btnAR) {
    btnAR.classList.add("oculto");
  }

  // Ocultamos la tarjeta de ruta
  ocultarTarjetaRuta();

  // Si existe el marcador del paso actual, lo eliminamos
  if (marcadorPasoActual) {
    mapa.removeLayer(marcadorPasoActual);
    marcadorPasoActual = null;
  }

  // Reseteamos las variables de la ruta
  instruccionesRuta = [];       // Array de instrucciones
  coordenadasRuta = [];         // Array de coordenadas
  indicePasoActual = -1;        // Índice del paso actual
  navegacionIniciada = false;
  actualizarBotonIrCancelar();
  ultimoCambioAutomatico = 0;   // Momento del último cambio automático
  rutaTerminada = false;        // Estado de la ruta

  rumboObjetivoSuavizado = null;  // Rumbo objetivo suavizado
  anguloFlechaRenderizado = null; // Ángulo de la flecha renderizado
  sesionPasosActiva = false;
  sesionPasosGuardada = false;
  posicionAnteriorSesion = null;
  inicioSesionISO = null;
  destinoSesionNombre = "";
  if (modoContadorPasos && modoContadorPasos.checked) {
    actualizarResumenContadorRuta();
  }

  // Actualizamos el estado de la ruta
  cajaPasos.textContent = "No hay una ruta activa.";
  if (panelPasoAR) {
    panelPasoAR.classList.add("oculto");
  }
  miETA = null;
  // Si estamos compartiendo posición, actualizamos que ya no tenemos ETA
  if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
    socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
  }
  sincronizarMapa3D();
}

// Función para calcular la distancia en metros entre dos puntos usando la fórmula de Haversine
function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const aRadianes = (grados) => (grados * Math.PI) / 180;  // Convierte grados a radianes

  const dLat = aRadianes(lat2 - lat1);    // Diferencia de latitud en radianes
  const dLon = aRadianes(lon2 - lon1);    // Diferencia de longitud en radianes

  // Fórmula de Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  // Distancia en metros
  const contacto = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * contacto;    // Devuelve el producto del radio de la Tierra y el ángulo central en radianes
}

// Devuelve el punto de la geometría asociado a una instrucción de maniobra.
function obtenerPuntoDeInstruccion(indiceInstruccion) {
  // Si el índice está fuera de rango, devolvemos null
  if (indiceInstruccion < 0 || indiceInstruccion >= instruccionesRuta.length) {
    return null;
  }

  // Obtenemos la instrucción
  const instruccion = instruccionesRuta[indiceInstruccion];

  // Si la instrucción no es válida, devolvemos null
  if (!instruccion || typeof instruccion.index !== "number" || !coordenadasRuta[instruccion.index]) {
    return null;
  }

  // Devolvemos el punto GPS asociado a la instrucción
  return coordenadasRuta[instruccion.index];
}

// Función que cambia automáticamente al siguiente paso cuando te acercas al punto de maniobra
function actualizarPasoAutomatico() {
  // Si la ruta ha terminado o no hay datos, no hacemos nada
  if (rutaTerminada || miLatitud === null || miLongitud === null || !instruccionesRuta.length || !coordenadasRuta.length || indicePasoActual < 0) {
    return;
  }

  // Obtenemos el tiempo actual
  const ahora = Date.now();

  // Esto es para que la instrucción no cambie cada milisegundo y evitar parpadeos por culpa del GPS
  if (ahora - ultimoCambioAutomatico < RETARDO_CAMBIO_PASO_MS) {
    return;
  }

  // Obtenemos el punto final de la ruta
  const puntoFinal = coordenadasRuta[coordenadasRuta.length - 1];

  // Si el punto final existe, calculamos la distancia al destino con la función distanciaEnMetros
  if (puntoFinal) {
    const distanciaFinal = distanciaEnMetros(miLatitud, miLongitud, puntoFinal.lat, puntoFinal.lng);

    // Si estamos cerca del destino, terminamos la ruta
    if (distanciaFinal <= DISTANCIA_LLEGADA_DESTINO) {
      rutaTerminada = true;
      indicePasoActual = instruccionesRuta.length - 1;    // Actualizamos el índice del paso actual
      estadoRuta.textContent = "Has llegado al destino.";
      cajaPasos.textContent = "Has llegado al destino.";
      if (sesionPasosActiva && modoContadorPasos && modoContadorPasos.checked) {
        guardarActividadRuta();
        sesionPasosActiva = false;
      }
      ultimoCambioAutomatico = ahora;                     // Actualizamos el tiempo del último cambio automático
      return;
    }
  }

  let haAvanzado = false;                                // Variable para indicar si hemos avanzado al siguiente paso

  // Mientras no hayamos llegado al final de la ruta
  while (indicePasoActual < instruccionesRuta.length - 1) {
    // Obtenemos el siguiente índice y el punto siguiente
    const siguienteIndice = indicePasoActual + 1;
    const puntoSiguiente = obtenerPuntoDeInstruccion(siguienteIndice);

    // Si el punto siguiente no existe, salimos del bucle
    if (!puntoSiguiente) break;

    // Calculamos la distancia al siguiente punto
    const distanciaSiguiente = distanciaEnMetros(miLatitud, miLongitud, puntoSiguiente.lat, puntoSiguiente.lng);

    // Si estamos cerca del siguiente punto, avanzamos al siguiente paso
    if (distanciaSiguiente <= DISTANCIA_CAMBIO_PASO) {
      indicePasoActual = siguienteIndice;  // Actualizamos el índice del paso actual
      haAvanzado = true;                   // Indicamos que hemos avanzado al siguiente paso
      ultimoCambioAutomatico = ahora;      // Actualizamos el tiempo del último cambio automático
      // Si hemos avanzado, salimos del bucle
    } else {
      break;                               // Si no estamos cerca del siguiente punto, salimos del bucle
    }
  }

  // Si hemos avanzado, mostramos el paso actual
  if (haAvanzado) {
    mostrarPasoActual();
    estadoRuta.textContent = "Paso actualizado automáticamente.";
  }
}

// Función que muestra el paso actual
function mostrarPasoActual() {
  // Si no hay instrucciones, mostramos un mensaje
  if (!instruccionesRuta.length) {
    cajaPasos.textContent = "No hay instrucciones disponibles para esta ruta.";
    return;
  }
  // Acotamos el índice para no salir del rango de instrucciones.

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
  const textoInstruccion = traducirInstruccionRuta(instruccion.text || "");

  // Mostramos el paso actual
  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}:<br><br>` +
    `<strong>${textoInstruccion}</strong><br><br>` +
    `Distancia aproximada: ${Math.round((instruccion.distance || 0))} m`;

  // Usamos innerHTML para que se interpreten los saltos de línea
  cajaPasos.innerHTML = textoPaso;
  actualizarPanelPasoAR();
  actualizarVista3D();

  // Centramos en el punto de maniobra (o en usuario real si estamos en AR).
  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    // Si ambas comprobaciones son correctas, cogemos ese punto
    const punto = coordenadasRuta[instruccion.index];
    // En AR priorizamos el centro en la posición real del usuario para evitar descentrados.
    if (Date.now() >= pausaAutoCentrado2DHasta) {
      if (typeof isARMode !== "undefined" && isARMode && miLatitud !== null && miLongitud !== null) {
        mapa.panTo([miLatitud, miLongitud]);
      } else {
        // En modo normal centramos la instrucción actual.
        mapa.panTo([punto.lat, punto.lng]);
      }
    }
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


// Función que cambia entre modo 2D y 3D
function alternarModoVisual() {
  if (modoActual === "2D") {
    modoActual = "3D";
    inicializarMapa3D();
    document.body.classList.remove("modo-2d");
    document.body.classList.add("modo-3d");
    sincronizarMapa3D();
    actualizarVista3D();
  } else {
    modoActual = "2D";
    document.body.classList.remove("modo-3d");
    document.body.classList.add("modo-2d");
    const controlador = obtenerControladorMapa3D();
    const c = controlador ? controlador.obtenerCentroYZoom() : null;
    if (c) {
      mapa.setView([c.lat, c.lng], c.zoom, { animate: false });
    }
  }

  estadoModo.textContent = `Modo: ${modoActual}`;

  setTimeout(() => {
    mapa.invalidateSize();
    const controlador = obtenerControladorMapa3D();
    if (controlador) controlador.redimensionar();
  }, 450);
}

// Función para hacer zoom in
function acercarZoom() {
    const controlador = obtenerControladorMapa3D();
    if (modoActual === "3D" && controlador) controlador.acercarZoom();
    else mapa.zoomIn();
}

// Función para hacer zoom out
function alejarZoom() {
    const controlador = obtenerControladorMapa3D();
    if (modoActual === "3D" && controlador) controlador.alejarZoom();
    else mapa.zoomOut();
}

// Gestión personalizada de las capas de mapa
let indiceCapaActual = 0;
// Deben coincidir con las definidas arriba (capaClara, capaOscura, capaSatelite)
const listaCapasArray = [capaClara, capaOscura, capaSatelite]; 

//Función que cambia entre capas
function cambiarCapa() {
  // Retira la que haya puesta
  mapa.removeLayer(listaCapasArray[indiceCapaActual]);
  
  // Salta a la siguiente (0 -> 1 -> 2 -> 0)
  indiceCapaActual = (indiceCapaActual + 1) % listaCapasArray.length;
  
  // Y la añade al mapa
  mapa.addLayer(listaCapasArray[indiceCapaActual]);
}


// Función que recentra el mapa en la posición actual
function recentrarMapa() {
  // Si la posición actual es conocida, movemos el mapa hacia ella
  if (miLatitud !== null && miLongitud !== null) {
    if (modoActual === "3D") {
      inicializarMapa3D();
      const controlador = obtenerControladorMapa3D();
      if (controlador) controlador.recentrar(miLatitud, miLongitud);
    } else {
      mapa.setView([miLatitud, miLongitud], 16);
    }
    estadoRuta.textContent = "Mapa recentrado en tu posición.";
  } else {
    estadoRuta.textContent = "Todavía no se conoce tu posición actual.";
  }
}

// Función que elimina la ruta actual
function eliminarRuta() {
    // Si no hay ruta que se esté mostrando, avisamos
    if (!controlRuta) {
        cajaPasos.innerHTML = "No puedes eliminar la ruta porque todavía no hay una activa.";
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
    cajaPasos.innerHTML = "Ruta eliminada.";
    estadoRuta.textContent = "Ruta eliminada. Elige un nuevo destino.";
    sincronizarMapa3D();
}

// Asignamos la funcionalidad a cada botón del menú usando su atributo data-event
document.querySelectorAll(".btn-control-menu").forEach(boton => {
    boton.addEventListener("click", () => {
        const evento = boton.getAttribute("data-event");

        switch (evento) {
            case "zoomIn":
                acercarZoom();
                break;
            case "zoomOut":
                alejarZoom();
                break;
            case "toggleMode":
                alternarModoVisual();
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

if (modoContadorPasos) {
  modoContadorPasos.addEventListener("change", () => {
    if (!modoContadorPasos.checked) {
      sesionPasosActiva = false;
      sesionPasosGuardada = false;
      pasosSesionActual = 0;
      caloriasSesionActual = 0;
      distanciaSesionMetros = 0;
      posicionAnteriorSesion = null;
      inicioSesionISO = null;
      destinoSesionNombre = "";
    }
    actualizarResumenContadorRuta();
  });
}

if (botonesFiltroActividad && botonesFiltroActividad.length) {
  botonesFiltroActividad.forEach((btn) => {
    btn.addEventListener("click", () => {
      botonesFiltroActividad.forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      cargarActividad(btn.getAttribute("data-period") || "day");
    });
  });
}

actualizarResumenContadorRuta();




// =========================
// CÁLCULO DE RUTA
// =========================

// Función que calcula la ruta
/* Este bloque es el corazón incansable del motor de recolección inicial y la barra de búsqueda superior,
   y es el encargado absoluto de arrancar toda la operativa cada vez que un usuario decide que "ahí va a ir".
   Para entender cómo funciona internamente y cómo controla el flujo inicial al pulsar 
   enter en la caja de destino o el botón de lupa, hace falta tener en cuenta que necesitamos
   evaluar a toda costa si tenemos algo desde dónde partir. Sigue un escalafón estricto de sentencias:
    - 1. Si no nos está llegando señal activa de ubicación GPS en la matriz de estado local 
      ('miLatitud' en nulo), la maquinaria nos deniega drásticamente un cálculo y aborta (su return final).
    - 2. Suponiendo que hay conexión con nosotros, empieza por desbrozar y quitar los espacios en blanco
      accidentales que pudiera haber en el destino textual escrito en la barra ('inputDestino.value.trim').
    - 3. Evalúa si de modo contrario, un usuario ha estado marcando una chincheta roja con el dedo 
      al pulsar por el mapa (su 'modoClic.checked' está activo), para dar a esas coordenadas absolutas 
      prioridad abrumadora de destino frente a buscar algo en el propio servidor de mapas en un segundo. */
async function calcularRuta() {
  // Si no se conoce la posición actual, se muestra un mensaje
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent = "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  const destino = inputDestino.value.trim();  // Obtenemos el destino del input
  const usarClic = modoClic.checked;         // Obtenemos si se está usando el modo clic

  // Variables para almacenar las coordenadas y el nombre del destino
  let destLat;
  let destLon;
  let destNombre;

  // Si el modo clic está activado, exigimos que haya un punto seleccionado.
  if (usarClic) {
    if (destinoClickLat === null || destinoClickLon === null) {
      estadoRuta.textContent = "Activa modo clic y toca el mapa para marcar un destino.";
      return;
    }
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
      format=json indica que queremos la res en formato JSON.
      q=${encodeURIComponent(destino)} sirve para codificar el destino y que se pueda enviar por URL.
      limit=1 indica que queremos solo un resultado*/
      const urlGeo = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
      // Hacemos la petición a Nominatim y usamos await para obligar al programa a esperar la res
      const respuestaGeo = await fetch(urlGeo);
      // Convertimos la res a JSON
      const datosGeo = await respuestaGeo.json();

      // Si Nominatim no encuentra nada, nos lo dice y no seguimos
      if (datosGeo.length === 0) {
        estadoRuta.textContent =
          "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      // Si Nominatim encuentra algo, guardamos latitud, longitud y nombre del destino
      destLat = parseFloat(datosGeo[0].lat);
      destLon = parseFloat(datosGeo[0].lon);     // parseFloat convierte el texto en número
      destNombre = datosGeo[0].display_name;     // Guardamos el nombre del destino

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
    instruccionesRuta = ruta.instructions || [];
    coordenadasRuta = ruta.coordinates || [];

    // Reiniciamos el índice del paso actual
    navegacionIniciada = false;
    actualizarBotonIrCancelar();
    indicePasoActual = 0;
    ultimoCambioAutomatico = 0;
    rutaTerminada = false;

    // Calculamos distancia y tiempo
    const distanciaKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const minutosTotales = Math.round(ruta.summary.totalTime / 60);

    let tiempoFormateado = "";
    if (minutosTotales < 60) {
      tiempoFormateado = `${minutosTotales} min`;
    } else if (minutosTotales < 1440) {
      const horas = Math.floor(minutosTotales / 60);
      const minutosRestantes = minutosTotales % 60;
      tiempoFormateado = `${horas} h ${minutosRestantes} min`;
    } else {
      const dias = Math.floor(minutosTotales / 1440);
      const horasRestantes = Math.floor((minutosTotales % 1440) / 60);
      tiempoFormateado = `${dias} d ${horasRestantes} h`;
    }

    miETA = `Llega en ${tiempoFormateado} (${distanciaKm} km)`;
    if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
        socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
    }

    estadoRuta.textContent = `Ruta calculada: ${distanciaKm} km, ~${tiempoFormateado} a pie.`;

    // Activamos la opción de AR en el menú full-screen
    btnAR.classList.remove("oculto");

    // Compartir ruta si está activado
    if (modoCompartirUbicacion.checked) {
      socket.emit("shareRoute", coordenadasRuta);
    }

    // Mostramos la tarjeta inferior de ruta con Compartir / AR / Ir
    mostrarTarjetaRuta(distanciaKm, tiempoFormateado);

    // Mostramos el primer paso
    mostrarPasoActual();
    sincronizarMapa3D();
    actualizarVista3D();
  });

  // Si falla el cálculo de la ruta
  controlRuta.on("routingerror", () => {
    estadoRuta.textContent = "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}





// =========================
// BOTÓN Y ENTER PARA CALCULAR LA RUTA
// =========================
if (typeof inicializarAutocompletadoDestino === "function") {
  inicializarAutocompletadoDestino({
    inputDestino,
    btnRuta,
    sugerenciasDestino,
    alBuscarRuta: calcularRuta
  });
}

if (typeof inicializarControlesDesplegablesMapa === "function") {
  inicializarControlesDesplegablesMapa();
}






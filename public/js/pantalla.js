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


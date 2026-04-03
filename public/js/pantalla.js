// =========================
// CONEXIÓN CON SOCKET.IO
// =========================

const socket = io();

const connectionStatus = document.getElementById("connectionStatus");
const lastEvent = document.getElementById("lastEvent");
const modeStatus = document.getElementById("modeStatus");
const stepBox = document.getElementById("stepBox");

socket.on("connect", () => {
  connectionStatus.textContent = `Conectado. ID: ${socket.id}`;
  socket.emit("clientReady", { role: "pantalla" });
});

// =========================
// ELEMENTOS DEL DOM
// =========================

const btnAR = document.getElementById("btnAR");
const arContainer = document.getElementById("arContainer");
const arVideo = document.getElementById("arVideo");
const arCanvas = document.getElementById("arCanvas");

const destinoInput = document.getElementById("destinoInput");
const btnRuta = document.getElementById("btnRuta");
const clickMode = document.getElementById("clickMode");
const estadoRuta = document.getElementById("estadoRuta");

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const closeSidebar = document.getElementById("closeSidebar");

menuToggle.addEventListener("click", () => {
  sidebar.classList.add("visible");
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("visible");
});

// =========================
// MAPA
// =========================

const mapa = L.map("mapa").setView([40.4168, -3.7038], 15);

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

let miLatitud = null;
let miLongitud = null;

let marcadorUsuario = null;
let controlRuta = null;
let marcadorDestino = null;

let destinoClickLat = null;
let destinoClickLon = null;

let instruccionesRuta = [];
let coordenadasRuta = [];
let indicePasoActual = -1;

// =========================
// AUTOAVANCE DE PASOS
// =========================

const DISTANCIA_CAMBIO_PASO = 18;
const DISTANCIA_LLEGADA_DESTINO = 12;
const RETARDO_CAMBIO_PASO_MS = 2500;

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

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (pos) => {
      miLatitud = pos.coords.latitude;
      miLongitud = pos.coords.longitude;

      if (!marcadorUsuario) {
        mapa.setView([miLatitud, miLongitud], 16);

        marcadorUsuario = L.marker([miLatitud, miLongitud])
          .addTo(mapa)
          .bindPopup("Estás aquí")
          .openPopup();

        estadoRuta.textContent = "Ubicación obtenida. Ya puedes buscar una ruta.";
      } else {
        marcadorUsuario.setLatLng([miLatitud, miLongitud]);
      }

      actualizarPasoAutomatico();
    },
    (err) => {
      estadoRuta.textContent =
        "No se pudo obtener el GPS. Permite el acceso a la ubicación.";
      console.error("Error GPS:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
} else {
  estadoRuta.textContent = "Tu navegador no soporta geolocalización.";
}

// =========================
// SELECCIÓN DE DESTINO CON CLIC
// =========================

mapa.on("click", (e) => {
  if (!clickMode.checked) return;

  destinoClickLat = e.latlng.lat;
  destinoClickLon = e.latlng.lng;

  if (marcadorDestino) {
    marcadorDestino.setLatLng(e.latlng);
  } else {
    marcadorDestino = L.marker(e.latlng, {
      icon: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(mapa);
  }

  marcadorDestino
    .bindPopup(
      `Destino: ${destinoClickLat.toFixed(5)}, ${destinoClickLon.toFixed(5)}`
    )
    .openPopup();

  estadoRuta.textContent =
    "Destino seleccionado en el mapa. Pulsa 'Buscar y calcular ruta'.";
});

// =========================
// FUNCIONES AUXILIARES
// =========================

function limpiarRuta() {
  if (controlRuta) {
    mapa.removeControl(controlRuta);
    controlRuta = null;
  }

  if (
    typeof ActivarDesactivarARMode === "function" &&
    typeof isARMode !== "undefined" &&
    isARMode
  ) {
    ActivarDesactivarARMode();
  }

  if (btnAR) {
    btnAR.classList.add("oculto");
  }

  instruccionesRuta = [];
  coordenadasRuta = [];
  indicePasoActual = -1;
  ultimoCambioAutomatico = 0;
  rutaTerminada = false;

  rumboObjetivoSuavizado = null;
  anguloFlechaRenderizado = null;

  stepBox.textContent = "No hay una ruta activa.";
}

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

function mostrarPasoActual() {
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No hay instrucciones disponibles para esta ruta.";
    return;
  }

  if (indicePasoActual < 0) {
    indicePasoActual = 0;
  }

  if (indicePasoActual >= instruccionesRuta.length) {
    indicePasoActual = instruccionesRuta.length - 1;
  }

  const instruccion = instruccionesRuta[indicePasoActual];

  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}\n\n` +
    `${instruccion.text || "Sin texto disponible"}\n\n` +
    `Distancia aproximada: ${Math.round(instruccion.distance || 0)} m`;

  stepBox.textContent = textoPaso;

  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    const punto = coordenadasRuta[instruccion.index];
    mapa.panTo([punto.lat, punto.lng]);
  }
}

function siguientePaso() {
  if (!instruccionesRuta.length) {
    stepBox.textContent =
      "No puedes avanzar pasos porque todavía no hay una ruta calculada.";
    return;
  }

  if (indicePasoActual < instruccionesRuta.length - 1) {
    indicePasoActual++;
  }

  mostrarPasoActual();
}

function pasoAnterior() {
  if (!instruccionesRuta.length) {
    stepBox.textContent =
      "No puedes retroceder pasos porque todavía no hay una ruta calculada.";
    return;
  }

  if (indicePasoActual > 0) {
    indicePasoActual--;
  }

  mostrarPasoActual();
}

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

function recentrarMapa() {
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

async function calcularRuta() {
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent =
      "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  const destino = destinoInput.value.trim();
  const usarClic = clickMode.checked;

  let destLat;
  let destLon;
  let destNombre;

  if (usarClic && destinoClickLat !== null) {
    destLat = destinoClickLat;
    destLon = destinoClickLon;
    destNombre = `Punto: ${destLat.toFixed(5)}, ${destLon.toFixed(5)}`;
  } else if (destino) {
    estadoRuta.textContent = "Buscando el lugar...";

    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        destino
      )}&limit=1`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (geoData.length === 0) {
        estadoRuta.textContent =
          "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      destLat = parseFloat(geoData[0].lat);
      destLon = parseFloat(geoData[0].lon);
      destNombre = geoData[0].display_name;
    } catch (error) {
      estadoRuta.textContent = "Error de conexión con los servicios de mapas.";
      console.error(error);
      return;
    }
  } else {
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  limpiarRuta();

  estadoRuta.textContent = "Calculando ruta a pie...";

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
      if (i === 0) return null;
      return L.marker(waypoint.latLng).bindPopup(destNombre);
    },
    language: "es",
    show: true,
    collapsible: true,
    fitSelectedRoutes: true
  }).addTo(mapa);

  controlRuta.on("routesfound", (e) => {
    const ruta = e.routes[0];

    instruccionesRuta = ruta.instructions || [];
    coordenadasRuta = ruta.coordinates || [];

    indicePasoActual = 0;
    ultimoCambioAutomatico = 0;
    rutaTerminada = false;

    rumboObjetivoSuavizado = null;
    anguloFlechaRenderizado = null;

    const distKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const tiempoMin = Math.round(ruta.summary.totalTime / 60);

    estadoRuta.textContent = `Ruta calculada: ${distKm} km, ~${tiempoMin} min a pie.`;

    btnAR.classList.remove("oculto");
    mostrarPasoActual();
  });

  controlRuta.on("routingerror", () => {
    estadoRuta.textContent =
      "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}

// =========================
// BOTÓN Y ENTER PARA CALCULAR LA RUTA
// =========================

btnRuta.addEventListener("click", calcularRuta);

destinoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    calcularRuta();
  }
});

// =========================
// EVENTOS RECIBIDOS DESDE SOCKET
// =========================

socket.on("nextStep", () => {
  lastEvent.textContent = "Último evento: nextStep";
  siguientePaso();
});

socket.on("prevStep", () => {
  lastEvent.textContent = "Último evento: prevStep";
  pasoAnterior();
});

socket.on("zoomIn", () => {
  lastEvent.textContent = "Último evento: zoomIn";
  mapa.zoomIn();
});

socket.on("zoomOut", () => {
  lastEvent.textContent = "Último evento: zoomOut";
  mapa.zoomOut();
});

socket.on("toggleMode", () => {
  lastEvent.textContent = "Último evento: toggleMode";
  toggleModeVisual();
});

socket.on("recenter", () => {
  lastEvent.textContent = "Último evento: recenter";
  recentrarMapa();
});

socket.on("confirm", () => {
  lastEvent.textContent = "Último evento: confirm";
  estadoRuta.textContent = "Acción confirmada desde el mando.";
});

socket.on("exit", () => {
  lastEvent.textContent = "Último evento: exit";
  limpiarRuta();
  estadoRuta.textContent = "Ruta cancelada desde el mando.";
});

socket.on("orientationData", (data) => {
  console.log("orientationData recibido en pantalla:", data);
});

// =========================
// MODO REALIDAD AUMENTADA
// =========================

let isARMode = false;
let videoStream = null;
let arAnimation = null;
let rumboActual = 0;
let rumboSuavizado = 0;

// =========================
// FUNCIONES DE ÁNGULOS Y RUMBO
// =========================

function calcularRumbo(lat1, lon1, lat2, lon2) {
  const aRadianes = (p) => (p * Math.PI) / 180;
  const aGrados = (p) => (p * 180) / Math.PI;

  const difLon = aRadianes(lon2 - lon1);

  const y = Math.sin(difLon) * Math.cos(aRadianes(lat2));
  const x =
    Math.cos(aRadianes(lat1)) * Math.sin(aRadianes(lat2)) -
    Math.sin(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.cos(difLon);

  let rumbo = aGrados(Math.atan2(y, x));
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

function handleOrientation(event) {
  let rumboCrudo = null;

  if (
    event.webkitCompassHeading !== undefined &&
    event.webkitCompassHeading !== null
  ) {
    rumboCrudo = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    rumboCrudo = 360 - event.alpha;
  }

  if (rumboCrudo !== null) {
    let diff = rumboCrudo - rumboSuavizado;

    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    rumboSuavizado += diff * 0.08;

    if (rumboSuavizado < 0) rumboSuavizado += 360;
    if (rumboSuavizado >= 360) rumboSuavizado -= 360;

    rumboActual = rumboSuavizado;
  }
}

// =========================
// DIBUJADO AR
// =========================

function drawARFrame() {
  if (!isARMode) return;

  if (
    arCanvas.width !== window.innerWidth ||
    arCanvas.height !== window.innerHeight
  ) {
    arCanvas.width = window.innerWidth;
    arCanvas.height = window.innerHeight;
  }

  const ctx = arCanvas.getContext("2d");
  ctx.clearRect(0, 0, arCanvas.width, arCanvas.height);

  if (
    miLatitud !== null &&
    miLongitud !== null &&
    coordenadasRuta &&
    coordenadasRuta.length > 0
  ) {
    const objetivoPaso = obtenerObjetivoAR();

    if (objetivoPaso) {
      const rumboObjetivoCrudo = calcularRumbo(
        miLatitud,
        miLongitud,
        objetivoPaso.lat,
        objetivoPaso.lng
      );

      if (rumboObjetivoSuavizado === null) {
        rumboObjetivoSuavizado = rumboObjetivoCrudo;
      } else {
        const diffObjetivo = diferenciaAngular(
          rumboObjetivoCrudo,
          rumboObjetivoSuavizado
        );

        rumboObjetivoSuavizado = normalizarAngulo(
          rumboObjetivoSuavizado + diffObjetivo * SUAVIZADO_RUMBO_OBJETIVO
        );
      }

      let anguloRelativo = diferenciaAngular(
        rumboObjetivoSuavizado,
        rumboActual
      );

      if (Math.abs(anguloRelativo) < ZONA_MUERTA_RECTO_GRADOS) {
        anguloRelativo = 0;
      }

      const anguloObjetivoRad = gradosARadianes(
        limitar(anguloRelativo, -170, 170)
      );

      if (anguloFlechaRenderizado === null) {
        anguloFlechaRenderizado = anguloObjetivoRad;
      } else {
        const diffRot = diferenciaAngularRad(
          anguloObjetivoRad,
          anguloFlechaRenderizado
        );

        anguloFlechaRenderizado = normalizarRadianes(
          anguloFlechaRenderizado + diffRot * SUAVIZADO_ROTACION_FLECHA
        );
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

async function ActivarDesactivarARMode() {
  if (isARMode) {
    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    document.body.classList.remove("modo-ar");
    arContainer.classList.add("oculto");

    rumboObjetivoSuavizado = null;
    anguloFlechaRenderizado = null;

    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }

    if (arAnimation) {
      cancelAnimationFrame(arAnimation);
      arAnimation = null;
    }

    window.removeEventListener("deviceorientationabsolute", handleOrientation);
    window.removeEventListener("deviceorientation", handleOrientation);

    setTimeout(() => {
      mapa.invalidateSize();
    }, 500);
  } else {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permissionState =
          await DeviceOrientationEvent.requestPermission();

        if (permissionState !== "granted") {
          alert(
            "Necesitamos acceso a la brújula para que la flecha gire correctamente."
          );
          return;
        }
      } catch (error) {
        console.error("Error al pedir permisos de brújula", error);
        alert("Ocurrió un error al acceder a la brújula.");
        return;
      }
    }

    try {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      arVideo.srcObject = videoStream;
      arVideo.play().catch((e) => {
        console.warn("Autoplay evitado por el navegador", e);
      });

      isARMode = true;
      btnAR.textContent = "Desactivar AR";

      rumboObjetivoSuavizado = null;
      anguloFlechaRenderizado = null;

      arContainer.classList.remove("oculto");
      document.body.classList.add("modo-ar");

      window.addEventListener(
        "deviceorientationabsolute",
        handleOrientation,
        true
      );
      window.addEventListener("deviceorientation", handleOrientation, true);

      drawARFrame();

      setTimeout(() => {
        mapa.invalidateSize();
      }, 500);
    } catch (error) {
      console.error("No se pudo acceder a la cámara:", error);
      alert("Error cámara: " + error.name + " - " + error.message);
    }
  }
}

btnAR.addEventListener("click", ActivarDesactivarARMode);

// =========================
// VISIBILIDAD DE LA PESTAÑA
// =========================

document.addEventListener("visibilitychange", () => {
  if (document.hidden && isARMode) {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }

    arVideo.pause();
    arVideo.srcObject = null;

    if (arAnimation) {
      cancelAnimationFrame(arAnimation);
      arAnimation = null;
    }

    rumboObjetivoSuavizado = null;
    anguloFlechaRenderizado = null;

    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    document.body.classList.remove("modo-ar");
    arContainer.classList.add("oculto");
  }
});
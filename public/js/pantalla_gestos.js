// =========================
// NAVEGACIÓN CON GESTOS
// =========================

const btnActivarGestosMenu = document.getElementById("btnActivarGestosMenu");

window.gestosMenuActivo = false;

let gestoVideo = null;                  // Vídeo oculto para detectar la mano con cámara frontal
let gestoCameraStream = null;           // Stream de cámara usado por el control sin tocar
let gestoRecognizer = null;             // Reconocedor de gestos de MediaPipe
let gestoRecognizerPromise = null;      // Promesa de inicialización del reconocedor
let gestoRAF = null;                    // Bucle de análisis del vídeo
let gestoLastVideoTime = -1;            // Último frame procesado del vídeo
let gestoReferenciaMano = null;         // Punto base desde donde medimos el barrido de la mano
let gestoUltimaDeteccionMs = 0;         // Último instante en el que se detectó mano
let gestoUltimaAccionMs = 0;            // Cooldown de acciones por gesto aéreo
let gestoPunyoActivo = false;           // Evita repetir selección mientras el puño sigue cerrado
let gestoUltimaSeleccionMs = 0;         // Cooldown específico para la selección por puño

const UMBRAL_GESTO_AEREO_HORIZONTAL = 0.16;
const UMBRAL_GESTO_AEREO_VERTICAL = 0.14;
const MARGEN_GESTO_AEREO_PERPENDICULAR = 0.09;
const REINICIO_REFERENCIA_MANO_MS = 380;
const COOLDOWN_GESTO_AEREO_MS = 900;
const COOLDOWN_GESTO_SELECCION_MS = 1100;
const UMBRAL_GESTO_PUNYO = 0.65;
const NOMBRE_GESTO_PUNYO = "Closed_Fist";
const URL_MEDIAPIPE_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const URL_MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const URL_MEDIAPIPE_MODELO = "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task";

function obtenerNavegacionAsistida() {
  return window.navegacionAsistida || null;
}

function interpretarDireccionGestoAereo(diffX, diffY) {
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  if (absX >= UMBRAL_GESTO_AEREO_HORIZONTAL && absY <= MARGEN_GESTO_AEREO_PERPENDICULAR) {
    return diffX < 0 ? "izq" : "der";
  }

  if (absY >= UMBRAL_GESTO_AEREO_VERTICAL && absX <= MARGEN_GESTO_AEREO_PERPENDICULAR) {
    return diffY < 0 ? "arriba" : "abajo";
  }

  return null;
}

function vibrarAsistencia(ms = 24) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function detectarPunyoCerrado(resultado) {
  const gestoDetectado = resultado?.gestures?.[0]?.[0];
  if (!gestoDetectado) return false;

  return (
    gestoDetectado.categoryName === NOMBRE_GESTO_PUNYO &&
    (gestoDetectado.score ?? 0) >= UMBRAL_GESTO_PUNYO
  );
}

function obtenerVideoGestos() {
  if (gestoVideo) return gestoVideo;

  gestoVideo = document.createElement("video");
  gestoVideo.setAttribute("autoplay", "");
  gestoVideo.setAttribute("playsinline", "");
  gestoVideo.setAttribute("webkit-playsinline", "");
  gestoVideo.muted = true;
  gestoVideo.playsInline = true;
  gestoVideo.style.position = "fixed";
  gestoVideo.style.width = "1px";
  gestoVideo.style.height = "1px";
  gestoVideo.style.opacity = "0";
  gestoVideo.style.pointerEvents = "none";
  gestoVideo.style.left = "-9999px";
  gestoVideo.style.top = "-9999px";
  document.body.appendChild(gestoVideo);
  return gestoVideo;
}

async function cargarRecognizerGestosMano() {
  if (gestoRecognizer) return gestoRecognizer;
  if (gestoRecognizerPromise) return gestoRecognizerPromise;

  gestoRecognizerPromise = (async () => {
    const visionModule = await import(URL_MEDIAPIPE_VISION);
    const vision = await visionModule.FilesetResolver.forVisionTasks(URL_MEDIAPIPE_WASM);
    gestoRecognizer = await visionModule.GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: URL_MEDIAPIPE_MODELO
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    return gestoRecognizer;
  })();

  try {
    return await gestoRecognizerPromise;
  } finally {
    gestoRecognizerPromise = null;
  }
}

function detenerCamaraGestosMenu() {
  if (gestoRAF) {
    cancelAnimationFrame(gestoRAF);
    gestoRAF = null;
  }

  if (gestoCameraStream) {
    gestoCameraStream.getTracks().forEach((track) => track.stop());
    gestoCameraStream = null;
  }

  if (gestoVideo) {
    gestoVideo.pause();
    gestoVideo.srcObject = null;
  }

  gestoLastVideoTime = -1;
  gestoReferenciaMano = null;
  gestoUltimaDeteccionMs = 0;
  gestoUltimaAccionMs = 0;
  gestoPunyoActivo = false;
  gestoUltimaSeleccionMs = 0;
}

function obtenerCentroMano(resultado) {
  if (!resultado || !resultado.landmarks || !resultado.landmarks.length) return null;

  const mano = resultado.landmarks[0];
  if (!mano || mano.length < 21) return null;

  const indicesCentro = [0, 5, 9, 13, 17];
  const acumulado = indicesCentro.reduce((acc, indice) => {
    const punto = mano[indice];
    acc.x += 1 - punto.x; // Espejamos X para que coincida con la dirección percibida en pantalla.
    acc.y += punto.y;
    return acc;
  }, { x: 0, y: 0 });

  return {
    x: acumulado.x / indicesCentro.length,
    y: acumulado.y / indicesCentro.length
  };
}

function procesarMovimientoMano(resultado, ahoraMs) {
  const navegacion = obtenerNavegacionAsistida();
  if (!navegacion) return;

  const centro = obtenerCentroMano(resultado);
  const punyoCerrado = detectarPunyoCerrado(resultado);

  if (!centro) {
    gestoReferenciaMano = null;
    gestoUltimaDeteccionMs = 0;
    gestoPunyoActivo = false;
    return;
  }

  if (punyoCerrado && !gestoPunyoActivo) {
    gestoPunyoActivo = true;

    if (
      ahoraMs - gestoUltimaSeleccionMs >= COOLDOWN_GESTO_SELECCION_MS &&
      navegacion.seleccionarActual()
    ) {
      gestoUltimaSeleccionMs = ahoraMs;
      gestoUltimaAccionMs = ahoraMs;
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
      vibrarAsistencia(36);
      return;
    }
  } else if (!punyoCerrado) {
    gestoPunyoActivo = false;
  }

  if (
    !gestoReferenciaMano ||
    !gestoUltimaDeteccionMs ||
    ahoraMs - gestoUltimaDeteccionMs > REINICIO_REFERENCIA_MANO_MS
  ) {
    gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
    gestoUltimaDeteccionMs = ahoraMs;
    return;
  }

  gestoUltimaDeteccionMs = ahoraMs;

  if (ahoraMs - gestoUltimaAccionMs < COOLDOWN_GESTO_AEREO_MS) {
    return;
  }

  const diffX = centro.x - gestoReferenciaMano.x;
  const diffY = centro.y - gestoReferenciaMano.y;
  const accion = interpretarDireccionGestoAereo(diffX, diffY);

  if (!accion) {
    if (Math.abs(diffX) < 0.03 && Math.abs(diffY) < 0.03) {
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
    } else if (ahoraMs - gestoReferenciaMano.tiempo > 700) {
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
    }
    return;
  }

  navegacion.ejecutarAccion(accion);
  vibrarAsistencia();
  gestoUltimaAccionMs = ahoraMs;
  gestoReferenciaMano = null;
}

function bucleGestosMano() {
  if (!window.gestosMenuActivo || !gestoRecognizer || !gestoVideo) return;

  if (
    gestoVideo.readyState >= 2 &&
    gestoVideo.currentTime !== gestoLastVideoTime
  ) {
    const ahoraMs = performance.now();
    gestoLastVideoTime = gestoVideo.currentTime;
    const resultado = gestoRecognizer.recognizeForVideo(gestoVideo, ahoraMs);
    procesarMovimientoMano(resultado, ahoraMs);
  }

  gestoRAF = requestAnimationFrame(bucleGestosMano);
}

async function activarCamaraGestosMenu() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Tu navegador no permite usar la cámara para gestos aéreos.");
  }

  if (!obtenerNavegacionAsistida()) {
    throw new Error("La navegación asistida no está disponible todavía.");
  }

  detenerCamaraGestosMenu();
  await cargarRecognizerGestosMano();
  const video = obtenerVideoGestos();

  gestoCameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  });

  video.srcObject = gestoCameraStream;
  await new Promise((resolve) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
  });
  await video.play();

  gestoLastVideoTime = -1;
  gestoReferenciaMano = null;
  gestoUltimaDeteccionMs = 0;
  gestoUltimaAccionMs = 0;
  gestoPunyoActivo = false;
  gestoUltimaSeleccionMs = 0;

  if (typeof estadoRuta !== "undefined" && estadoRuta) {
    estadoRuta.textContent = "Control por gestos aéreo activo. Mueve la mano frente a la cámara frontal y cierra el puño para aceptar.";
  }

  bucleGestosMano();
}

function desactivarControlGestos() {
  window.gestosMenuActivo = false;
  if (btnActivarGestosMenu) btnActivarGestosMenu.classList.remove("activo");
  detenerCamaraGestosMenu();
  obtenerNavegacionAsistida()?.limpiarFoco();
}

if (btnActivarGestosMenu) {
  btnActivarGestosMenu.addEventListener("click", async () => {
    if (window.gestosMenuActivo) {
      desactivarControlGestos();
      return;
    }

    if (typeof window.desactivarControlTiltMenu === "function") {
      window.desactivarControlTiltMenu();
    }

    window.gestosMenuActivo = true;

    try {
      btnActivarGestosMenu.classList.add("activo");
      obtenerNavegacionAsistida()?.actualizarElementos();
      obtenerNavegacionAsistida()?.pintarFoco();
      await activarCamaraGestosMenu();
      obtenerNavegacionAsistida()?.refrescarFoco();
    } catch (error) {
      console.error("No se pudo activar el control por gestos aéreo:", error);
      alert("No se pudo activar el control por gestos con la cámara frontal.");
      desactivarControlGestos();
    }
  });
}

window.desactivarControlGestosMenu = desactivarControlGestos;

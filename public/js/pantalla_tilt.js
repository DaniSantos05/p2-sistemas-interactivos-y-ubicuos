// =========================
// NAVEGACIÓN CON TILT
// =========================

const btnActivarTilt = document.getElementById("btnActivarTilt");
const btnActivarGestosMenu = document.getElementById("btnActivarGestosMenu");
const modalPerfilTilt = document.getElementById("modalPerfil");
let tiltActivo = false;                 // Indica si el control por inclinación está activo
let gestosMenuActivo = false;           // Indica si el control por gestos está activo
let tiltBeta = null;                    // El ángulo beta es el de arriba/abajo
let tiltGamma = null;                   // El ángulo gamma es el de izquierda/derecha
let tiltCooldown = false;               // Cooldown para evitar cambios bruscos
let tiltFocusIndex = -1;                // Índice del elemento focalizado
let tiltElementos = [];                 // Array de elementos focalizables
let bloqueoVertical = false;            // Bloqueo vertical para evitar cambios bruscos
let bloqueoHorizontal = false;          // Bloqueo horizontal para evitar cambios bruscos
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

function hayControlAsistidoActivo() {
  return tiltActivo || gestosMenuActivo;
}

function limpiarFocoAsistido() {
  if (hayControlAsistidoActivo()) {
    actualizarElementosTilt();
    pintarFocoTilt();
    return;
  }

  document.querySelectorAll('.tilt-focus, .tilt-focus-menu').forEach(el => {
    el.classList.remove('tilt-focus', 'tilt-focus-menu');
  });
}

function obtenerEstadoDesplegable() {
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  return !!(opcionesDesplegables && !opcionesDesplegables.classList.contains("oculto"));
}

function refrescarFocoAsistido() {
  setTimeout(() => {
    if (!hayControlAsistidoActivo()) return;
    actualizarElementosTilt();
    pintarFocoTilt();
  }, 120);
}

function abrirMenuControlesAsistido() {
  const btnDesplegarControles = document.getElementById("btnDesplegarControles");
  if (!btnDesplegarControles || obtenerEstadoDesplegable()) return;
  btnDesplegarControles.click();
  refrescarFocoAsistido();
}

function cerrarMenuControlesAsistido() {
  const btnDesplegarControles = document.getElementById("btnDesplegarControles");
  if (!btnDesplegarControles || !obtenerEstadoDesplegable()) return;
  btnDesplegarControles.click();
  refrescarFocoAsistido();
}

function moverFocoAsistido(direccion) {
  actualizarElementosTilt();
  if (tiltElementos.length <= 1) return;

  if (direccion === "arriba") {
    tiltFocusIndex--;
    if (tiltFocusIndex < 0) tiltFocusIndex = tiltElementos.length - 1;
  } else if (direccion === "abajo") {
    tiltFocusIndex++;
    if (tiltFocusIndex >= tiltElementos.length) tiltFocusIndex = 0;
  }

  pintarFocoTilt();
}

function manejarAccionAsistida(accion) {
  const desplegableAbierto = obtenerEstadoDesplegable();
  actualizarElementosTilt();

  if (!desplegableAbierto) {
    if (accion === "izq" || accion === "abajo") {
      abrirMenuControlesAsistido();
    }
    return;
  }

  if (accion === "izq") {
    simularClickTilt(tiltElementos[tiltFocusIndex]);
    refrescarFocoAsistido();
  } else if (accion === "der") {
    cerrarMenuControlesAsistido();
  } else if (accion === "arriba" || accion === "abajo") {
    moverFocoAsistido(accion);
  }
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

function seleccionarOpcionAsistida() {
  if (!obtenerEstadoDesplegable()) return false;

  actualizarElementosTilt();
  const elementoFocalizado = tiltElementos[tiltFocusIndex];
  if (!elementoFocalizado) return false;

  simularClickTilt(elementoFocalizado);
  refrescarFocoAsistido();
  vibrarAsistencia(36);
  return true;
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
      seleccionarOpcionAsistida()
    ) {
      gestoUltimaSeleccionMs = ahoraMs;
      gestoUltimaAccionMs = ahoraMs;
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
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

  manejarAccionAsistida(accion);
  vibrarAsistencia();
  gestoUltimaAccionMs = ahoraMs;
  gestoReferenciaMano = null;
}

function bucleGestosMano() {
  if (!gestosMenuActivo || !gestoRecognizer || !gestoVideo) return;

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

  if (estadoRuta) {
    estadoRuta.textContent = "Control por gestos aéreo activo. Mueve la mano frente a la cámara frontal y cierra el puño para aceptar.";
  }

  bucleGestosMano();
}

/*Función que actualiza los elementos que se pueden focalizar con el control por inclinación*/
function actualizarElementosTilt() {
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  
  /*Si el desplegable de opciones del mapa está abierto, se focalizan los botones de zoom y capas*/
  if (opcionesDesplegables && !opcionesDesplegables.classList.contains("oculto")) {
    const elementosDeseados = Array.from(opcionesDesplegables.querySelectorAll('button'));
    tiltElementos = elementosDeseados.filter(el => el.offsetParent !== null);
  } else {
    /*Fuera de todo, solo interactuamos con el botón de opciones de control del mapa*/
    tiltElementos = [document.getElementById("btnDesplegarControles")].filter(Boolean);
  }
  
  /*Si el índice de foco está fuera de rango, se establece en 0.*/
  if (tiltFocusIndex < 0 || tiltFocusIndex >= tiltElementos.length) tiltFocusIndex = 0;
}

/*Función que pinta el foco en el elemento focalizado*/
function pintarFocoTilt() {
  /*Limpia el foco anterior*/
  document.querySelectorAll('.tilt-focus, .tilt-focus-menu').forEach(el => {
    el.classList.remove('tilt-focus', 'tilt-focus-menu');
  });
  
  /*Si no hay elementos focalizables, no hace nada*/
  if (tiltElementos.length === 0 || tiltFocusIndex < 0 || tiltFocusIndex >= tiltElementos.length) return;
  
  /*Obtiene el elemento focalizado*/
  const focalizado = tiltElementos[tiltFocusIndex];
  
  /*Obtiene el desplegable de opciones del mapa*/
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  
  /*Si el desplegable de opciones del mapa está abierto, se pinta el foco en el elemento focalizado*/
  if (opcionesDesplegables && !opcionesDesplegables.classList.contains("oculto")) {
     focalizado.classList.add("tilt-focus-menu");
  } else {
     focalizado.classList.add("tilt-focus");
  }
}

/*Función que simula un click en el elemento focalizado*/
function simularClickTilt(elemento) {
  /*Si no hay elemento focalizado, no hace nada*/
  if (!elemento) return;
  
  /*Ejecuta el click sobre el botón o elemento de control*/
  elemento.click();
}

/*Función que maneja el control por inclinación*/
function manejarTilt(e) {
  /*Si el control por inclinación no está activo o está en cooldown, no hace nada*/
  if (!tiltActivo || tiltCooldown) return;
  
  /*Obtiene los ángulos beta y gamma*/
  let beta = e.beta;          // Inclinación vertical (arriba/abajo)
  let gamma = e.gamma;        // Inclinación horizontal (izquierda/derecha)
  
  /*Si los ángulos beta y gamma son nulos, no hace nada. Esto 
  ocurre cuando el dispositivo no soporta el control por inclinación*/
  if (beta === null || gamma === null) return;
  
  /*Si los ángulos de tilt son nulos, los inicializa. Esto sirve para 
  establecer un punto de referencia para el control por inclinación*/
  if (tiltBeta === null || tiltGamma === null) {
    tiltBeta = beta;
    tiltGamma = gamma;
    pintarFocoTilt();      // Pinta el foco en el elemento focalizado
    return;
  }
  
  /*Calcula la diferencia entre los ángulos actuales y los ángulos de tilt.
  Esto sirve para detectar la dirección y magnitud de la inclinación*/
  let diffBeta = beta - tiltBeta;
  let diffGamma = gamma - tiltGamma;
  
  /*Define los umbrales de inclinación*/
  const umbralVertical = 25;   // Inclinación vertical (un poco menos)
  const umbralHorizontal = 55; // Inclinación horizontal (más rígido)
  const margenRegreso = 20;    // Deberá regresar al menos al umbral de 20 para liberar el bloqueo
  
  /*Si la diferencia entre los ángulos actuales y los ángulos de tilt es menor que el margen de regreso,
  se libera el bloqueo. Esto sirve para evitar cambios bruscos en el control por inclinación*/
  if (Math.abs(diffGamma) < margenRegreso) bloqueoHorizontal = false; 
  if (Math.abs(diffBeta) < margenRegreso) bloqueoVertical = false;
  
  let accion = null;      // Acción a realizar
  
  /*Si el bloqueo horizontal no está activo, se comprueba si la diferencia
  entre los ángulos actuales y los ángulos de tilt es mayor que el umbral horizontal*/
  if (!bloqueoHorizontal) {
    if (diffGamma < -umbralHorizontal) { accion = "izq"; bloqueoHorizontal = true; }
    else if (diffGamma > umbralHorizontal) { accion = "der"; bloqueoHorizontal = true; }
  }
  
  /*Si no hay acción y el bloqueo vertical no está activo, se comprueba si la diferencia
  entre los ángulos actuales y los ángulos de tilt es mayor que el umbral vertical*/
  if (!accion && !bloqueoVertical) {
    if (diffBeta < -umbralVertical) { accion = "arriba"; bloqueoVertical = true; }
    else if (diffBeta > umbralVertical) { accion = "abajo"; bloqueoVertical = true; }
  }
  
  /*Si no hay acción, no hace nada*/
  if (!accion) return;
  
  /*Establece un cooldown para evitar cambios bruscos en el control por inclinación*/
  tiltCooldown = true;
  setTimeout(() => tiltCooldown = false, 1000);    // 1 segundo de cooldown
  
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  /*Para saber si el desplegable de opciones del mapa está abierto*/
  const desplegableAbierto = opcionesDesplegables && !opcionesDesplegables.classList.contains("oculto");
  
  /*Actualiza los elementos que se pueden focalizar con el control por inclinación*/
  actualizarElementosTilt();
  
  /*Si la acción es "izq", se simula un click en el elemento focalizado*/
  if (accion === "izq" && tiltElementos[tiltFocusIndex]) {
    simularClickTilt(tiltElementos[tiltFocusIndex]);
    refrescarFocoAsistido();
  } else if (accion === "der" && desplegableAbierto) {
    cerrarMenuControlesAsistido();
  } else if (accion === "arriba" || accion === "abajo") {
    moverFocoAsistido(accion);
  }
}

function desactivarControlTilt() {
  tiltActivo = false;
  if (btnActivarTilt) btnActivarTilt.classList.remove("activo");
  window.removeEventListener('deviceorientation', manejarTilt);
  tiltBeta = null;
  tiltGamma = null;
  tiltCooldown = false;
  bloqueoVertical = false;
  bloqueoHorizontal = false;
  limpiarFocoAsistido();
}

function desactivarControlGestos() {
  gestosMenuActivo = false;
  if (btnActivarGestosMenu) btnActivarGestosMenu.classList.remove("activo");
  detenerCamaraGestosMenu();
  limpiarFocoAsistido();
}

/* Si se pulsa el botón de activar tilt */
if (btnActivarTilt) {
  btnActivarTilt.addEventListener("click", () => {
    if (tiltActivo) {
      desactivarControlTilt();
      return;
    }

    if (gestosMenuActivo) {
      desactivarControlGestos();
    }

    tiltActivo = true;
    /*Si el control por inclinación está activo*/
    if (tiltActivo) {
      btnActivarTilt.classList.add("activo");
      tiltBeta = null;      // Reinicia el ángulo beta
      tiltGamma = null;     // Reinicia el ángulo gamma
      tiltCooldown = false; // Reinicia el cooldown
      
      /*Si el control por inclinación está activo*/
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()        // Solicita permiso para el control por inclinación
          .then(permissionState => {
            /*Si el permiso es concedido*/
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', manejarTilt);  // Añade el evento de control por inclinación
            } else {
              alert("Permiso denegado para el control por inclinación.");   // Si el permiso es denegado
              tiltActivo = false;                                           // Desactiva el control por inclinación
              btnActivarTilt.classList.remove("activo");                    // Elimina la clase activo del botón
            }
          })
          .catch(console.error);  // Si hay un error
      } else {
        window.addEventListener('deviceorientation', manejarTilt);  // Añade el evento de control por inclinación si el dispositivo lo soporta
      }
      actualizarElementosTilt();  // Actualiza los elementos que se pueden focalizar
      pintarFocoTilt();           // Pinta el foco en el elemento focalizado
    }
  });
}

if (btnActivarGestosMenu) {
  btnActivarGestosMenu.addEventListener("click", async () => {
    if (gestosMenuActivo) {
      desactivarControlGestos();
      return;
    }

    if (tiltActivo) {
      desactivarControlTilt();
    }

    gestosMenuActivo = true;
    if (gestosMenuActivo) {
      try {
        btnActivarGestosMenu.classList.add("activo");
        actualizarElementosTilt();
        pintarFocoTilt();
        await activarCamaraGestosMenu();
        refrescarFocoAsistido();
      } catch (error) {
        console.error("No se pudo activar el control por gestos aéreo:", error);
        alert("No se pudo activar el control por gestos con la cámara frontal.");
        desactivarControlGestos();
      }
    }
  });
}

const btnDesplegarControles = document.getElementById("btnDesplegarControles");
if (btnDesplegarControles) {
  btnDesplegarControles.addEventListener("click", () => {
    refrescarFocoAsistido();
  });
}

window.desactivarControlGestosMenu = desactivarControlGestos;

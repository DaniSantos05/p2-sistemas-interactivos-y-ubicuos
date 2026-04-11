// =========================
// NAVEGACIÓN CON GESTOS
// =========================

const btnActivarGestosMenu = document.getElementById("btnActivarGestosMenu");

window.gestosMenuActivo = false;

/* Se definen las variables donde se almacenarán los datos necesarios para el control 
por gestos y los umbrales para la detección de los mismos */

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

const UMBRAL_GESTO_AEREO_HORIZONTAL = 0.16;       // Umbral para detectar movimiento horizontal
const UMBRAL_GESTO_AEREO_VERTICAL = 0.14;         // Umbral para detectar movimiento vertical
const MARGEN_GESTO_AEREO_PERPENDICULAR = 0.09;    // Margen para detectar movimiento perpendicular
const REINICIO_REFERENCIA_MANO_MS = 380;          // Reinicio de la referencia de la mano
const COOLDOWN_GESTO_AEREO_MS = 900;              // Cooldown de acciones por gesto aéreo
const COOLDOWN_GESTO_SELECCION_MS = 1100;         // Cooldown específico para la selección por puño
const UMBRAL_GESTO_PUNYO = 0.65;                  // Umbral para detectar puño cerrado
const NOMBRE_GESTO_PUNYO = "Closed_Fist";         // Nombre del gesto de puño cerrado

/* Se definen las URLs de los recursos necesarios para el control por gestos */
const URL_MEDIAPIPE_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const URL_MEDIAPIPE_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const URL_MEDIAPIPE_MODELO = "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task";

/* Función que obtiene la navegación asistida */
function obtenerNavegacionAsistida() {
  return window.navegacionAsistida || null;
}

/* Función que interpreta la dirección del gesto aéreo. Se basa en la 
posición de la mano en el vídeo */
function interpretarDireccionGestoAereo(diffX, diffY) {
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  /* Se comprueba si el movimiento es horizontal */
  if (absX >= UMBRAL_GESTO_AEREO_HORIZONTAL && absY <= MARGEN_GESTO_AEREO_PERPENDICULAR) {
    return diffX < 0 ? "izq" : "der";
  }

  /* Se comprueba si el movimiento es vertical */
  if (absY >= UMBRAL_GESTO_AEREO_VERTICAL && absX <= MARGEN_GESTO_AEREO_PERPENDICULAR) {
    return diffY < 0 ? "arriba" : "abajo";
  }

  return null;
}

/* Función que vibra el dispositivo para dar feedback al usuario
cuando reconoce un gesto correctamente */
function vibrarAsistencia(ms = 24) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

/* Función que detecta si el gesto es un puño cerrado */
function detectarPunyoCerrado(resultado) {
  const gestoDetectado = resultado?.gestures?.[0]?.[0];
  if (!gestoDetectado) return false;
  
  /* Devuelve true si el gesto detectado es un puño cerrado */
  return (
    /* Se comprueba si el gesto detectado es un puño cerrado haciendo 
    comparación con el nombre del gesto de puño cerradob */
    gestoDetectado.categoryName === NOMBRE_GESTO_PUNYO &&
    /* Se comprueba si el gesto detectado tiene una confianza suficiente, es decir, 
    que el modelo está seguro de que es un puño cerrado */
    (gestoDetectado.score ?? 0) >= UMBRAL_GESTO_PUNYO
  );
}

/* Función que obtiene el vídeo para detectar gestos */
function obtenerVideoGestos() {
  if (gestoVideo) return gestoVideo;

  /* Se crea un elemento de vídeo para detectar gestos y se le 
  asignan los atributos necesarios como el tamaño, la posición, etc. */ 
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

/* Función que carga el reconocedor de gestos de MediaPipe. Se encarga de 
inicializar el reconocedor de gestos de MediaPipe y descargar el modelo pre-entrenado
para que pueda detectar gestos. Lo carga todo en la memoria cuando el usuario activa 
el control por gestos. Está configurado para detectar un máximo de 1 mano, con una 
confianza mínima de detección del 60% */
async function cargarRecognizerGestosMano() {
  /* Si el reconocedor ya está cargado, se devuelve */
  if (gestoRecognizer) return gestoRecognizer;
  /* Si la promesa ya está cargada, se devuelve */
  if (gestoRecognizerPromise) return gestoRecognizerPromise;

  /* Se crea una promesa para cargar el reconocedor de gestos de MediaPipe */
  gestoRecognizerPromise = (async () => {
    /* Se importa el módulo de visión de MediaPipe y se crea el resolvedor de tareas de visión */
    const visionModule = await import(URL_MEDIAPIPE_VISION);
    const vision = await visionModule.FilesetResolver.forVisionTasks(URL_MEDIAPIPE_WASM);

    /* Se crea el reconocedor de gestos con las opciones especificadas */
    gestoRecognizer = await visionModule.GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: URL_MEDIAPIPE_MODELO
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.6,  // Confianza mínima para detectar una mano
      minHandPresenceConfidence: 0.6,   // Confianza mínima para detectar la presencia de una mano
      minTrackingConfidence: 0.6        // Confianza mínima para rastrear una mano
    });
    return gestoRecognizer;
  })();

  /* Se devuelve la promesa */
  try {
    return await gestoRecognizerPromise;
  } finally {
    /* Se limpia la promesa */
    gestoRecognizerPromise = null;
  }
}

/* Función que detiene la cámara de gestos. Si el usuario desactiva el control por gestos, 
se detiene la cámara y se libera la memoria */
function detenerCamaraGestosMenu() {
  /* Se cancela el frame si existe */
  if (gestoRAF) {
    cancelAnimationFrame(gestoRAF);
    gestoRAF = null;
  }

  /* Se detiene la cámara si existe */
  if (gestoCameraStream) {
    gestoCameraStream.getTracks().forEach((track) => track.stop());
    gestoCameraStream = null;
  }

  /* Se detiene el vídeo si existe */
  if (gestoVideo) {
    gestoVideo.pause();
    gestoVideo.srcObject = null;
  }

  /* Se reinician las variables */
  gestoLastVideoTime = -1;
  gestoReferenciaMano = null;
  gestoUltimaDeteccionMs = 0;
  gestoUltimaAccionMs = 0;
  gestoPunyoActivo = false;
  gestoUltimaSeleccionMs = 0;
}

/* Función que obtiene el centro de la mano. Se basa en los puntos de referencia de la mano */
function obtenerCentroMano(resultado) {
  /* Si no hay resultado o no hay puntos de referencia, se devuelve null */
  if (!resultado || !resultado.landmarks || !resultado.landmarks.length) return null;

  /* Se obtiene la mano */
  const mano = resultado.landmarks[0];
  /* Si no hay mano o no hay puntos de referencia (21 porque es lo que detecta MediaPipe), se devuelve null */
  if (!mano || mano.length < 21) return null;

  /* Se obtienen los índices del centro de la mano y se calcula el centro de la mano. 
  Estos indices corresponden a la muñeca, la base de los dedos y la punta de los dedos */
  const indicesCentro = [0, 5, 9, 13, 17];
  const acumulado = indicesCentro.reduce((acc, indice) => {
    /* Aqui lo que hacemos es sumar las coordenadas de los puntos de referencia para 
    calcular el centro de la mano */
    const punto = mano[indice];
    acc.x += 1 - punto.x;         // Espejamos X para que coincida con la dirección percibida en pantalla
    acc.y += punto.y;             // Y sumamos Y
    return acc;
  }, { x: 0, y: 0 });

  /* Devolvemos el centro de la mano */
  return {
    x: acumulado.x / indicesCentro.length,    // Dividimos por el número de puntos de referencia para obtener el centro
    y: acumulado.y / indicesCentro.length
  };
}

/* Función que procesa el movimiento de la mano. Se encarga de detectar el 
gesto de puño cerrado y de procesar el movimiento de la mano */
function procesarMovimientoMano(resultado, ahoraMs) {
  /* Se obtiene la navegación asistida y si no hay, se devuelve */
  const navegacion = obtenerNavegacionAsistida();
  if (!navegacion) return;

  /* Se obtiene el centro de la mano y se detecta el gesto de puño cerrado */
  const centro = obtenerCentroMano(resultado);
  const punyoCerrado = detectarPunyoCerrado(resultado);

  /* Si no hay centro, se reinician las variables */
  if (!centro) {
    gestoReferenciaMano = null;
    gestoUltimaDeteccionMs = 0;
    gestoPunyoActivo = false;
    return;
  }

  /* Si se detecta el gesto de puño cerrado y no está activo, se activa */
  if (punyoCerrado && !gestoPunyoActivo) {
    gestoPunyoActivo = true;

    /* Si ha pasado el tiempo de cooldown y se puede seleccionar, se selecciona */
    if (
      /* Lo que se hace es comparar la diferencia de tiempo entre el último gesto de puño cerrado y el actual.
      Esto se calcula con la constante COOLDOWN_GESTO_SELECCION_MS que es de 1000 ms */
      ahoraMs - gestoUltimaSeleccionMs >= COOLDOWN_GESTO_SELECCION_MS &&
      /* Se comprueba si se puede seleccionar */
      navegacion.seleccionarActual()
    ) {
      /* Se actualiza el tiempo de la última selección y de la última acción */
      gestoUltimaSeleccionMs = ahoraMs;
      gestoUltimaAccionMs = ahoraMs;
      /* Se actualiza la referencia de la mano */
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
      /* Se vibra la asistencia */
      vibrarAsistencia(36);
      return;
    }
  /* Si no se detecta el gesto de puño cerrado, se desactiva */
  } else if (!punyoCerrado) {
    gestoPunyoActivo = false;
  }

  /* Si no hay referencia de la mano o no ha pasado el tiempo de reinicio, se reinicia */
  if (
    !gestoReferenciaMano ||
    !gestoUltimaDeteccionMs ||
    ahoraMs - gestoUltimaDeteccionMs > REINICIO_REFERENCIA_MANO_MS  /* Esto es para que no se pierda la referencia de la mano */
  ) {
    /* Se actualiza la referencia de la mano y el tiempo de la última detección */
    gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
    gestoUltimaDeteccionMs = ahoraMs;
    return;
  }

  gestoUltimaDeteccionMs = ahoraMs;  // Se actualiza el tiempo de la última detección

  /* Si ha pasado el tiempo de cooldown, se ejecuta la acción de movimiento */
  if (ahoraMs - gestoUltimaAccionMs < COOLDOWN_GESTO_AEREO_MS) {
    return;
  }

  /* Se calcula la diferencia de posición entre la mano actual y la referencia. 
  Esto se emplea más adelante para interpretar la dirección del gesto */
  const diffX = centro.x - gestoReferenciaMano.x;
  const diffY = centro.y - gestoReferenciaMano.y;
  /* Se interpreta la dirección del gesto */
  const accion = interpretarDireccionGestoAereo(diffX, diffY);

  /* Si no se interpreta ninguna acción, se reinicia la referencia de la mano */
  if (!accion) {
    /* Si la diferencia de posición es muy pequeña, se reinicia la referencia de la mano */
    if (Math.abs(diffX) < 0.03 && Math.abs(diffY) < 0.03) {
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
    /* Si ha pasado mucho tiempo desde la última detección, se reinicia la referencia de la mano */
    } else if (ahoraMs - gestoReferenciaMano.tiempo > 700) {
      gestoReferenciaMano = { ...centro, tiempo: ahoraMs };
    }
    return;
  }

  /* Se ejecuta la acción y se vibra la asistencia */
  navegacion.ejecutarAccion(accion);
  vibrarAsistencia();
  /* Se actualiza el tiempo de la última acción y se reinicia la referencia de la mano */
  gestoUltimaAccionMs = ahoraMs;
  gestoReferenciaMano = null;
}

/* Bucle que se ejecuta mientras el menú de gestos está activo. Coge lo que se está
grabando en el elemento video oculto creado en obtenerVideoGestos() y se lo pasa
al modelo gestoRecognizer. Luego llama a la fucnión procesarMovimientoMano() para
procesar el gesto */
function bucleGestosMano() {
  /* Si no está activo el menú de gestos o no se ha cargado el reconocedor o el video, se sale */
  if (!window.gestosMenuActivo || !gestoRecognizer || !gestoVideo) return;

  /* Si el video está listo y no ha pasado el tiempo de reinicio entonces 
  se procesa el gesto */
  if (
    /* readyState >= 2 significa que el video está listo para ser procesado */
    gestoVideo.readyState >= 2 &&
    /* currentTime !== gestoLastVideoTime significa que el video ha avanzado */
    gestoVideo.currentTime !== gestoLastVideoTime
  ) {
    /* Se actualiza el tiempo de la última detección */
    const ahoraMs = performance.now();
    gestoLastVideoTime = gestoVideo.currentTime;
    /* Se procesa el gesto */
    const resultado = gestoRecognizer.recognizeForVideo(gestoVideo, ahoraMs);
    procesarMovimientoMano(resultado, ahoraMs);
  }

  /* Se solicita el siguiente frame */
  gestoRAF = requestAnimationFrame(bucleGestosMano);
}

/* Función que activa la cámara para gestos aéreos */
async function activarCamaraGestosMenu() {
  /* Si no se puede acceder a la cámara, se lanza un error */
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Tu navegador no permite usar la cámara para gestos aéreos.");
  }

  /* Si no está activa la navegación asistida, se lanza un error */
  if (!obtenerNavegacionAsistida()) {
    throw new Error("La navegación asistida no está disponible todavía.");
  }

  /* Se detiene la cámara y se carga el reconocedor */
  detenerCamaraGestosMenu();
  await cargarRecognizerGestosMano();
  const video = obtenerVideoGestos();

  /*Esto es para acceder a la cámara frontal. */
  gestoCameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  });

  /* Se asigna el stream de la cámara al video */
  video.srcObject = gestoCameraStream;
  /* Se espera a que el video esté listo */
  await new Promise((resolve) => {
    /* Si el video está listo, se resuelve la promesa */
    if (video.readyState >= 1) {
      resolve();
      return;
    }
    /* Si no, se espera a que se dispare el evento onloadedmetadata */
    video.onloadedmetadata = () => resolve();
  });
  /* Se reproduce el video */
  await video.play();

  /* Se inicializan las variables del control por gestos aéreos */
  gestoLastVideoTime = -1;
  gestoReferenciaMano = null;
  gestoUltimaDeteccionMs = 0;
  gestoUltimaAccionMs = 0;
  gestoPunyoActivo = false;
  gestoUltimaSeleccionMs = 0;

  /* Si existe el elemento estadoRuta, se actualiza su texto para indicar que el control por gestos aéreos está activo */
  if (typeof estadoRuta !== "undefined" && estadoRuta) {
    estadoRuta.textContent = "Control por gestos aéreo activo. Mueve la mano frente a la cámara frontal y cierra el puño para aceptar.";
  }

  /* Se inicia el bucle de detección de gestos */
  bucleGestosMano();
}

/* Función que desactiva el control por gestos aéreos. */
function desactivarControlGestos() {
  window.gestosMenuActivo = false;     // Se desactiva el control por gestos aéreos
  /* Si existe el botón, se elimina la clase activo */
  if (btnActivarGestosMenu) btnActivarGestosMenu.classList.remove("activo");
  /* Se detiene la cámara y se limpia el foco */
  detenerCamaraGestosMenu();
  obtenerNavegacionAsistida()?.limpiarFoco();
}

/* Event listener para el botón de activación del control por gestos aéreos */
if (btnActivarGestosMenu) {
  btnActivarGestosMenu.addEventListener("click", async () => {
    /* Si el control por gestos aéreos está activo, se desactiva */
    if (window.gestosMenuActivo) {
      desactivarControlGestos();
      return;
    }

    /* Si el control por tilt está activo, se desactiva */
    if (typeof window.desactivarControlTiltMenu === "function") {
      window.desactivarControlTiltMenu();
    }

    window.gestosMenuActivo = true;
    /* Se activa el control por gestos aéreos */
    try {
      /* Se añade la clase activo al botón */
      btnActivarGestosMenu.classList.add("activo");
      /* Se actualizan los elementos y se pinta el foco */
      obtenerNavegacionAsistida()?.actualizarElementos();
      obtenerNavegacionAsistida()?.pintarFoco();
      /* Se activa la cámara */
      await activarCamaraGestosMenu();
      /* Se refresca el foco */
      obtenerNavegacionAsistida()?.refrescarFoco();
    } catch (error) {
      /* Si hay un error, se desactiva el control por gestos aéreos */
      console.error("No se pudo activar el control por gestos aéreo:", error);
      alert("No se pudo activar el control por gestos con la cámara frontal.");
      desactivarControlGestos();
    }
  });
}

window.desactivarControlGestosMenu = desactivarControlGestos; // Se exporta la función para que pueda ser llamada desde otros módulos

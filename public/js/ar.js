// =========================
// MODO REALIDAD AUMENTADA (AR)
// =========================

// Variable global que indica si ahora mismo el modo AR está activado o no.
let isARMode = false;

// Variable donde guardaremos el stream de vídeo de la cámara del móvil.
let videoStream = null;

// Variable para guardar el identificador de la animación del canvas.
let arAnimation = null;

// Variable que guarda el rumbo actual del móvil ya procesado.
let rumboActual = 0;

// Variable auxiliar para suavizar el rumbo y evitar temblores.
let rumboSuavizado = 0;

// Referencias DOM locales (independientes de pantalla.js).
const botonARPrincipal = document.getElementById("btnAR");
const botonARTarjeta = document.getElementById("btnARTarjetaRuta");
const contenedorARLocal = document.getElementById("contenedorAR");
const videoARLocal = document.getElementById("videoAR");
const canvasARLocal = document.getElementById("canvasAR");

// =========================
// AJUSTES DE AR
// =========================

// Distancia mínima que debe haber entre el usuario y el objetivo AR para que no apunte demasiado cerca.
const DISTANCIA_MINIMA_OBJETIVO_AR = 12;

// Distancia ideal por delante sobre la ruta para elegir el punto al que debe apuntar la flecha.
const DISTANCIA_ADELANTE_OBJETIVO_AR = 18;

// Número de puntos de la ruta que miramos alrededor del paso actual para estabilizar mejor el objetivo.
const PUNTOS_VENTANA_BUSQUEDA_AR = 35;

// Factor de suavizado del rumbo objetivo real de la ruta.
const SUAVIZADO_RUMBO_OBJETIVO = 0.14;

// Factor de suavizado de la rotación visual de la flecha.
const SUAVIZADO_ROTACION_FLECHA = 0.16;

// Margen en grados para considerar que el móvil ya va prácticamente recto.
const ZONA_MUERTA_RECTO_GRADOS = 12;

// Límite visual máximo de giro de la flecha para que no haga rotaciones exageradas.
const LIMITE_GIRO_VISUAL_GRADOS = 145;

// Variable donde guardamos el rumbo objetivo ya suavizado.
let rumboObjetivoSuavizadoAR = null;

// Variable donde guardamos el ángulo final que se está dibujando en pantalla.
let anguloFlechaRenderizadoAR = null;

// =========================
// FUNCIONES DE ÁNGULOS Y RUMBO
// =========================

// Función que calcula el rumbo entre dos puntos GPS.
function calcularRumbo(lat1, lon1, lat2, lon2) {
  // Función auxiliar que convierte grados a radianes.
  const aRadianes = (p) => (p * Math.PI) / 180;

  // Función auxiliar que convierte radianes a grados.
  const aGrados = (p) => (p * 180) / Math.PI;

  // Calculamos la diferencia de longitud en radianes.
  const difLon = aRadianes(lon2 - lon1);

  // Primera parte de la fórmula del rumbo.
  const y = Math.sin(difLon) * Math.cos(aRadianes(lat2));

  // Segunda parte de la fórmula del rumbo.
  const x =
    Math.cos(aRadianes(lat1)) * Math.sin(aRadianes(lat2)) -
    Math.sin(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.cos(difLon);

  // Calculamos el rumbo en grados usando atan2.
  let rumbo = aGrados(Math.atan2(y, x));

  // Lo normalizamos para que siempre esté entre 0 y 360.
  return (rumbo + 360) % 360;
}

// Función que normaliza un ángulo al rango 0..360.
function normalizarAngulo(angulo) {
  // Devolvemos el ángulo ajustado al rango circular correcto.
  return (angulo % 360 + 360) % 360;
}

// Función que calcula la diferencia mínima entre dos ángulos en grados.
function restaAngulos(a, b) {
  // Calculamos la diferencia normalizada.
  let diff = normalizarAngulo(a - b);

  // Si la diferencia supera 180, la corregimos para coger el camino corto.
  if (diff > 180) diff -= 360;

  // Devolvemos la diferencia final.
  return diff;
}

// Función que normaliza un ángulo en radianes al rango 0..2PI.
function normalizarRadianes(angulo) {
  // Guardamos el valor de una vuelta completa en radianes.
  const dosPi = Math.PI * 2;

  // Normalizamos el ángulo dentro del rango correcto.
  return (angulo % dosPi + dosPi) % dosPi;
}

// Función que calcula la diferencia mínima entre dos ángulos en radianes.
function restaAngulosRad(a, b) {
  // Calculamos la diferencia normalizada.
  let diff = normalizarRadianes(a - b);

  // Si la diferencia es mayor que PI, la corregimos para coger el camino más corto.
  if (diff > Math.PI) diff -= Math.PI * 2;

  // Devolvemos la diferencia final.
  return diff;
}

// Función que convierte grados a radianes.
function gradosARadianes(grados) {
  // Aplicamos la fórmula de conversión y devolvemos el resultado.
  return (grados * Math.PI) / 180;
}

// Función que limita un valor entre un mínimo y un máximo.
function limitar(valor, min, max) {
  // Devolvemos el valor ajustado al intervalo permitido.
  return Math.max(min, Math.min(max, valor));
}

// =========================
// FUNCIONES PARA ESTABILIZAR LA FLECHA
// =========================

// Función que obtiene el índice base desde donde conviene empezar a buscar el objetivo AR.
function obtenerIndiceBaseAR() {
  // Comprobamos que exista un paso actual válido con índice asociado en la ruta.
  if (
    indicePasoActual >= 0 &&
    instruccionesRuta &&
    instruccionesRuta[indicePasoActual] &&
    typeof instruccionesRuta[indicePasoActual].index === "number"
  ) {
    // Si existe, devolvemos ese índice.
    return instruccionesRuta[indicePasoActual].index;
  }

  // Si no existe nada válido, devolvemos 0 como punto de partida.
  return 0;
}

// Función que busca el punto más cercano de la ruta dentro de una ventana local.
function buscarPuntoMasCercanoAR(indiceBase) {
  // Si no hay coordenadas de ruta, devolvemos -1.
  if (!coordenadasRuta || !coordenadasRuta.length) {
    return -1;
  }

  // Guardamos el índice del último punto de la ruta.
  const ultimoIndice = coordenadasRuta.length - 1;

  // Calculamos el inicio de la ventana de búsqueda.
  const inicio = Math.max(0, indiceBase - 6);

  // Calculamos el final de la ventana de búsqueda.
  const fin = Math.min(ultimoIndice, indiceBase + PUNTOS_VENTANA_BUSQUEDA_AR);

  // Inicializamos el mejor índice con el inicio.
  let mejorIndice = inicio;

  // Inicializamos la mejor distancia con infinito.
  let mejorDistancia = Infinity;

  // Recorremos todos los puntos de la ventana.
  for (let i = inicio; i <= fin; i++) {
    // Cogemos el punto actual.
    const p = coordenadasRuta[i];

    // Si el punto no existe, pasamos al siguiente.
    if (!p) continue;

    // Calculamos la distancia entre el usuario y ese punto.
    const dist = distanciaEnMetros(miLatitud, miLongitud, p.lat, p.lng);

    // Si esta distancia es mejor que la mejor anterior, actualizamos.
    if (dist < mejorDistancia) {
      // Guardamos la nueva mejor distancia.
      mejorDistancia = dist;

      // Guardamos el nuevo mejor índice.
      mejorIndice = i;
    }
  }

  // Devolvemos el índice del punto más cercano.
  return mejorIndice;
}

// Función que calcula el objetivo AR real que debe seguir la flecha.
function obtenerObjetivoAR() {
  // Si no tenemos posición o ruta, devolvemos null.
  if (
    miLatitud === null ||
    miLongitud === null ||
    !coordenadasRuta ||
    !coordenadasRuta.length
  ) {
    return null;
  }

  // Obtenemos el punto base desde el que empezar a buscar.
  const indiceBase = obtenerIndiceBaseAR();

  // Buscamos el punto de la ruta más cercano al usuario en esa zona.
  const indiceCercano = buscarPuntoMasCercanoAR(indiceBase);

  // Si no se encontró ninguno, devolvemos null.
  if (indiceCercano < 0) {
    return null;
  }

  // Guardamos el índice del último punto de la ruta.
  const ultimoIndice = coordenadasRuta.length - 1;

  // Inicializamos la distancia acumulada a 0.
  let distanciaAcumulada = 0;

  // Inicializamos el índice objetivo con el punto cercano.
  let indiceObjetivo = indiceCercano;

  // Recorremos la ruta desde el punto cercano hacia adelante.
  for (let i = indiceCercano; i < ultimoIndice; i++) {
    // Cogemos el punto actual del segmento.
    const p1 = coordenadasRuta[i];

    // Cogemos el siguiente punto del segmento.
    const p2 = coordenadasRuta[i + 1];

    // Si alguno de los dos no existe, seguimos.
    if (!p1 || !p2) continue;

    // Sumamos la distancia del segmento actual.
    distanciaAcumulada += distanciaEnMetros(p1.lat, p1.lng, p2.lat, p2.lng);

    // Actualizamos el índice objetivo al siguiente punto.
    indiceObjetivo = i + 1;

    // Si ya hemos avanzado suficiente sobre la ruta, paramos.
    if (distanciaAcumulada >= DISTANCIA_ADELANTE_OBJETIVO_AR) {
      break;
    }
  }

  // Obtenemos el punto objetivo calculado.
  const objetivo = coordenadasRuta[indiceObjetivo];

  // Si por cualquier motivo no existe, devolvemos el último punto de la ruta.
  if (!objetivo) {
    return coordenadasRuta[ultimoIndice];
  }

  // Calculamos la distancia del usuario al objetivo.
  const distUsuarioObjetivo = distanciaEnMetros(
    miLatitud,
    miLongitud,
    objetivo.lat,
    objetivo.lng
  );

  // Si el objetivo está demasiado cerca, miramos un poco más adelante.
  if (distUsuarioObjetivo < DISTANCIA_MINIMA_OBJETIVO_AR) {
    return coordenadasRuta[Math.min(indiceObjetivo + 2, ultimoIndice)];
  }

  // Devolvemos el objetivo final.
  return objetivo;
}

// =========================
// BRÚJULA / ORIENTACIÓN
// =========================

// Función que lee la orientación del dispositivo y actualiza el rumbo actual.
function leerGravedadYBrujula(event) {
  // Variable temporal para guardar el rumbo leído en bruto.
  let rumboCrudo = null;

  // Si estamos en iPhone y existe webkitCompassHeading, usamos esa referencia.
  if (
    event.webkitCompassHeading !== undefined &&
    event.webkitCompassHeading !== null
  ) {
    // Guardamos el valor del compás.
    rumboCrudo = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    // En otros dispositivos usamos alpha invertido para obtener el rumbo.
    rumboCrudo = 360 - event.alpha;
  }

  // Si conseguimos un valor válido de rumbo, lo procesamos.
  if (rumboCrudo !== null) {
    // Calculamos la diferencia entre el rumbo nuevo y el rumbo suavizado actual.
    let diff = rumboCrudo - rumboSuavizado;

    // Corregimos saltos grandes al pasar por 0/360.
    if (diff > 180) diff -= 360;

    // Corregimos saltos negativos al pasar por 360/0.
    if (diff < -180) diff += 360;

    // Aplicamos suavizado para evitar movimientos bruscos.
    rumboSuavizado += diff * 0.08;

    // Si se ha ido por debajo de 0, lo recolocamos en el rango correcto.
    if (rumboSuavizado < 0) rumboSuavizado += 360;

    // Si se ha ido por encima de 360, lo recolocamos en el rango correcto.
    if (rumboSuavizado >= 360) rumboSuavizado -= 360;

    // Guardamos el rumbo final ya suavizado.
    rumboActual = rumboSuavizado;
  }
}

// =========================
// DIBUJADO DE FLECHA TIPO "SUELO"
// =========================

// Función que dibuja una flecha con efecto de profundidad sobre el suelo.
function dibujarFlechaSuelo(ctx, cx, cy, angulo) {
  // Guardamos el estado actual del canvas.
  ctx.save();

  // Trasladamos el origen al punto donde queremos dibujar la flecha.
  ctx.translate(cx, cy);

  // Rotamos el contexto según el ángulo calculado.
  ctx.rotate(angulo);

  // Escalamos verticalmente para simular perspectiva.
  ctx.scale(1, 0.58);

  // Configuramos la sombra general.
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";

  // Damos algo de desenfoque a la sombra.
  ctx.shadowBlur = 22;

  // Desplazamos la sombra en horizontal.
  ctx.shadowOffsetX = 0;

  // Desplazamos la sombra en vertical.
  ctx.shadowOffsetY = 8;

  // Definimos varias piezas de flecha para dar sensación de profundidad.
  const piezas = [
    { y: 0, escala: 1.0, alpha: 0.95 },
    { y: -78, escala: 0.78, alpha: 0.72 },
    { y: -138, escala: 0.58, alpha: 0.48 }
  ];

  // Recorremos cada pieza para dibujarla.
  piezas.forEach((pieza, index) => {
    // Guardamos estado antes de dibujar esta pieza.
    ctx.save();

    // Movemos la pieza a su altura.
    ctx.translate(0, pieza.y);

    // Escalamos la pieza según la profundidad.
    ctx.scale(pieza.escala, pieza.escala);

    // Si la pieza está más lejos, reducimos un poco la fuerza visual.
    if (index > 0) {
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }

    // Empezamos a dibujar la forma principal de la flecha.
    ctx.beginPath();

    // Punto superior de la punta.
    ctx.moveTo(0, -78);

    // Lado derecho exterior.
    ctx.lineTo(62, 0);

    // Lado derecho interior.
    ctx.lineTo(24, 0);

    // Centro de la flecha.
    ctx.lineTo(0, -28);

    // Lado izquierdo interior.
    ctx.lineTo(-24, 0);

    // Lado izquierdo exterior.
    ctx.lineTo(-62, 0);

    // Cerramos la figura.
    ctx.closePath();

    // Color principal de relleno.
    ctx.fillStyle = `rgba(0, 119, 255, ${pieza.alpha})`;

    // Rellenamos la flecha.
    ctx.fill();

    // Configuramos el borde blanco.
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(255,255,255,${0.92 * pieza.alpha})`;

    // Dibujamos el borde.
    ctx.stroke();

    // Quitamos la sombra para el brillo interior.
    ctx.shadowColor = "transparent";

    // Grosor del brillo interior.
    ctx.lineWidth = 2;

    // Color del brillo interior.
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * pieza.alpha})`;

    // Dibujamos ese brillo.
    ctx.stroke();

    // Restauramos el estado tras esta pieza.
    ctx.restore();
  });

  // Creamos un gradiente vertical para simular una guía luminosa en el suelo.
  const gradiente = ctx.createLinearGradient(0, 36, 0, -180);

  // Parte inferior del gradiente.
  gradiente.addColorStop(0, "rgba(0,119,255,0.18)");

  // Parte superior del gradiente.
  gradiente.addColorStop(1, "rgba(0,119,255,0)");

  // Quitamos sombra para esta guía.
  ctx.shadowColor = "transparent";

  // Empezamos a dibujar la guía luminosa.
  ctx.beginPath();

  // Esquina inferior izquierda.
  ctx.moveTo(-22, 26);

  // Esquina inferior derecha.
  ctx.lineTo(22, 26);

  // Esquina superior derecha.
  ctx.lineTo(12, -180);

  // Esquina superior izquierda.
  ctx.lineTo(-12, -180);

  // Cerramos la forma.
  ctx.closePath();

  // Aplicamos el gradiente como relleno.
  ctx.fillStyle = gradiente;

  // Rellenamos la guía.
  ctx.fill();

  // Restauramos el estado original del canvas.
  ctx.restore();
}

// =========================
// DIBUJADO DEL AR
// =========================

// Función principal que pinta la flecha AR en cada frame.
function pintarFlechaAR() {
  // Si el modo AR no está activo, no hacemos nada.
  if (!isARMode) return;

  // Si el tamaño del canvas no coincide con la pantalla, lo actualizamos.
  if (
    canvasARLocal.width !== window.innerWidth ||
    canvasARLocal.height !== window.innerHeight
  ) {
    canvasARLocal.width = window.innerWidth;
    canvasARLocal.height = window.innerHeight;
  }

  // Obtenemos el contexto 2D del canvas.
  const ctx = canvasARLocal.getContext("2d");

  // Limpiamos el canvas antes de dibujar el nuevo frame.
  ctx.clearRect(0, 0, canvasARLocal.width, canvasARLocal.height);

  // Solo seguimos si tenemos posición y una ruta calculada.
  if (
    miLatitud !== null &&
    miLongitud !== null &&
    coordenadasRuta &&
    coordenadasRuta.length > 0
  ) {
    // Obtenemos el punto objetivo actual para la flecha.
    const objetivoPaso = obtenerObjetivoAR();

    // Si existe un objetivo válido, seguimos.
    if (objetivoPaso) {
      // Calculamos el rumbo bruto hacia ese objetivo.
      const rumboObjetivoCrudo = calcularRumbo(
        miLatitud,
        miLongitud,
        objetivoPaso.lat,
        objetivoPaso.lng
      );

      // Si aún no había rumbo objetivo suavizado, lo inicializamos.
      if (rumboObjetivoSuavizadoAR === null) {
        rumboObjetivoSuavizadoAR = rumboObjetivoCrudo;
      } else {
        // Calculamos la diferencia angular entre el nuevo rumbo y el suavizado.
        const diffObjetivo = restaAngulos(
          rumboObjetivoCrudo,
          rumboObjetivoSuavizadoAR
        );

        // Suavizamos el rumbo objetivo.
        rumboObjetivoSuavizadoAR = normalizarAngulo(
          rumboObjetivoSuavizadoAR + diffObjetivo * SUAVIZADO_RUMBO_OBJETIVO
        );
      }

      // Calculamos la diferencia entre hacia dónde hay que ir y hacia dónde apunta el móvil.
      let anguloRelativo = restaAngulos(rumboObjetivoSuavizadoAR, rumboActual);

      // Si el error es pequeño, lo consideramos recto.
      if (Math.abs(anguloRelativo) < ZONA_MUERTA_RECTO_GRADOS) {
        anguloRelativo = 0;
      }

      // Convertimos el ángulo a radianes y además limitamos el giro máximo.
      const anguloObjetivoRad = gradosARadianes(
        limitar(
          anguloRelativo,
          -LIMITE_GIRO_VISUAL_GRADOS,
          LIMITE_GIRO_VISUAL_GRADOS
        )
      );

      // Si aún no había ángulo renderizado, lo inicializamos.
      if (anguloFlechaRenderizadoAR === null) {
        anguloFlechaRenderizadoAR = anguloObjetivoRad;
      } else {
        // Calculamos la diferencia angular visual entre el nuevo ángulo y el actual.
        const diffRot = restaAngulosRad(
          anguloObjetivoRad,
          anguloFlechaRenderizadoAR
        );

        // Suavizamos la rotación final de la flecha.
        anguloFlechaRenderizadoAR = normalizarRadianes(
          anguloFlechaRenderizadoAR + diffRot * SUAVIZADO_ROTACION_FLECHA
        );
      }

      // Coordenada horizontal de la flecha.
      const cx = canvasARLocal.width / 2;

      // Altura por defecto de la flecha si no hay tarjeta inferior.
      let cy = canvasARLocal.height * 0.68;

      // Si la tarjeta de ruta está visible, subimos la flecha para que no la tape.
      if (
        typeof tarjetaRuta !== "undefined" &&
        tarjetaRuta &&
        !tarjetaRuta.classList.contains("oculto")
      ) {
        // Obtenemos la posición real de la tarjeta en pantalla.
        const rectTarjeta = tarjetaRuta.getBoundingClientRect();

        // Colocamos la flecha por encima de la tarjeta.
        cy = rectTarjeta.top - 130;
      }

      // Limitamos la altura de la flecha para que no suba o baje demasiado.
      cy = Math.max(canvasARLocal.height * 0.45, Math.min(cy, canvasARLocal.height * 0.72));

      // Dibujamos la flecha final con efecto suelo.
      dibujarFlechaSuelo(ctx, cx, cy, anguloFlechaRenderizadoAR);
    }
  }

  // Pedimos el siguiente frame de animación.
  arAnimation = requestAnimationFrame(pintarFlechaAR);
}

// =========================
// ACTIVAR / DESACTIVAR AR
// =========================

// Función principal para encender o apagar el modo AR.
async function activarDesactivarAR() {
  if (!contenedorARLocal || !videoARLocal || !canvasARLocal) {
    if (typeof estadoRuta !== "undefined" && estadoRuta) {
      estadoRuta.textContent = "No se pudo iniciar AR: faltan elementos de interfaz AR.";
    }
    return;
  }

  if (typeof estadoRuta !== "undefined" && estadoRuta) {
    estadoRuta.textContent = "Intentando activar/desactivar modo AR...";
  }

  // Si AR ya está activado, lo apagamos.
  if (isARMode) {
    // Marcamos que AR ya no está activo.
    isARMode = false;

    // Cambiamos el texto del botón superior si existe.
    if (botonARPrincipal) {
      botonARPrincipal.textContent = "Activar Cámara AR";
    }

    // Cambiamos también el texto del botón de la tarjeta si existe.
    if (botonARTarjeta) {
      botonARTarjeta.innerHTML =
        '<span class="material-symbols-outlined">view_in_ar</span> AR';
    }

    // Quitamos la clase visual de modo AR del body.
    document.body.classList.remove("modo-ar");

    // Ocultamos el contenedor AR.
    if (contenedorARLocal) {
      contenedorARLocal.classList.add("oculto");
    }

    // Reseteamos variables de dibujo.
    rumboObjetivoSuavizadoAR = null;
    anguloFlechaRenderizadoAR = null;

    // Si había cámara abierta, la cerramos.
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }

    // Si había animación en marcha, la cancelamos.
    if (arAnimation) {
      cancelAnimationFrame(arAnimation);
      arAnimation = null;
    }

    // Quitamos los listeners de orientación.
    window.removeEventListener("deviceorientationabsolute", leerGravedadYBrujula);
    window.removeEventListener("deviceorientation", leerGravedadYBrujula);

    // Forzamos a Leaflet a recalcular el tamaño del mapa al volver.
    setTimeout(() => {
      mapa.invalidateSize();
    }, 500);

    // Salimos de la función.
    return;
  }

  // Permitimos abrir AR aunque no haya ruta.
  // En ese caso se verá la cámara y la flecha aparecerá cuando exista una ruta activa.
  if ((!coordenadasRuta || !coordenadasRuta.length) && estadoRuta) {
    estadoRuta.textContent =
      "Modo AR activado. Calcula una ruta para mostrar la flecha de navegación.";
  }

  // En iPhone pedimos permiso para acceder a la orientación del dispositivo.
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      // Pedimos permiso.
      const permissionState = await DeviceOrientationEvent.requestPermission();

      // Si no lo concede, mostramos aviso.
      if (permissionState !== "granted") {
        alert(
          "Necesitamos acceso a la brújula para que la flecha gire correctamente."
        );
        return;
      }
    } catch (error) {
      // Si falla la petición de permisos, avisamos.
      console.error("Error al pedir permisos de brújula", error);
      alert("Ocurrió un error al acceder a la brújula.");
      return;
    }
  }

  try {
    // Pedimos acceso a la cámara trasera del dispositivo.
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    // Asignamos el stream al elemento de vídeo.
    videoARLocal.srcObject = videoStream;

    // Intentamos reproducir el vídeo.
    videoARLocal.play().catch((e) => {
      console.warn("Autoplay evitado por el navegador", e);
    });

    // Marcamos que AR está activo.
    isARMode = true;

    // Cambiamos el texto del botón superior si existe.
    if (botonARPrincipal) {
      botonARPrincipal.textContent = "Desactivar AR";
    }

    // Cambiamos también el botón de la tarjeta si existe.
    if (botonARTarjeta) {
      botonARTarjeta.innerHTML =
        '<span class="material-symbols-outlined">exit_to_app</span> Salir AR';
    }

    // Reseteamos los valores de dibujado.
    rumboObjetivoSuavizadoAR = null;
    anguloFlechaRenderizadoAR = null;

    // Mostramos el contenedor AR.
    contenedorARLocal.classList.remove("oculto");

    // Añadimos clase visual al body.
    document.body.classList.add("modo-ar");

    // Activamos los listeners de orientación.
    window.addEventListener(
      "deviceorientationabsolute",
      leerGravedadYBrujula,
      true
    );
    window.addEventListener("deviceorientation", leerGravedadYBrujula, true);

    // Arrancamos el bucle de pintado de la flecha.
    pintarFlechaAR();

    // Forzamos a Leaflet a recalcular tamaño.
    setTimeout(() => {
      mapa.invalidateSize();
    }, 500);
  } catch (error) {
    // Si falla la cámara, mostramos error.
    console.error("No se pudo acceder a la cámara:", error);
    alert("Error cámara: " + error.name + " - " + error.message);
  }
}

// =========================
// VISIBILIDAD DE PESTAÑA
// =========================

// Cuando la pestaña pasa a segundo plano, cerramos bien AR para que no se quede bloqueado.
document.addEventListener("visibilitychange", () => {
  // Si la pestaña está oculta y AR estaba activo, limpiamos todo.
  if (document.hidden && isARMode) {
    // Si había cámara abierta, la cerramos.
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      videoStream = null;
    }

    // Paramos el vídeo.
    videoARLocal.pause();

    // Quitamos el stream del vídeo.
    videoARLocal.srcObject = null;

    // Cancelamos la animación del canvas.
    if (arAnimation) {
      cancelAnimationFrame(arAnimation);
      arAnimation = null;
    }

    // Reseteamos variables visuales.
    rumboObjetivoSuavizadoAR = null;
    anguloFlechaRenderizadoAR = null;

    // Marcamos AR como apagado.
    isARMode = false;

    // Restauramos el texto del botón superior si existe.
    if (botonARPrincipal) {
      botonARPrincipal.textContent = "Activar Cámara AR";
    }

    // Restauramos el texto del botón de la tarjeta si existe.
    if (botonARTarjeta) {
      botonARTarjeta.innerHTML =
        '<span class="material-symbols-outlined">view_in_ar</span> AR';
    }

    // Quitamos la clase visual del body.
    document.body.classList.remove("modo-ar");

    // Ocultamos el contenedor AR.
    contenedorARLocal.classList.add("oculto");
  }
});

// Enlaza el botón AR principal con la función de activar/desactivar.
if (botonARPrincipal) {
  botonARPrincipal.addEventListener("click", activarDesactivarAR);
}

// Compatibilidad por si algún flujo antiguo sigue llamando al nombre anterior.
window.toggleAR = activarDesactivarAR;
window.activarDesactivarAR = activarDesactivarAR;

// Refuerzo del botón AR de la tarjeta inferior.
if (botonARTarjeta) {
  botonARTarjeta.addEventListener("click", activarDesactivarAR);
}

// =========================
// MODO REALIDAD AUMENTADA (AR)
// =========================

// Variables de compatibilidad usadas desde otros archivos.
let isARMode = false;
let videoStream = null;
let arAnimation = null;
let rumboActual = 0;
let rumboSuavizado = 0;

// =========================
// AJUSTES DE AR
// =========================

const DISTANCIA_MINIMA_OBJETIVO_AR = 12;
const DISTANCIA_ADELANTE_OBJETIVO_AR = 18;
const PUNTOS_VENTANA_BUSQUEDA_AR = 35;
const SUAVIZADO_RUMBO_OBJETIVO = 0.14;
const SUAVIZADO_ROTACION_FLECHA = 0.16;
const ZONA_MUERTA_RECTO_GRADOS = 12;

// =========================
// UTILIDADES DE ANGULOS
// =========================

// Calcula el rumbo geográfico (0-360) desde un punto a otro.
function calcularRumbo(lat1, lon1, lat2, lon2) {
  const aRadianes = (valor) => (valor * Math.PI) / 180;
  const aGrados = (valor) => (valor * 180) / Math.PI;
  const difLon = aRadianes(lon2 - lon1);

  const y = Math.sin(difLon) * Math.cos(aRadianes(lat2));
  const x = Math.cos(aRadianes(lat1)) * Math.sin(aRadianes(lat2))
    - Math.sin(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.cos(difLon);

  const rumbo = aGrados(Math.atan2(y, x));
  return (rumbo + 360) % 360;
}

function normalizarAngulo(angulo) {
  return (angulo % 360 + 360) % 360;
}

function restaAngulos(a, b) {
  let diferencia = normalizarAngulo(a - b);
  if (diferencia > 180) diferencia -= 360;
  return diferencia;
}

function normalizarRadianes(angulo) {
  const dosPi = Math.PI * 2;
  return (angulo % dosPi + dosPi) % dosPi;
}

function restaAngulosRad(a, b) {
  let diferencia = normalizarRadianes(a - b);
  if (diferencia > Math.PI) diferencia -= Math.PI * 2;
  return diferencia;
}

function gradosARadianes(grados) {
  return (grados * Math.PI) / 180;
}

function limitar(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

// =========================
// OBJETIVO DE FLECHA AR
// =========================

// Obtiene el índice base de la instrucción actual para empezar la búsqueda.
function obtenerIndiceBaseAR() {
  if (
    indicePasoActual >= 0
    && instruccionesRuta
    && instruccionesRuta[indicePasoActual]
    && typeof instruccionesRuta[indicePasoActual].index === "number"
  ) {
    return instruccionesRuta[indicePasoActual].index;
  }
  return 0;
}

// Busca en una ventana cercana el punto de ruta más próximo al usuario.
function buscarPuntoMasCercanoAR(indiceBase) {
  if (!coordenadasRuta || !coordenadasRuta.length) return -1;

  const ultimoIndice = coordenadasRuta.length - 1;
  const inicio = Math.max(0, indiceBase - 6);
  const fin = Math.min(ultimoIndice, indiceBase + PUNTOS_VENTANA_BUSQUEDA_AR);

  let mejorIndice = inicio;
  let mejorDistancia = Infinity;

  for (let i = inicio; i <= fin; i++) {
    const punto = coordenadasRuta[i];
    if (!punto) continue;
    const distancia = distanciaEnMetros(miLatitud, miLongitud, punto.lat, punto.lng);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejorIndice = i;
    }
  }

  return mejorIndice;
}

// Devuelve un punto objetivo "por delante" para estabilizar la flecha.
function obtenerObjetivoAR() {
  if (miLatitud === null || miLongitud === null || !coordenadasRuta || !coordenadasRuta.length) {
    return null;
  }

  const indiceBase = obtenerIndiceBaseAR();
  const indiceCercano = buscarPuntoMasCercanoAR(indiceBase);
  if (indiceCercano < 0) return null;

  const ultimoIndice = coordenadasRuta.length - 1;
  let distanciaAcumulada = 0;
  let indiceObjetivo = indiceCercano;

  for (let i = indiceCercano; i < ultimoIndice; i++) {
    const p1 = coordenadasRuta[i];
    const p2 = coordenadasRuta[i + 1];
    if (!p1 || !p2) continue;
    distanciaAcumulada += distanciaEnMetros(p1.lat, p1.lng, p2.lat, p2.lng);
    indiceObjetivo = i + 1;
    if (distanciaAcumulada >= DISTANCIA_ADELANTE_OBJETIVO_AR) break;
  }

  const objetivo = coordenadasRuta[indiceObjetivo];
  if (!objetivo) return coordenadasRuta[ultimoIndice];

  const distanciaUsuarioObjetivo = distanciaEnMetros(miLatitud, miLongitud, objetivo.lat, objetivo.lng);
  if (distanciaUsuarioObjetivo < DISTANCIA_MINIMA_OBJETIVO_AR) {
    return coordenadasRuta[Math.min(indiceObjetivo + 2, ultimoIndice)];
  }
  return objetivo;
}

// =========================
// BRUJULA DEL DISPOSITIVO
// =========================

function leerGravedadYBrujula(evento) {
  let rumboCrudo = null;

  // iOS suele exponer webkitCompassHeading.
  if (evento.webkitCompassHeading !== undefined && evento.webkitCompassHeading !== null) {
    rumboCrudo = evento.webkitCompassHeading;
  } else if (evento.alpha !== null) {
    rumboCrudo = 360 - evento.alpha;
  }

  if (rumboCrudo === null) return;

  // Filtro paso bajo para evitar saltos bruscos.
  let diferencia = rumboCrudo - rumboSuavizado;
  if (diferencia > 180) diferencia -= 360;
  if (diferencia < -180) diferencia += 360;
  rumboSuavizado += diferencia * 0.08;

  if (rumboSuavizado < 0) rumboSuavizado += 360;
  if (rumboSuavizado >= 360) rumboSuavizado -= 360;
  rumboActual = rumboSuavizado;
}

// =========================
// DIBUJADO AR
// =========================

function pintarFlechaAR() {
  if (!isARMode) return;

  if (canvasAR.width !== window.innerWidth || canvasAR.height !== window.innerHeight) {
    canvasAR.width = window.innerWidth;
    canvasAR.height = window.innerHeight;
  }

  const ctx = canvasAR.getContext("2d");
  ctx.clearRect(0, 0, canvasAR.width, canvasAR.height);

  if (miLatitud !== null && miLongitud !== null && coordenadasRuta && coordenadasRuta.length > 0) {
    const objetivoPaso = obtenerObjetivoAR();
    if (objetivoPaso) {
      const rumboObjetivoCrudo = calcularRumbo(miLatitud, miLongitud, objetivoPaso.lat, objetivoPaso.lng);

      if (rumboObjetivoSuavizado === null) {
        rumboObjetivoSuavizado = rumboObjetivoCrudo;
      } else {
        const diferenciaObjetivo = restaAngulos(rumboObjetivoCrudo, rumboObjetivoSuavizado);
        rumboObjetivoSuavizado = normalizarAngulo(
          rumboObjetivoSuavizado + diferenciaObjetivo * SUAVIZADO_RUMBO_OBJETIVO
        );
      }

      let anguloRelativo = restaAngulos(rumboObjetivoSuavizado, rumboActual);
      if (Math.abs(anguloRelativo) < ZONA_MUERTA_RECTO_GRADOS) {
        anguloRelativo = 0;
      }

      const anguloObjetivoRad = gradosARadianes(limitar(anguloRelativo, -170, 170));
      if (anguloFlechaRenderizado === null) {
        anguloFlechaRenderizado = anguloObjetivoRad;
      } else {
        const diferenciaRotacion = restaAngulosRad(anguloObjetivoRad, anguloFlechaRenderizado);
        anguloFlechaRenderizado = normalizarRadianes(
          anguloFlechaRenderizado + diferenciaRotacion * SUAVIZADO_ROTACION_FLECHA
        );
      }

      const centroX = canvasAR.width / 2;
      const centroY = canvasAR.height / 2;
      const escala = window.innerWidth < 600 ? 1.05 : 1.5;

      ctx.save();
      ctx.translate(centroX, centroY);
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

  arAnimation = requestAnimationFrame(pintarFlechaAR);
}

// =========================
// ACTIVAR / DESACTIVAR AR
// =========================

async function activarDesactivarAR() {
  if (isARMode) {
    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    if (typeof btnARTarjetaRuta !== "undefined" && btnARTarjetaRuta) {
      btnARTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">view_in_ar</span> AR';
    }

    document.body.classList.remove("modo-ar");
    contenedorAR.classList.add("oculto");
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

    window.removeEventListener("deviceorientationabsolute", leerGravedadYBrujula);
    window.removeEventListener("deviceorientation", leerGravedadYBrujula);

    setTimeout(() => { mapa.invalidateSize(); }, 500);
    return;
  }

  // En iOS hace falta permiso explícito de brújula.
  if (
    typeof DeviceOrientationEvent !== "undefined"
    && typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      const estadoPermiso = await DeviceOrientationEvent.requestPermission();
      if (estadoPermiso !== "granted") {
        alert("Necesitamos acceso a la brújula para que la flecha gire correctamente.");
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

    videoAR.srcObject = videoStream;
    videoAR.play().catch((error) => {
      console.warn("Autoplay evitado por el navegador", error);
    });

    isARMode = true;
    btnAR.textContent = "Desactivar AR";
    if (typeof btnARTarjetaRuta !== "undefined" && btnARTarjetaRuta) {
      btnARTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">exit_to_app</span> Salir AR';
    }

    rumboObjetivoSuavizado = null;
    anguloFlechaRenderizado = null;
    contenedorAR.classList.remove("oculto");
    document.body.classList.add("modo-ar");

    window.addEventListener("deviceorientationabsolute", leerGravedadYBrujula, true);
    window.addEventListener("deviceorientation", leerGravedadYBrujula, true);

    pintarFlechaAR();
    setTimeout(() => { mapa.invalidateSize(); }, 500);
  } catch (error) {
    console.error("No se pudo acceder a la cámara:", error);
    alert(`Error cámara: ${error.name} - ${error.message}`);
  }
}

btnAR.addEventListener("click", activarDesactivarAR);

// =========================
// VISIBILIDAD DE PESTAÑA
// =========================

document.addEventListener("visibilitychange", () => {
  if (!document.hidden || !isARMode) return;

  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
    videoStream = null;
  }

  videoAR.pause();
  videoAR.srcObject = null;

  if (arAnimation) {
    cancelAnimationFrame(arAnimation);
    arAnimation = null;
  }

  rumboObjetivoSuavizado = null;
  anguloFlechaRenderizado = null;
  isARMode = false;
  btnAR.textContent = "Activar Cámara AR";
  if (typeof btnARTarjetaRuta !== "undefined" && btnARTarjetaRuta) {
    btnARTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">view_in_ar</span> AR';
  }
  document.body.classList.remove("modo-ar");
  contenedorAR.classList.add("oculto");
});

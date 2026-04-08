(function () {
  // Evita que el archivo se ejecute dos veces si por error se carga duplicado
  if (window.__TRACKU_AR_CARGADO__) {
    console.warn("ar.js ya estaba cargado. Se evita una segunda inicialización.");
    return;
  }
  window.__TRACKU_AR_CARGADO__ = true;

  // =========================
  // ESTADO GLOBAL DE AR
  // =========================

  window.isARMode = false;              // Indica si estamos en modo AR
  let videoStream = null;               // Stream de video de la cámara
  let arAnimation = null;               // Animación de AR
  let rumboActual = 0;                  // Rumbo actual del usuario
  let rumboSuavizado = 0;               // Rumbo suavizado del usuario

  // =========================
  // AJUSTES DE AR
  // =========================

  const DISTANCIA_MINIMA_OBJETIVO_AR = 12;
  const DISTANCIA_ADELANTE_OBJETIVO_AR = 18;
  const PUNTOS_VENTANA_BUSQUEDA_AR = 35;

  const SUAVIZADO_RUMBO_OBJETIVO = 0.14;
  const SUAVIZADO_ROTACION_FLECHA = 0.16;

  // Si la flecha está casi recta, la centramos para evitar vibración
  const ZONA_MUERTA_RECTO_GRADOS = 12;

  // Para limitar el giro visual máximo y que siga pareciendo “apoyada” en el suelo
  const LIMITE_GIRO_VISUAL_GRADOS = 145;

  let rumboObjetivoSuavizado = null;
  let anguloFlechaRenderizado = null;

  // =========================
  // UTILIDADES
  // =========================

  function getEstadoRuta() {
    return typeof estadoRuta !== "undefined" ? estadoRuta : null;
  }

  function getBtnAR() {
    return typeof btnAR !== "undefined" ? btnAR : null;
  }

  function getBtnARTarjeta() {
    return typeof btnARTarjetaRuta !== "undefined" ? btnARTarjetaRuta : null;
  }

  function getContenedorAR() {
    return typeof contenedorAR !== "undefined" ? contenedorAR : null;
  }

  function getVideoAR() {
    return typeof videoAR !== "undefined" ? videoAR : null;
  }

  function getCanvasAR() {
    return typeof canvasAR !== "undefined" ? canvasAR : null;
  }

  function actualizarBotonesAR() {
    const botonAR = getBtnAR();
    const botonTarjeta = getBtnARTarjeta();

    if (window.isARMode) {
      if (botonAR) botonAR.textContent = "Desactivar AR";
      if (botonTarjeta) botonTarjeta.innerHTML = "close AR";
    } else {
      if (botonAR) botonAR.textContent = "Activar Cámara AR";
      if (botonTarjeta) botonTarjeta.innerHTML = "view_in_ar AR";
    }
  }

  function resetearEstadoVisualAR() {
    rumboObjetivoSuavizado = null;
    anguloFlechaRenderizado = null;
  }

  // =========================
  // FUNCIONES DE ÁNGULOS Y RUMBO
  // =========================

  // Calcula el rumbo entre dos puntos GPS
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

  function restaAngulos(a, b) {
    let diff = normalizarAngulo(a - b);
    if (diff > 180) diff -= 360;
    return diff;
  }

  function normalizarRadianes(angulo) {
    const dosPi = Math.PI * 2;
    return (angulo % dosPi + dosPi) % dosPi;
  }

  function restaAngulosRad(a, b) {
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

  // =========================
  // FUNCIONES PARA ESTABILIZAR LA FLECHA
  // =========================

  function getPuntoBase() {
    if (
      typeof indicePasoActual !== "undefined" &&
      typeof instruccionesRuta !== "undefined" &&
      indicePasoActual >= 0 &&
      instruccionesRuta &&
      instruccionesRuta[indicePasoActual] &&
      typeof instruccionesRuta[indicePasoActual].index === "number"
    ) {
      return instruccionesRuta[indicePasoActual].index;
    }

    return 0;
  }

  function buscarPuntoCercano(indiceBase) {
    if (
      typeof coordenadasRuta === "undefined" ||
      !coordenadasRuta ||
      !coordenadasRuta.length ||
      typeof distanciaEnMetros !== "function" ||
      typeof miLatitud === "undefined" ||
      typeof miLongitud === "undefined"
    ) {
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
      typeof miLatitud === "undefined" ||
      typeof miLongitud === "undefined" ||
      miLatitud === null ||
      miLongitud === null ||
      typeof coordenadasRuta === "undefined" ||
      !coordenadasRuta ||
      !coordenadasRuta.length ||
      typeof distanciaEnMetros !== "function"
    ) {
      return null;
    }

    const indiceBase = getPuntoBase();
    const indiceCercano = buscarPuntoCercano(indiceBase);

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

  // =========================
  // BRÚJULA / ORIENTACIÓN
  // =========================

  function leerGravedadYBrujula(event) {
    let rumboCrudo = null;

    if (
      event.webkitCompassHeading !== undefined &&
      event.webkitCompassHeading !== null
    ) {
      // iPhone
      rumboCrudo = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android / otros
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
  // DIBUJADO DE FLECHA TIPO "SUELO"
  // =========================

  function dibujarFlechaSuelo(ctx, cx, cy, angulo) {
    ctx.save();

    ctx.translate(cx, cy);
    ctx.rotate(angulo);
    ctx.scale(1, 0.58);

    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    const piezas = [
      { y: 0, escala: 1.0, alpha: 0.95 },
      { y: -78, escala: 0.78, alpha: 0.72 },
      { y: -138, escala: 0.58, alpha: 0.48 }
    ];

    piezas.forEach((pieza, index) => {
      ctx.save();
      ctx.translate(0, pieza.y);
      ctx.scale(pieza.escala, pieza.escala);

      if (index > 0) {
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
      }

      ctx.beginPath();
      ctx.moveTo(0, -78);
      ctx.lineTo(62, 0);
      ctx.lineTo(24, 0);
      ctx.lineTo(0, -28);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-62, 0);
      ctx.closePath();

      ctx.fillStyle = `rgba(0, 119, 255, ${pieza.alpha})`;
      ctx.fill();

      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(255,255,255,${0.92 * pieza.alpha})`;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * pieza.alpha})`;
      ctx.stroke();

      ctx.restore();
    });

    const gradiente = ctx.createLinearGradient(0, 36, 0, -180);
    gradiente.addColorStop(0, "rgba(0,119,255,0.18)");
    gradiente.addColorStop(1, "rgba(0,119,255,0)");

    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.moveTo(-22, 26);
    ctx.lineTo(22, 26);
    ctx.lineTo(12, -180);
    ctx.lineTo(-12, -180);
    ctx.closePath();
    ctx.fillStyle = gradiente;
    ctx.fill();

    ctx.restore();
  }

  // =========================
  // DIBUJADO DEL AR
  // =========================

  function pintarFlechaAR() {
    if (!window.isARMode) return;

    const lienzo = getCanvasAR();
    if (!lienzo) return;

    if (
      lienzo.width !== window.innerWidth ||
      lienzo.height !== window.innerHeight
    ) {
      lienzo.width = window.innerWidth;
      lienzo.height = window.innerHeight;
    }

    const ctx = lienzo.getContext("2d");
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);

    if (
      typeof miLatitud !== "undefined" &&
      typeof miLongitud !== "undefined" &&
      miLatitud !== null &&
      miLongitud !== null &&
      typeof coordenadasRuta !== "undefined" &&
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
          const diffObjetivo = restaAngulos(
            rumboObjetivoCrudo,
            rumboObjetivoSuavizado
          );

          rumboObjetivoSuavizado = normalizarAngulo(
            rumboObjetivoSuavizado + diffObjetivo * SUAVIZADO_RUMBO_OBJETIVO
          );
        }

        let anguloRelativo = restaAngulos(rumboObjetivoSuavizado, rumboActual);

        if (Math.abs(anguloRelativo) < ZONA_MUERTA_RECTO_GRADOS) {
          anguloRelativo = 0;
        }

        const anguloObjetivoRad = gradosARadianes(
          limitar(
            anguloRelativo,
            -LIMITE_GIRO_VISUAL_GRADOS,
            LIMITE_GIRO_VISUAL_GRADOS
          )
        );

        if (anguloFlechaRenderizado === null) {
          anguloFlechaRenderizado = anguloObjetivoRad;
        } else {
          const diffRot = restaAngulosRad(
            anguloObjetivoRad,
            anguloFlechaRenderizado
          );

          anguloFlechaRenderizado = normalizarRadianes(
            anguloFlechaRenderizado + diffRot * SUAVIZADO_ROTACION_FLECHA
          );
        }
        
        const cx = canvasAR.width / 2;

        let cy = canvasAR.height * 0.68;

        if (
          typeof tarjetaRuta !== "undefined" &&
          tarjetaRuta &&
          !tarjetaRuta.classList.contains("oculto")
        ) {
          const rectTarjeta = tarjetaRuta.getBoundingClientRect();
          cy = rectTarjeta.top - 130;
        }

        cy = Math.max(canvasAR.height * 0.45, Math.min(cy, canvasAR.height * 0.72));

        dibujarFlechaSuelo(ctx, cx, cy, anguloFlechaRenderizado);
                
      }
    }

    arAnimation = requestAnimationFrame(pintarFlechaAR);
  }

  // =========================
  // ACTIVAR / DESACTIVAR AR
  // =========================

  window.toggleAR = async function toggleAR() {
    const botonAR = getBtnAR();
    const botonTarjeta = getBtnARTarjeta();
    const contenedor = getContenedorAR();
    const video = getVideoAR();
    const estado = getEstadoRuta();

    if (window.isARMode) {
      window.isARMode = false;
      actualizarBotonesAR();

      document.body.classList.remove("modo-ar");
      if (contenedor) contenedor.classList.add("oculto");

      resetearEstadoVisualAR();

      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
        videoStream = null;
      }

      if (arAnimation) {
        cancelAnimationFrame(arAnimation);
        arAnimation = null;
      }

      window.removeEventListener(
        "deviceorientationabsolute",
        leerGravedadYBrujula
      );
      window.removeEventListener("deviceorientation", leerGravedadYBrujula);

      if (typeof mapa !== "undefined" && mapa) {
        setTimeout(() => {
          mapa.invalidateSize();
        }, 500);
      }

      return;
    }

    if (
      typeof coordenadasRuta === "undefined" ||
      !coordenadasRuta ||
      !coordenadasRuta.length
    ) {
      if (estado) {
        estado.textContent =
          "Calcula primero una ruta antes de activar la cámara AR.";
      }
      return;
    }

    if (!contenedor || !video || !botonAR) {
      console.error("Faltan elementos del DOM necesarios para AR.");
      if (estado) {
        estado.textContent =
          "No se pudo activar AR porque faltan elementos en la página.";
      }
      return;
    }

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

      video.srcObject = videoStream;
      video.play().catch((e) => {
        console.warn("Autoplay evitado por el navegador", e);
      });

      window.isARMode = true;
      actualizarBotonesAR();

      resetearEstadoVisualAR();

      contenedor.classList.remove("oculto");
      document.body.classList.add("modo-ar");

      window.addEventListener(
        "deviceorientationabsolute",
        leerGravedadYBrujula,
        true
      );
      window.addEventListener("deviceorientation", leerGravedadYBrujula, true);

      pintarFlechaAR();

      if (typeof mapa !== "undefined" && mapa) {
        setTimeout(() => {
          mapa.invalidateSize();
        }, 500);
      }
    } catch (error) {
      console.error("No se pudo acceder a la cámara:", error);
      alert("Error cámara: " + error.name + " - " + error.message);
    }
  };

  // =========================
  // VISIBILIDAD DE LA PESTAÑA
  // =========================

  document.addEventListener("visibilitychange", () => {
    const botonAR = getBtnAR();
    const botonTarjeta = getBtnARTarjeta();
    const contenedor = getContenedorAR();
    const video = getVideoAR();

    if (document.hidden && window.isARMode) {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
        videoStream = null;
      }

      if (video) {
        video.pause();
        video.srcObject = null;
      }

      if (arAnimation) {
        cancelAnimationFrame(arAnimation);
        arAnimation = null;
      }

      resetearEstadoVisualAR();

      window.isARMode = false;
      actualizarBotonesAR();

      document.body.classList.remove("modo-ar");
      if (contenedor) contenedor.classList.add("oculto");
    }
  });

  // Inicializamos el texto por si la página ya lo necesita al cargar
  actualizarBotonesAR();
})();
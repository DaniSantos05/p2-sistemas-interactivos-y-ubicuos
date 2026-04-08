// =========================
// MODO REALIDAD AUMENTADA
// =========================

let isARMode = false;       // Indica si estamos en modo AR
let videoStream = null;     // Stream de video de la cámara
let arAnimation = null;     // Animación de AR
let rumboActual = 0;        // Rumbo actual del usuario
let rumboSuavizado = 0;     // Rumbo suavizado del usuario


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
// FUNCIONES DE ÁNGULOS Y RUMBO (muy importantes para la cámara AR)
// =========================

// Calcular el angulo entre tu posicion y la del punto al que vas
function calcularRumbo(lat1, lon1, lat2, lon2) {
  const aRadianes = p => p * Math.PI / 180;         // Convierte grados a radianes
  const aGrados = p => p * 180 / Math.PI;           // Convierte radianes a grados

  const difLon = aRadianes(lon2 - lon1);            // Diferencia de longitud en radianes

  // Fórmula para calcular el rumbo
  // Calc seno * cos
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


// Matemáticas para no liarse con los 360 grados

// Que el ángulo no sea negativo ni pase de 360
function normalizarAngulo(angulo) {
  return (angulo % 360 + 360) % 360;
  // Ejemplo: Si el ángulo es -10, lo convierte a 350. Si es 370, lo convierte a 10.
}

// Calcular la diferencia de grados
function restaAngulos(a, b) {
  // Calcula la diferencia entre los dos ángulos
  let diff = normalizarAngulo(a - b);
  // Si la diferencia es mayor a 180 grados, la convierte a grados negativos
  if (diff > 180) diff -= 360;
  return diff;
  // Ejemplo: Si a es 10 y b es 350, la diferencia es -340. Lo convierte a 20.
}

// Que el ángulo en radianes esté dentro del círculo
function normalizarRadianes(angulo) {
  const dosPi = Math.PI * 2;                // 2π es igual a 360 grados
  return (angulo % dosPi + dosPi) % dosPi;
}

// Calcular la diferencia de grados en radianes
function restaAngulosRad(a, b) {
  // Calcula la diferencia entre los dos ángulos
  let diff = normalizarRadianes(a - b);
  // Si la diferencia es mayor a π radianes, la convierte a radianes negativos
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

// Pasar de grados a radianes
function gradosARadianes(grados) {
  return (grados * Math.PI) / 180;  
}

// Asegura que un valor no se pase de ciertos limites
function limitar(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}


/*Las funciones a continuación tiene como objetivo estabilizar la flecha. Cuando
caminamos, el GPS nunca es 100% preciso, por lo que la flecha puede temblar.*/

// Saca donde empieza el tramo
function getPuntoBase() {
  // Si el índice del paso actual es válido y las instrucciones de la ruta son válidas
  if (indicePasoActual >= 0 && instruccionesRuta && instruccionesRuta[indicePasoActual] && typeof instruccionesRuta[indicePasoActual].index === "number") {
    // Devuelve el índice base
    return instruccionesRuta[indicePasoActual].index;
  }

  // Si no se encuentra el índice base, devuelve 0
  return 0;
}

// Encuentra el punto más cercano de la ruta
function buscarPuntoCercano(indiceBase) {
  // Si no hay coordenadas de la ruta, devuelve -1
  if (!coordenadasRuta || !coordenadasRuta.length) {
    return -1;
  }

  const ultimoIndice = coordenadasRuta.length - 1;           // Último índice de la ruta
  const inicio = Math.max(0, indiceBase - 6);                // Índice inicial de la ventana
  const fin = Math.min(ultimoIndice, indiceBase + PUNTOS_VENTANA_BUSQUEDA_AR);  // Índice final de la ventana

  let mejorIndice = inicio;         // Mejor índice
  let mejorDistancia = Infinity;    // Mejor distancia. Infinity porque es el valor más grande posible

  // Recorremos la ventana de puntos
  for (let i = inicio; i <= fin; i++) {
    const p = coordenadasRuta[i];
    // Si no hay coordenadas, saltamos el punto
    if (!p) continue;

    // Calculamos la distancia entre el usuario y el punto
    const dist = distanciaEnMetros(miLatitud, miLongitud, p.lat, p.lng);
    // Si la distancia es menor a la mejor distancia, actualizamos
    if (dist < mejorDistancia) {
      mejorDistancia = dist;
      mejorIndice = i;
    }
  }

  return mejorIndice;
}

// Busca el siguiente punto de la ruta que esté a 5 metros o más
function obtenerObjetivoAR() {
  // Si no hay coordenadas de la ruta, devuelve null
  if (miLatitud === null || miLongitud === null || !coordenadasRuta || !coordenadasRuta.length) {
    return null;
  }

  // Obtenemos el índice base de la ruta y el índice más cercano en la ventana
  const indiceBase = getPuntoBase();
  const indiceCercano = buscarPuntoCercano(indiceBase);

  // Si no hay coordenadas de la ruta, devuelve null
  if (indiceCercano < 0) {
    return null;
  }

  // Último índice de la ruta
  const ultimoIndice = coordenadasRuta.length - 1;

  // Distancia acumulada e índice objetivo
  let distanciaAcumulada = 0;
  let indiceObjetivo = indiceCercano;

  // Recorremos la ruta desde el índice más cercano
  for (let i = indiceCercano; i < ultimoIndice; i++) {
    const p1 = coordenadasRuta[i];
    const p2 = coordenadasRuta[i + 1];
    // Si no hay coordenadas, saltamos el punto
    if (!p1 || !p2) continue;

    // Sumamos la distancia entre el punto actual y el siguiente
    distanciaAcumulada += distanciaEnMetros(p1.lat, p1.lng, p2.lat, p2.lng);
    // Actualizamos el índice objetivo
    indiceObjetivo = i + 1;

    // Si la distancia acumulada es mayor o igual a la distancia adelante objetivo, salimos del bucle
    if (distanciaAcumulada >= DISTANCIA_ADELANTE_OBJETIVO_AR) {
      break;
    }
  }

  // Obtenemos el objetivo
  const objetivo = coordenadasRuta[indiceObjetivo];
  // Si no hay objetivo, devolvemos el último punto de la ruta
  if (!objetivo) {
    return coordenadasRuta[ultimoIndice];
  }

  // Distancia entre el usuario y el objetivo
  const distUsuarioObjetivo = distanciaEnMetros(miLatitud, miLongitud, objetivo.lat, objetivo.lng);

  // Si la distancia entre el usuario y el objetivo es menor a la distancia mínima objetivo, devolvemos el objetivo
  if (distUsuarioObjetivo < DISTANCIA_MINIMA_OBJETIVO_AR) {
    return coordenadasRuta[Math.min(indiceObjetivo + 2, ultimoIndice)];
  }

  return objetivo;
}
 
// Función que maneja los eventos de orientación del dispositivo
// Guarda hacia donde está apuntando el móvil
// Variable para suavizar la rotación (Filtro paso bajo)
function leerGravedadYBrujula(event) {
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
function pintarFlechaAR() {
  //Si no estamos en modo AR, no hacemos nada
  if (!isARMode) return;

  //Si el canvas no tiene el tamaño de la pantalla, lo redimensionamos
  if (canvasAR.width !== window.innerWidth || canvasAR.height !== window.innerHeight) {
    canvasAR.width = window.innerWidth;
    canvasAR.height = window.innerHeight;
  }

  //Obtenemos el contexto 2D del canvas
  const ctx = canvasAR.getContext("2d");
  /*Limpia el canvas para dibujar el siguiente frame.
  Los parámetros son: x(representa la posición horizontal), 
  y(representa la posición vertical), 
  ancho(representa el ancho del canvas), alto(representa el alto del canvas)*/
  ctx.clearRect(0, 0, canvasAR.width, canvasAR.height);

  //Si tenemos latitud y longitud y coordenadas de la ruta
  if (miLatitud !== null && miLongitud !== null && coordenadasRuta && coordenadasRuta.length > 0) {
    //Obtenemos el objetivo AR
    const objetivoPaso = obtenerObjetivoAR();

    //Si tenemos un objetivo
    if (objetivoPaso) {
      //Calculamos el rumbo al objetivo
      const rumboObjetivoCrudo = calcularRumbo(miLatitud, miLongitud, objetivoPaso.lat, objetivoPaso.lng);

      // Filtrito guapo para que la flecha no tiemble

      //Si no tenemos rumbo objetivo, lo establecemos
      if (rumboObjetivoSuavizado === null) {
        rumboObjetivoSuavizado = rumboObjetivoCrudo;
      } else {
        //Calculamos la diferencia angular entre el rumbo objetivo crudo y el rumbo objetivo suavizado
        const diffObjetivo = restaAngulos(rumboObjetivoCrudo, rumboObjetivoSuavizado);

        //Actualizamos el rumbo objetivo suavizado
        rumboObjetivoSuavizado = normalizarAngulo(rumboObjetivoSuavizado + diffObjetivo * SUAVIZADO_RUMBO_OBJETIVO);
      }

      //Calculamos el ángulo relativo entre el rumbo objetivo suavizado y el rumbo actual
      let anguloRelativo = restaAngulos(rumboObjetivoSuavizado, rumboActual);

      // Evita que tiemble demasiado cuando ya estas apuntando
      if (Math.abs(anguloRelativo) < ZONA_MUERTA_RECTO_GRADOS) {
        anguloRelativo = 0;
      }

      //Convertimos el ángulo relativo a radianes
      const anguloObjetivoRad = gradosARadianes(limitar(anguloRelativo, -170, 170));

      // Balanceo extra para que parezca que flota

      //Si no tenemos ángulo de flecha, lo establecemos
      if (anguloFlechaRenderizado === null) {
        anguloFlechaRenderizado = anguloObjetivoRad;
      } else {
        //Calculamos la diferencia angular entre el ángulo objetivo y el ángulo de la flecha
        const diffRot = restaAngulosRad(anguloObjetivoRad, anguloFlechaRenderizado);

        //Actualizamos el ángulo de la flecha
        anguloFlechaRenderizado = normalizarRadianes(anguloFlechaRenderizado + diffRot * SUAVIZADO_ROTACION_FLECHA);
      }

      //Obtenemos el centro del canvas
      const cx = canvasAR.width / 2;
      const cy = canvasAR.height / 2;
      const escala = window.innerWidth < 600 ? 1.05 : 1.5;   //Escala de la flecha

      // Guardamos el canvas, aplicamos la rotación y escalamos
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(anguloFlechaRenderizado);

      // Sombra de la flecha
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 18;                            //Difuminado de la sombra
      ctx.shadowOffsetX = 0;                          //Desplazamiento horizontal de la sombra
      ctx.shadowOffsetY = 6;                          //Desplazamiento vertical de la sombra

      // Dibujamos la flecha
      ctx.beginPath();
      ctx.moveTo(0, -90 * escala);                    //Punto superior de la flecha
      ctx.lineTo(60 * escala, 0);                     //Punto superior derecho de la flecha
      ctx.lineTo(25 * escala, 0);                     //Punto inferior derecho de la flecha
      ctx.lineTo(25 * escala, 90 * escala);           //Punto inferior derecho de la flecha
      ctx.lineTo(-25 * escala, 90 * escala);          //Punto inferior izquierdo de la flecha
      ctx.lineTo(-25 * escala, 0);                    //Punto inferior izquierdo de la flecha
      ctx.lineTo(-60 * escala, 0);                    //Punto inferior izquierdo de la flecha
      ctx.closePath();                                //Cierra la forma de la flecha

      ctx.fillStyle = "rgba(0, 102, 255, 0.88)";      //Color de la flecha
      ctx.fill();

      ctx.lineWidth = 6;                              //Grosor de la flecha
      ctx.lineJoin = "round";                         //Unión de las líneas
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";//Color del borde de la flecha
      ctx.stroke();

      ctx.shadowColor = "transparent";                //Color de la sombra
      ctx.lineWidth = 2;                              //Grosor de la sombra
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";//Color del borde de la sombra
      ctx.stroke();

      ctx.restore();                                  //Restaura el canvas
    }
  }

  arAnimation = requestAnimationFrame(pintarFlechaAR);   //Solicita el siguiente frame
}




// =========================
// ACTIVAR / DESACTIVAR AR
// =========================

//Función que activa o desactiva el modo AR
/*Su función es activar o desactivar el modo AR, que permite ver la cámara del dispositivo
con una flecha que indica la dirección de la ruta*/
async function toggleAR() {
  //Si estamos en modo AR, lo desactivamos
  if (isARMode) {
    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    if (typeof btnARTarjetaRuta !== "undefined" && btnARTarjetaRuta) {
      btnARTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">view_in_ar</span> AR';
    }
    document.body.classList.remove("modo-ar");   //Elimina la clase modo-ar del body
    contenedorAR.classList.add("oculto");         //Oculta el contenedor AR

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
    window.removeEventListener("deviceorientationabsolute", leerGravedadYBrujula);
    window.removeEventListener("deviceorientation", leerGravedadYBrujula);

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
      videoAR.srcObject = videoStream;
      videoAR.play().catch((e) => {
        console.warn("Autoplay evitado por el navegador", e);
      });

      //Actualizamos variables y estilos
      isARMode = true;
      btnAR.textContent = "Desactivar AR";
      if (typeof btnARTarjetaRuta !== "undefined" && btnARTarjetaRuta) {
        btnARTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">exit_to_app</span> Salir AR';
      }

      //Reiniciamos valores de rumbo y ángulo
      rumboObjetivoSuavizado = null;
      anguloFlechaRenderizado = null;

      //Mostramos el contenedor AR y añadimos la clase modo-ar al body
      contenedorAR.classList.remove("oculto");
      document.body.classList.add("modo-ar");

      //Añadimos los event listeners para la brújula
      window.addEventListener("deviceorientationabsolute", leerGravedadYBrujula, true);
      window.addEventListener("deviceorientation", leerGravedadYBrujula, true);

      //Dibujamos el frame AR
      pintarFlechaAR();

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
btnAR.addEventListener("click", toggleAR);




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
    videoAR.pause();
    videoAR.srcObject = null;

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
    if (typeof btnARTarjetaRuta !== "undefined" && btnARTarjetaRuta) {
      btnARTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">view_in_ar</span> AR';
    }
    document.body.classList.remove("modo-ar");
    contenedorAR.classList.add("oculto");
  }
});

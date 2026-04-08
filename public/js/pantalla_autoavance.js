// =========================
// AUTOAVANCE DE PASOS
// =========================

const DISTANCIA_CAMBIO_PASO = 18;      // Metros para pasar al siguiente paso
const DISTANCIA_LLEGADA_DESTINO = 12;  // Metros para considerar que hemos llegado
const RETARDO_CAMBIO_PASO_MS = 2500;   // Evita saltos demasiado seguidos

let ultimoCambioAutomatico = 0;
let rutaTerminada = false;





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



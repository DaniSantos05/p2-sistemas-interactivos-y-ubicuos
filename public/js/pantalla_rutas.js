// =========================
// GESTIÓN DE RUTAS
// =========================

// Función para calcular la distancia en metros entre dos puntos usando la fórmula de Haversine
function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const aRadianes = (grados) => (grados * Math.PI) / 180;  // Convierte grados a radianes

  const dLat = aRadianes(lat2 - lat1);    // Diferencia de latitud en radianes
  const dLon = aRadianes(lon2 - lon1);    // Diferencia de longitud en radianes

  // Fórmula de Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Distancia en metros
  const contacto = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * contacto;    // Devuelve el producto del radio de la Tierra y el ángulo central en radianes
}


// Función para limpiar la ruta
function limpiarRuta() {
  // Si existe el control de ruta, lo eliminamos
  if (controlRuta) {
    mapa.removeControl(controlRuta);
    controlRuta = null;
  }

  // Si existe el modo AR, lo desactivamos
  if (typeof activarDesactivarAR === "function" && typeof isARMode !== "undefined" && isARMode) {
    activarDesactivarAR();
  }



  // Ocultamos la tarjeta de ruta
  ocultarTarjetaRuta();

  // Si existe el marcador del paso actual, lo eliminamos
  if (marcadorPasoActual) {
    mapa.removeLayer(marcadorPasoActual);
    marcadorPasoActual = null;
  }

  // Reseteamos las variables de la ruta
  instruccionesRuta = [];       // Array de instrucciones
  coordenadasRuta = [];         // Array de coordenadas
  indicePasoActual = -1;        // Índice del paso actual
  navegacionIniciada = false;
  actualizarBotonIrCancelar();
  ultimoCambioAutomatico = 0;   // Momento del último cambio automático
  rutaTerminada = false;        // Estado de la ruta

  rumboObjetivoSuavizado = null;  // Rumbo objetivo suavizado
  anguloFlechaRenderizado = null; // Ángulo de la flecha renderizado
  sesionPasosActiva = false;
  sesionPasosGuardada = false;
  posicionAnteriorSesion = null;
  inicioSesionISO = null;
  destinoSesionNombre = "";
  if (modoContadorPasos && modoContadorPasos.checked) {
    actualizarResumenContadorRuta();
  }

  // Actualizamos el estado de la ruta
  cajaPasos.textContent = "No hay una ruta activa.";
  if (panelPasoAR) {
    panelPasoAR.classList.add("oculto");
  }
  miETA = null;
  // Si estamos compartiendo posición, actualizamos que ya no tenemos ETA
  if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
    socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
  }
  sincronizarMapa3D();
}


// Función que elimina la ruta actual
function eliminarRuta() {
  // Si no hay ruta que se esté mostrando, avisamos
  if (!controlRuta) {
    cajaPasos.innerHTML = "No puedes eliminar la ruta porque todavía no hay una activa.";
    return;
  }

  // Usamos limpiarRuta() que quita la línea azul del mapa, el punto de paso y resetea las listas
  limpiarRuta();

  // Quitamos también la chincheta del destino si fue seleccionada con el ratón
  if (marcadorDestino) {
    mapa.removeLayer(marcadorDestino);
    marcadorDestino = null;
    destinoClickLat = null;
    destinoClickLon = null;
  }

  // Actualizamos el texto de la caja de información
  cajaPasos.innerHTML = "Ruta eliminada.";
  estadoRuta.textContent = "Ruta eliminada. Elige un nuevo destino.";
  sincronizarMapa3D();
}


// =========================
// CÁLCULO DE RUTA
// =========================

// Función que calcula la ruta
/* Este bloque es el corazón incansable del motor de recolección inicial y la barra de búsqueda superior,
   y es el encargado absoluto de arrancar toda la operativa cada vez que un usuario decide que "ahí va a ir".
   Para entender cómo funciona internamente y cómo controla el flujo inicial al pulsar 
   enter en la caja de destino o el botón de lupa, hace falta tener en cuenta que necesitamos
   evaluar a toda costa si tenemos algo desde dónde partir. Sigue un escalafón estricto de sentencias:
    - 1. Si no nos está llegando señal activa de ubicación GPS en la matriz de estado local 
      ('miLatitud' en nulo), la maquinaria nos deniega drásticamente un cálculo y aborta (su return final).
    - 2. Suponiendo que hay conexión con nosotros, empieza por desbrozar y quitar los espacios en blanco
      accidentales que pudiera haber en el destino textual escrito en la barra ('inputDestino.value.trim').
    - 3. Evalúa si de modo contrario, un usuario ha estado marcando una chincheta roja con el dedo 
      al pulsar por el mapa (su 'modoClic.checked' está activo), para dar a esas coordenadas absolutas 
      prioridad abrumadora de destino frente a buscar algo en el propio servidor de mapas en un segundo. */
async function calcularRuta(origenMotor = "") {
  // Si no se conoce la posición actual, se muestra un mensaje
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent = "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  const destino = inputDestino.value.trim();  // Obtenemos el destino del input
  // Convertimos a string por si se pasa un evento del DOM inadvertidamente
  let origenModo = typeof origenMotor === "string" ? origenMotor : "texto";

  // Variables para almacenar las coordenadas y el nombre del destino
  let destLat;
  let destLon;
  let destNombre;

  // Si se ha seleccionado el modo clic, se da prioridad a las coordenadas del clic aunque haya texto en el input
  if (origenModo === "clic") {
    if (destinoClickLat === null || destinoClickLon === null) {
      estadoRuta.textContent = "Toca el mapa para marcar un destino.";
      return;
    }
    destLat = destinoClickLat;
    destLon = destinoClickLon;
    destNombre = `Punto: ${destLat.toFixed(5)}, ${destLon.toFixed(5)}`;
  } else if (destino) {
    // Si se ha escrito un texto, usamos Nominatim
    estadoRuta.textContent = "Buscando el lugar...";

    /*Este fragmento es el encargado de buscar el destino en Nominatim
    y obtener sus coordenadas. Para entender cómo funciona internamente, 
    hay que tener cuenta que Nominatim es un servicio de geocodificación que 
    nos devuelve un listado de coordenadas para una búsqueda dada, ya que el sistema
    no entiende de nombres de lugares. Por lo tanto, necesitamos convertir el nombre 
    del destino en coordenadas para poder calcular la ruta.*/
    try {
      /*Construimos la URL para hacer la petición a Nominatim. 
      format=json indica que queremos la res en formato JSON.
      q=${encodeURIComponent(destino)} sirve para codificar el destino y que se pueda enviar por URL.
      limit=1 indica que queremos solo un resultado*/
      const urlGeo = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
      // Hacemos la petición a Nominatim y usamos await para obligar al programa a esperar la res
      const respuestaGeo = await fetch(urlGeo);
      // Convertimos la res a JSON
      const datosGeo = await respuestaGeo.json();

      // Si Nominatim no encuentra nada, nos lo dice y no seguimos
      if (datosGeo.length === 0) {
        estadoRuta.textContent =
          "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      // Si Nominatim encuentra algo, guardamos latitud, longitud y nombre del destino
      destLat = parseFloat(datosGeo[0].lat);
      destLon = parseFloat(datosGeo[0].lon);     // parseFloat convierte el texto en número
      destNombre = datosGeo[0].display_name;     // Guardamos el nombre del destino

    } catch (error) {
      // Si falla la petición
      estadoRuta.textContent = "Error de conexión con los servicios de mapas.";
      console.error(error);
      return;
    }
    // Si no se ha escrito nada y no se ha usado el modo clic, se muestra un mensaje
  } else {
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  /*Llamamos a la función limpiarRuta() para eliminar cualquier ruta que pudiera estar mostrándose
  en el mapa. Esto es necesario para evitar conflictos entre rutas y asegurar que solo se muestre
  la ruta que se acaba de calcular.*/
  limpiarRuta();

  estadoRuta.textContent = "Calculando ruta a pie...";

  /*Creamos el control de ruta con Leaflet Routing Machine. 
  Le pasamos como parámetros los waypoints (punto de inicio y fin), 
  la URL del servicio de routing (OSRM en este caso), 
  el perfil de routing (a pie), 
  el idioma (español) y algunas opciones de visualización.*/
  controlRuta = L.Routing.control({
    waypoints: [
      L.latLng(miLatitud, miLongitud),   // Punto de inicio
      L.latLng(destLat, destLon)         // Punto de destino
    ],
    // RouteWhileDragging: false: Indica que no queremos que se recalcule la ruta mientras arrastramos el control
    routeWhileDragging: false,
    // Es el motor que calcula la ruta. En este caso, usamos OSRM (Open Source Routing Machine)
    router: L.Routing.osrmv1({
      serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",  // URL del servidor OSRM
      profile: "foot"                                                       // Aquí indicamos que queremos una ruta a pie
    }),
    // LineOptions: Son las opciones de estilo de la línea de la ruta
    lineOptions: {
      // Color azul, grosor 5 y opacidad 0.85
      styles: [{ color: "#1f6feb", weight: 5, opacity: 0.85 }]
    },

    // createMarker: Función que crea clava 2 chinchetas en el mapa
    createMarker: function (i, waypoint) {
      // Borra la chincheta de inicio porque el usuario ya tiene marcadorUsuario
      if (i === 0) return null;

      // Creamos el marcador del destino
      return L.marker(waypoint.latLng).bindPopup(destNombre);
    },
    language: "es",           // Idioma de las instrucciones
    show: true,               // Muestra la ruta en el mapa
    collapsible: true,        // Permite ocultar la ruta
    fitSelectedRoutes: true   // Ajusta el mapa a la ruta
  }).addTo(mapa);

  /*Este fragmento se ejecuta cuando se encuentra la ruta correctamente.
  Lo que hace es guardar las instrucciones y coordenadas de la ruta para poder 
  navegar por ella*/
  controlRuta.on("routesfound", (e) => {
    // Cogemos la primera ruta encontrada
    const ruta = e.routes[0];

    // Guardamos instrucciones y coordenadas
    instruccionesRuta = ruta.instructions || [];
    coordenadasRuta = ruta.coordinates || [];

    // Reiniciamos el índice del paso actual
    navegacionIniciada = false;
    actualizarBotonIrCancelar();
    indicePasoActual = 0;
    ultimoCambioAutomatico = 0;
    rutaTerminada = false;

    // Calculamos distancia y tiempo
    const distanciaKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const minutosTotales = Math.round(ruta.summary.totalTime / 60);

    let tiempoFormateado = "";
    if (minutosTotales < 60) {
      tiempoFormateado = `${minutosTotales} min`;
    } else if (minutosTotales < 1440) {
      const horas = Math.floor(minutosTotales / 60);
      const minutosRestantes = minutosTotales % 60;
      tiempoFormateado = `${horas} h ${minutosRestantes} min`;
    } else {
      const dias = Math.floor(minutosTotales / 1440);
      const horasRestantes = Math.floor((minutosTotales % 1440) / 60);
      tiempoFormateado = `${dias} d ${horasRestantes} h`;
    }

    miETA = `Llega en ${tiempoFormateado} (${distanciaKm} km)`;
    if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
      socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
    }

    estadoRuta.textContent = `Ruta calculada: ${distanciaKm} km, ~${tiempoFormateado} a pie.`;



    // Compartir ruta si está activado
    if (modoCompartirUbicacion.checked) {
      socket.emit("shareRoute", coordenadasRuta);
    }

    // Mostramos la tarjeta inferior de ruta con Compartir / AR / Ir
    mostrarTarjetaRuta(distanciaKm, tiempoFormateado);

    // Mostramos el primer paso
    mostrarPasoActual();
    sincronizarMapa3D();
    actualizarVista3D();
  });

  // Si falla el cálculo de la ruta
  controlRuta.on("routingerror", () => {
    estadoRuta.textContent = "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}






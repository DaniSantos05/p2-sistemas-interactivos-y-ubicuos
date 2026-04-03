    // =========================
// CONEXIÓN CON SOCKET.IO
// =========================

// Creamos la conexión con el servidor Socket.IO
const socket = io();

// Referencias a elementos del panel de estado
const connectionStatus = document.getElementById("connectionStatus");
const lastEvent = document.getElementById("lastEvent");
const modeStatus = document.getElementById("modeStatus");
const stepBox = document.getElementById("stepBox");

// Cuando la pantalla se conecta correctamente al servidor
socket.on("connect", () => {
  // Mostramos el estado de conexión
  connectionStatus.textContent = `Conectado. ID: ${socket.id}`;

  // Avisamos al servidor de que este cliente es la pantalla principal
  socket.emit("clientReady", { role: "pantalla" });
});

// =========================
// ELEMENTOS DEL DOM
// =========================

// Elementos de AR
const btnAR = document.getElementById("btnAR");                 // Botón de activar/desactivar AR
const arContainer = document.getElementById("arContainer");     // Contenedor de AR
const arVideo = document.getElementById("arVideo");             // Video de la cámara
const arCanvas = document.getElementById("arCanvas");           // Canvas para dibujar sobre el video

const destinoInput = document.getElementById("destinoInput");   // Campo de texto del destino
const btnRuta = document.getElementById("btnRuta");             // Botón de calcular ruta
const clickMode = document.getElementById("clickMode");         // Checkbox para elegir destino haciendo clic
const estadoRuta = document.getElementById("estadoRuta");       // Texto del estado de la ruta

// Elementos del DOM de la barra lateral
const sidebar = document.getElementById("sidebar");             // Barra lateral
const menuToggle = document.getElementById("menuToggle");       // Botón de abrir barra lateral
const closeSidebar = document.getElementById("closeSidebar");   // Botón de cerrar barra lateral

// Eventos para abrir y cerrar la barra lateral
menuToggle.addEventListener("click", () => {
  sidebar.classList.add("visible");
});
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("visible");
});

// Creamos el mapa con una vista inicial en Madrid
const mapa = L.map("mapa").setView([40.4168, -3.7038], 15);

// Añadimos la capa base de CartoDB (evita bloqueos de OpenStreetMap en servidores como devtunnels)
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
}).addTo(mapa);








// =========================
// VARIABLES DE ESTADO
// =========================

// Coordenadas actuales del usuario
let miLatitud = null;
let miLongitud = null;

let marcadorUsuario = null;   // Marcador del usuario
let controlRuta = null;       // Control de la ruta actual
let marcadorDestino = null;   // Marcador del destino elegido al hacer clic

let destinoClickLat = null;   // Coordenadas de la latitud del destino seleccionado con clic
let destinoClickLon = null;   // Coordenadas de la longitud del destino seleccionado con clic

let instruccionesRuta = [];   // Ruta e instrucciones actuales
let coordenadasRuta = [];     // Coordenadas de la ruta actual
let indicePasoActual = -1;    // Índice del paso actual

// Modo actual visual
let currentMode = "2D";

// =========================
// OBTENER UBICACIÓN DEL USUARIO
// =========================

// Comprobamos si el navegador soporta geolocalización
if ("geolocation" in navigator) {
  // Empezamos a vigilar la posición del usuario
  navigator.geolocation.watchPosition(
    (pos) => {
      // Guardamos latitud y longitud actuales
      miLatitud = pos.coords.latitude;
      miLongitud = pos.coords.longitude;

      // Si todavía no existe el marcador del usuario, lo creamos
      if (!marcadorUsuario) {
        mapa.setView([miLatitud, miLongitud], 16);

        marcadorUsuario = L.marker([miLatitud, miLongitud])  // Creamos el marcador del usuario
          .addTo(mapa)              // Lo añadimos al mapa
          .bindPopup("Estás aquí")  // Le ponemos un popup
          .openPopup();             // Lo abrimos

        estadoRuta.textContent = "Ubicación obtenida. Ya puedes buscar una ruta."; // Actualizamos el texto de estado
      } else {
        // Si ya existe, solo actualizamos su posición
        marcadorUsuario.setLatLng([miLatitud, miLongitud]);
      }
    },
    (err) => {
      // Si falla el GPS, mostramos error
      estadoRuta.textContent = "No se pudo obtener el GPS. Permite el acceso a la ubicación.";
      console.error("Error GPS:", err);
    },
    {
      // Estas opciones son para mejorar la precisión del GPS
      enableHighAccuracy: true,  // Mejor precisión
      maximumAge: 0,             // No usar caché
      timeout: 10000             // Tiempo máximo de espera
    }
  );
} else {
  // Si el navegador no soporta geolocalización
  estadoRuta.textContent = "Tu navegador no soporta geolocalización.";
}










// =========================
// SELECCIÓN DE DESTINO CON CLIC
// =========================

// Cuando se hace clic sobre el mapa
mapa.on("click", (e) => {
  // Solo actuamos si el modo clic está activado
  if (!clickMode.checked) return;

  // Guardamos la latitud y la longitud del punto clicado
  destinoClickLat = e.latlng.lat;
  destinoClickLon = e.latlng.lng;

  // Si ya había un marcador de destino, lo movemos
  if (marcadorDestino) {
    marcadorDestino.setLatLng(e.latlng);
  } else {
    // Si no había marcador, lo creamos
    marcadorDestino = L.marker(e.latlng, {
      icon: L.icon({
        // Los marcadores los sacamos de internet
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],  // Tamaño del icono
        iconAnchor: [12, 41] // Punto de anclaje del icono
      })
    }).addTo(mapa);
  }

  // Mostramos la información del destino en un popup
  marcadorDestino
    .bindPopup(`Destino: ${destinoClickLat.toFixed(5)}, ${destinoClickLon.toFixed(5)}`)
    .openPopup();

  // Actualizamos el texto de estado
  estadoRuta.textContent = "Destino seleccionado en el mapa. Pulsa 'Buscar y calcular ruta'.";
});











 
// =========================
// FUNCIONES AUXILIARES
// =========================

// Función para limpiar la ruta actual
function limpiarRuta() {
  // Si existe el control de ruta, lo quitamos
  if (controlRuta) {
    mapa.removeControl(controlRuta);
    controlRuta = null;
  }

  // Si estaba el AR encendido, lo quitamos
  if (typeof ActivarDesactivarARMode === 'function' && typeof isARMode !== 'undefined' && isARMode) {
    ActivarDesactivarARMode();
  }
  
  // Ocultamos el botón de AR si existe
  if (btnAR) {
    btnAR.classList.add("oculto");
  }

  instruccionesRuta = [];  // Reiniciamos las instrucciones
  coordenadasRuta = [];    // Reiniciamos las coordenadas
  indicePasoActual = -1;   // Reiniciamos el índice del paso actual

  // Actualizamos el cuadro del paso actual
  stepBox.textContent = "No hay una ruta activa.";
}

// Función para mostrar el paso actual
function mostrarPasoActual() {
  // Si no hay instrucciones, avisamos
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No hay instrucciones disponibles para esta ruta.";
    return;
  }

  /* Esto de los indices se usa para que si por ejemplo estamos en el paso 2 
  y le damos a anterior, no se vaya al paso -1, sino que se quede en el 1*/

  // Si el índice se ha salido por debajo, lo corregimos
  if (indicePasoActual < 0) {
    indicePasoActual = 0;
  }

  // Si el índice se ha salido por arriba, lo corregimos
  if (indicePasoActual >= instruccionesRuta.length) {
    indicePasoActual = instruccionesRuta.length - 1;
  }

  // Cogemos la instrucción actual
  const instruccion = instruccionesRuta[indicePasoActual];

  // Construimos el texto que se mostrará en el cuadro del paso actual
  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}\n\n` +
    `${instruccion.text || "Sin texto disponible"}\n\n` +
    `Distancia aproximada: ${Math.round((instruccion.distance || 0))} m`;

  // Lo mostramos en pantalla
  stepBox.textContent = textoPaso;

  /* Este fragmento es el encargado de que la cámara del mapa se deslice automáticamente hacia
  el lugar donde ocurre la instrucción. Para entender cómo funciona internamente, hay que tener cuenta 
  que el trazador de rutas (Leaflet Routing Machine) nos devuelve dos listas separadas:
  - instruccionesRuta: El listado de maniobras en texto (Gira a la derecha, Sigue recto 200m, etc.)
  - coordenadasRuta: Un listado gigante de puntos GPS (Latitud y Longitud) de toda la línea azul dibujada en el mapa, punto por punto.
  Cada vez que da una instrucción, suele venir con una propiedad llamada 'index' que nos indica en qué punto de la lista de coordenadas 
  se encuentra esa instrucción.*/

  /* Este 'if' realiza 2 comprobaciones de seguridad:
   - Verifica que la propiedad 'index' traiga un número asociado a la instrucción
   - Verifica que exista un punto en la lista de coordenadas con ese índice
   */
  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    // Si ambas comprobaciones son correctas, cogemos ese punto y movemos el mapa hacia él
    const punto = coordenadasRuta[instruccion.index];
    // panTo es una función de Leaflet que mueve el mapa a una posición determinada
    mapa.panTo([punto.lat, punto.lng]);  
  }
}

// Función para ir al siguiente paso
function siguientePaso() {
  // Si no hay ruta, avisamos
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No puedes avanzar pasos porque todavía no hay una ruta calculada.";
    return;
  }

  // Avanzamos un paso si no estamos al final
  if (indicePasoActual < instruccionesRuta.length - 1) {
    indicePasoActual++;
  }

  // Mostramos el paso actual
  mostrarPasoActual();
}

// Función para ir al paso anterior
function pasoAnterior() {
  // Si no hay ruta, avisamos
  if (!instruccionesRuta.length) {
    stepBox.textContent = "No puedes retroceder pasos porque todavía no hay una ruta calculada.";
    return;
  }

  // Retrocedemos un paso si no estamos al principio
  if (indicePasoActual > 0) {
    indicePasoActual--;
  }

  // Mostramos el paso actual
  mostrarPasoActual();
}

// Función para cambiar visualmente entre modo 2D y 3D
function toggleModeVisual() {
  // Si el modo actual es 2D, pasamos a 3D
  if (currentMode === "2D") {
    currentMode = "3D";
    document.body.classList.remove("modo-2d");
    document.body.classList.add("modo-3d");
  } else {
    // Si estaba en 3D, volvemos a 2D
    currentMode = "2D";
    document.body.classList.remove("modo-3d");
    document.body.classList.add("modo-2d");
  }

  // Actualizamos el texto del modo
  modeStatus.textContent = `Modo: ${currentMode}`;

  // Forzamos a Leaflet a recalcular el tamaño del mapa tras el cambio visual
  setTimeout(() => {
    mapa.invalidateSize();
  }, 450);
}

// Función para recentrar el mapa en el usuario
function recentrarMapa() {
  // Si ya tenemos la posición del usuario
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

// Función principal para calcular una ruta
async function calcularRuta() {
  // Si aún no tenemos GPS, no seguimos
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent = "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  const destino = destinoInput.value.trim();  // Obtenemos el texto del destino
  const usarClic = clickMode.checked;         // Comprobamos si está activado el modo clic

  // Variables donde guardaremos destino final
  let destLat;
  let destLon;
  let destNombre;

  // Si el modo clic está activo y hay un punto seleccionado
  if (usarClic && destinoClickLat !== null) {
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
      format=json indica que queremos la respuesta en formato JSON.
      q=${encodeURIComponent(destino)} sirve para codificar el destino y que se pueda enviar por URL.
      limit=1 indica que queremos solo un resultado*/
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
      // Hacemos la petición a Nominatim y usamos await para obligar al programa a esperar la respuesta
      const geoRes = await fetch(geoUrl);
      // Convertimos la respuesta a JSON
      const geoData = await geoRes.json();

      // Si Nominatim no encuentra nada, nos lo dice y no seguimos
      if (geoData.length === 0) {
        estadoRuta.textContent = "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      // Si Nominatim encuentra algo, guardamos latitud, longitud y nombre del destino
      destLat = parseFloat(geoData[0].lat);    
      destLon = parseFloat(geoData[0].lon);     // parseFloat convierte el texto en número
      destNombre = geoData[0].display_name;     // Guardamos el nombre del destino

    } catch (error) {
      // Si falla la petición
      estadoRuta.textContent = "Error de conexión con los servicios de mapas.";
      console.error(error);
      return;
    }
  // Si no hay ni clic ni texto
  } else {
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  // Limpiamos una ruta anterior si existía
  limpiarRuta();

  // Informamos de que se está calculando la ruta
  estadoRuta.textContent = "Calculando ruta a pie...";

  /*Este fragmento es el verdadero cerebro de la nabegación. Teniendo ya las coordenadas
  de inicio y fin, llamamos a la librería Leaflet Routing Machine para que 
  trace la línea azul y redacte el "paso a paso".
  */

  // Llama a la herramienta principal de trazado de rutas
  controlRuta = L.Routing.control({
    // Waypoints: Son los puntos de inicio y fin de la ruta
    waypoints: [
      L.latLng(miLatitud, miLongitud),    // Coordenadas de inicio
      L.latLng(destLat, destLon)          // Coordenadas de destino
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
    instruccionesRuta = ruta.instructions || []; // Si no hay instrucciones, guardamos un array vacío
    coordenadasRuta = ruta.coordinates || [];    // Si no hay coordenadas, guardamos un array vacío

    // Reiniciamos el índice del paso actual
    indicePasoActual = 0;

    // Este fragmento calcula la distancia y el tiempo de la ruta
    const distKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const tiempoMin = Math.round(ruta.summary.totalTime / 60);

    // Mostramos el estado
    estadoRuta.textContent = `Ruta calculada: ${distKm} km, ~${tiempoMin} min a pie.`;

    // Activamos la opción de lanzar cámara AR
    btnAR.classList.remove("oculto");

    // Mostramos el primer paso
    mostrarPasoActual();
  });

  // Si falla el cálculo de la ruta
  controlRuta.on("routingerror", () => {
    estadoRuta.textContent = "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}





// =========================
// BOTON y PULSACIÓN DE ENTER PARA CALCULAR LA RUTA
// =========================

// Al pulsar el botón, calculamos la ruta
btnRuta.addEventListener("click", calcularRuta);

// Si se pulsa Enter en el input, también calculamos la ruta
destinoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    calcularRuta();
  }
});








// =========================
// EVENTOS RECIBIDOS DESDE EL MANDO ACTUALMENTE DESHABILITADOS
// =========================

// Si recibimos nextStep
socket.on("nextStep", () => {
  lastEvent.textContent = "Último evento: nextStep";
  siguientePaso();
});

// Si recibimos prevStep
socket.on("prevStep", () => {
  lastEvent.textContent = "Último evento: prevStep";
  pasoAnterior();
});

// Si recibimos zoomIn
socket.on("zoomIn", () => {
  lastEvent.textContent = "Último evento: zoomIn";
  mapa.zoomIn();
});

// Si recibimos zoomOut
socket.on("zoomOut", () => {
  lastEvent.textContent = "Último evento: zoomOut";
  mapa.zoomOut();
});

// Si recibimos toggleMode
socket.on("toggleMode", () => {
  lastEvent.textContent = "Último evento: toggleMode";
  toggleModeVisual();
});

// Si recibimos recenter
socket.on("recenter", () => {
  lastEvent.textContent = "Último evento: recenter";
  recentrarMapa();
});

// Si recibimos confirm
socket.on("confirm", () => {
  lastEvent.textContent = "Último evento: confirm";
  estadoRuta.textContent = "Acción confirmada desde el mando.";
});

// Si recibimos exit
socket.on("exit", () => {
  lastEvent.textContent = "Último evento: exit";
  limpiarRuta();
  estadoRuta.textContent = "Ruta cancelada desde el mando.";
});

// Si llegan datos más detallados de orientación
socket.on("orientationData", (data) => {
  // De momento solo los mostramos por consola
  console.log("orientationData recibido en pantalla:", data);
});









// =========================
// MODO REALIDAD AUMENTADA
// =========================

let isARMode = false;             // Indica si estamos en modo AR
let videoStream = null;           // Stream de video de la cámara
let arAnimation = null;           // Animación AR
let rumboActual = 0;              // Rumbo actual del dispositivo

// Precarga de imágenes direccionales para Realidad Aumentada
const imgArriba = new Image();
imgArriba.src = "/Imagenes/arriba.jpg";
const imgAbajo = new Image();
imgAbajo.src = "/Imagenes/abajo.jpg";
const imgDerecha = new Image();
imgDerecha.src = "/Imagenes/derecha.jpg";
const imgIzquierda = new Image();
imgIzquierda.src = "/Imagenes/izquierda.jpg";


/* Función que calcula el rumbo entre dos puntos basandose en trigonometría.
Las fórmulas no entienden de grados, por lo que convertimos a radianes.
'x' e 'y' son los catetos del triángulo rectángulo que forman los dos puntos.
'brng' es el rumbo que queremos calcular. Al final convertimos de nuevo a grados.*/
function calcularRumbo(lat1, lon1, lat2, lon2) {
  const aRadianes = p => p * Math.PI / 180;         // Convierte grados a radianes
  const aGrados = p => p * 180 / Math.PI;           // Convierte radianes a grados

  const difLon = aRadianes(lon2 - lon1);            // Diferencia de longitud en radianes

  // Fórmula para calcular el rumbo
  /* Seno de la diferencia de longitud multiplicado por el coseno de la latitud del destino */
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

// Función que maneja los eventos de orientación del dispositivo
/*Su funcion es capturar la orientación del dispositivo y guardarla en la variable rumboActual*/
// Variable para suavizar la rotación (Filtro paso bajo)
let rumboSuavizado = 0;

function handleOrientation(event) {
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

/*Ejemplo de cómo trabajan amnas funciones: Si el punto de destino está en el Este del mapa(90º)
en el mundo real y el móvil al orientarse usando handleOrientation lee la brújula y detecta que apunta hacia el
Noroeste(45º), la diferencia será de 45º. Por lo tanto, el triángulo se dibujará a la derecha de la pantalla*/



//Función que dibuja el frame de AR
/*Su función es dibujar en la pantalla las imágenes para que se vean fluidas sobre el video
de la cámara*/
function drawARFrame() {
  //Si no estamos en modo AR, no hacemos nada
  if (!isARMode) return;
  
  //Si el canvas no tiene el tamaño correcto, lo redimensionamos
  if (arCanvas.width !== window.innerWidth || arCanvas.height !== window.innerHeight) {
    arCanvas.width = window.innerWidth;       //Ancho del canvas
    arCanvas.height = window.innerHeight;     //Alto del canvas  
  }
  // Crea el contexto 2D del canvas
  const ctx = arCanvas.getContext("2d");

  /*Limpia el canvas para dibujar el siguiente frame.
  Los parámetros son: x(representa la posición horizontal), 
  y(representa la posición vertical), 
  ancho(representa el ancho del canvas), alto(representa el alto del canvas)*/
  ctx.clearRect(0, 0, arCanvas.width, arCanvas.height); 


  /*Si el usuario está en una ruta y tiene coordenadas, calcula el rumbo matemático y lo compara con el rumbo actual
  para dibujar la imagen correspondiente*/
  if (miLatitud !== null && miLongitud !== null && coordenadasRuta && coordenadasRuta.length > 0) {
    let objetivoPaso = null;  
    // Si el índice del paso actual es válido y las instrucciones de la ruta existen
    if (indicePasoActual >= 0 && instruccionesRuta && instruccionesRuta[indicePasoActual]) {
        // Obtenemos el índice de las coordenadas del paso actual
        let idxCoord = instruccionesRuta[indicePasoActual].index;
        // Si las coordenadas del paso actual existen
        if (coordenadasRuta[idxCoord]) {
            // Obtenemos las coordenadas del paso actual
            objetivoPaso = coordenadasRuta[idxCoord];
        }
    } 
    
    // Si no se ha encontrado un objetivo, se toma el último punto de la ruta
    if (!objetivoPaso) {
        objetivoPaso = coordenadasRuta[coordenadasRuta.length - 1];
    }
    
    // Si se ha encontrado un objetivo
    if (objetivoPaso) {
      // Calcula el rumbo matemático entre la posición actual y el objetivo
      const rumboMatematico = calcularRumbo(miLatitud, miLongitud, objetivoPaso.lat, objetivoPaso.lng);
      // Calcula la diferencia entre el rumbo matemático y el rumbo actual
      const diffRumbo = rumboMatematico - rumboActual;
      
      // Calcula el centro del canvas
      const cx = arCanvas.width / 2;
      const cy = arCanvas.height / 2;
      
      // Normaliza la diferencia de rumbo a positivo 0-360 para que funcione correctamente
      let angulo = (diffRumbo % 360 + 360) % 360;
      
      // Variable global para evitar que la flecha tiemble en las fronteras (Histéresis)
      if (typeof window.ultimoAnguloPintado === 'undefined') {
         window.ultimoAnguloPintado = 0; // Guardamos el estado anterior
      }

      // Solo cambiaremos de flecha si cruzamos el límite por más de 15 grados.
      // Esto evita el típico "tiemblor" o salto locura si te quedas apoyado en la frontera (ej: 45º, que salta entre Arriba y Derecha sin parar)
      let diferenciaAngulo = Math.abs(angulo - window.ultimoAnguloPintado);
      if (diferenciaAngulo > 180) diferenciaAngulo = 360 - diferenciaAngulo;
      
      if (diferenciaAngulo > 15) { // Un colchón de 15 grados de seguridad
         window.ultimoAnguloPintado = angulo;
      } else {
         angulo = window.ultimoAnguloPintado; // Mantenemos el estado anterior
      }
      
      // Se elige la dirección dependiendo del ángulo relativo
      let anguloRotacion = 0;

      /*Si el ángulo está entre 315 y 45 grados, apunta arriba (0 rad)
      Si el ángulo está entre 45 y 135 grados, apunta derecha (PI/2 rad)
      Si el ángulo está entre 135 y 225 grados, apunta abajo (PI rad)
      Si el ángulo está entre 225 y 315 grados, apunta izquierda (3*PI/2 rad)*/
      if (angulo >= 315 || angulo < 45) {
         anguloRotacion = 0;
      } else if (angulo >= 45 && angulo < 135) {
         anguloRotacion = Math.PI / 2;
      } else if (angulo >= 135 && angulo < 225) {
         anguloRotacion = Math.PI;
      } else {
         anguloRotacion = Math.PI * 1.5;
      }

      // Guarda el estado actual del canvas y lo traslada al centro
      ctx.save();
      ctx.translate(cx, cy);
      
      // Rotamos el contexto hacia donde tiene que apuntar la flecha
      ctx.rotate(anguloRotacion);

      // Dibujamos una FLECHA VECTORIAL transparente y limpia en lugar de usar imágenes JPG
      // Tamaño general de la flecha dependiendo de si es móvil o PC
        const escala = window.innerWidth < 600 ? 1.05 : 1.5;

      ctx.beginPath();
      // Empezamos por la punta de la flecha (mirando hacia arriba)
      ctx.moveTo(0, -90 * escala); 
      ctx.lineTo(60 * escala, 0);       // Ala derecha
      ctx.lineTo(25 * escala, 0);       // Esquina interior derecha
      ctx.lineTo(25 * escala, 90 * escala); // Base derecha
      ctx.lineTo(-25 * escala, 90 * escala); // Base izquierda
      ctx.lineTo(-25 * escala, 0);      // Esquina interior izquierda
      ctx.lineTo(-60 * escala, 0);      // Ala izquierda
      ctx.closePath();

      // Damos estilo a la flecha
      ctx.fillStyle = "rgba(0, 80, 255, 0.85)"; // Azul corporativo pero un poco transparente para ver el fondo
      ctx.fill(); // Rellenamos de color
      
      ctx.lineWidth = 6;
      ctx.strokeStyle = "white"; // Borde blanco
      ctx.stroke(); // Dibujamos el borde

      // Restaura el estado anterior del canvas
      ctx.restore();
    }
  }
  
  // Esto es para que cuando se acabe de dibujar un frame, se pida otro, creando un bucle infinito a 60 fps
  arAnimation = requestAnimationFrame(drawARFrame);
}

//Función que activa o desactiva el modo AR
async function ActivarDesactivarARMode() {
  //Si el modo AR está activo, lo desactivamos
  if (isARMode) {
    isARMode = false;
    btnAR.textContent = "Activar Cámara AR";
    document.body.classList.remove("modo-ar");  //Quitamos el modo AR del body
    arContainer.classList.add("oculto");        //Ocultamos el contenedor de AR
    
    // Si hay un stream de video, lo paramos
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());  // track.stop() detiene el stream de video
      videoStream = null;   //Lo ponemos a null para liberar memoria
    }
    
    // Si hay una animación, la cancelamos
    if (arAnimation) {
      cancelAnimationFrame(arAnimation);                      // cancelAnimationFrame() cancela la animación
      arAnimation = null;   //Lo ponemos a null para liberar memoria
    } 
    
    // Quitamos los event listeners de la brújula
    // deviceorientationabsolute: apunta al Norte real del planeta como una brújula de verdad.
    // deviceorientation: el norte es simplemente la dirección hacia la que apunta el teléfono cuando abres la página.
    window.removeEventListener("deviceorientationabsolute", handleOrientation); 
    window.removeEventListener("deviceorientation", handleOrientation);

    // Forzamos que el mapa se redimensione correctamente. El 500 indica que se espere 500 milisegundos antes de redimensionar el mapa
    setTimeout(() => { mapa.invalidateSize(); }, 500);

  // Si el modo AR está desactivado, lo activamos
  } else {
    // Si el dispositivo no soporta DeviceOrientationEvent o no tiene el método requestPermission, mostramos un mensaje de error
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // Pedimos permiso para acceder a la brújula
        const permissionState = await DeviceOrientationEvent.requestPermission();
        // Si el permiso no es concedido, mostramos un mensaje de error
        if (permissionState !== 'granted') {
          alert("Necesitamos acceso a la brújula para que la flecha gire correctamente.");
          return;
        }
      // Si hay un error al pedir permisos, mostramos un mensaje de error
      } catch (error) {
        console.error("Error al pedir permisos de brújula", error);
        alert("Ocurrió un error al acceder a la brújula.");
        return;
      }
    }
    
    // Intentamos obtener el stream de video de la cámara trasera
    try {
      // Obtenemos el stream de video. Con 'environment' accedemos a la cámara trasera
      videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Asignamos el stream de video al elemento de video
      arVideo.srcObject = videoStream;
        arVideo.play().catch(e => console.warn('Autoplay evitado por el navegador', e)); 
      
      // Una vez que tenemos el stream de video, lo ponemos en modo AR y cambiamos el texto del botón a desactivar.
      isARMode = true;
      btnAR.textContent = "Desactivar AR";   
      
      // Quitamos el contenedor de AR y añadimos el modo AR al body
      arContainer.classList.remove("oculto");
      document.body.classList.add("modo-ar");
      
      // Añadimos los event listeners de la brújula
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
      
      // Dibujamos el frame de AR
      drawARFrame();

      // Forzamos que el mapa se redimensione correctamente. El 500 indica que se espere 500 milisegundos antes de redimensionar el mapa
      setTimeout(() => { mapa.invalidateSize(); }, 500);
      
    // Si hay un error al obtener el stream de video, mostramos un mensaje de error
    } catch (error) {
      console.error("No se pudo acceder a la cámara:", error);
      alert("Error cámara: " + error.name + " - " + error.message);
    }
  }
}

// Añadimos el event listener al botón de AR
btnAR.addEventListener("click", ActivarDesactivarARMode);









// Evita que la cámara se quede bloqueada en negro al salir y volver de la pestaña en el móvil
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isARMode) {
        // Al salir de la app apagamos la cámara de forma agresiva para que el sistema operativo no la bloquee
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        arVideo.pause();
        arVideo.srcObject = null;
        
        arAnimation && cancelAnimationFrame(arAnimation);
        
        isARMode = false;
        btnAR.textContent = 'Activar Cámara AR';
        document.body.classList.remove('modo-ar');
        arContainer.classList.add('oculto');
    }
});



// =========================
// NAVEGACIÓN CON TILT
// =========================

const btnActivarTilt = document.getElementById("btnActivarTilt");
let tiltActivo = false;                 // Indica si el control por inclinación está activo
let tiltBeta = null;                    // El ángulo beta es el de arriba/abajo
let tiltGamma = null;                   // El ángulo gamma es el de izquierda/derecha
let tiltCooldown = false;               // Cooldown para evitar cambios bruscos
let tiltFocusIndex = -1;                // Índice del elemento focalizado
let tiltElementos = [];                 // Array de elementos focalizables
let bloqueoVertical = false;            // Bloqueo vertical para evitar cambios bruscos
let bloqueoHorizontal = false;          // Bloqueo horizontal para evitar cambios bruscos

/*Función que comprueba si hay control asistido activo*/
function hayControlAsistidoActivo() {
  return tiltActivo || window.gestosMenuActivo === true;
}

/*Función que limpia el foco asistido. Esto lo que 
hace es quitar el foco del elemento focalizado*/
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

/*Función que obtiene el estado del desplegable*/
function obtenerEstadoDesplegable() {
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  return !!(opcionesDesplegables && !opcionesDesplegables.classList.contains("oculto"));
}

/*Función que refresca el foco asistido. Esto lo que hace es 
actualizar los elementos que se pueden focalizar y pintar el foco en el elemento focalizado*/
function refrescarFocoAsistido() {
  setTimeout(() => {
    if (!hayControlAsistidoActivo()) return;
    actualizarElementosTilt();
    pintarFocoTilt();
  }, 120);
}

/*Función que abre el menú de controles asistido*/
function abrirMenuControlesAsistido() {
  const btnDesplegarControles = document.getElementById("btnDesplegarControles");
  if (!btnDesplegarControles || obtenerEstadoDesplegable()) return;
  btnDesplegarControles.click();
  refrescarFocoAsistido();
}

/*Función que cierra el menú de controles asistido*/
function cerrarMenuControlesAsistido() {
  const btnDesplegarControles = document.getElementById("btnDesplegarControles");
  if (!btnDesplegarControles || !obtenerEstadoDesplegable()) return;
  btnDesplegarControles.click();
  refrescarFocoAsistido();
}

/*Función que mueve el foco asistido. Mueve el foco hacia arriba o hacia abajo*/
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

/*Función que maneja la acción asistida. Esto sirve para 
interactuar con el menú de controles asistido*/
function manejarAccionAsistida(accion) {
  const desplegableAbierto = obtenerEstadoDesplegable();
  actualizarElementosTilt();

  if (!desplegableAbierto) {
    if (accion === "izq") {
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

function seleccionarOpcionAsistida() {
  if (!obtenerEstadoDesplegable()) return false;

  actualizarElementosTilt();
  const elementoFocalizado = tiltElementos[tiltFocusIndex];
  if (!elementoFocalizado) return false;

  simularClickTilt(elementoFocalizado);
  refrescarFocoAsistido();
  return true;
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

/*Función que desactiva el control por inclinación*/
function desactivarControlTilt() {
  tiltActivo = false;
  if (btnActivarTilt) btnActivarTilt.classList.remove("activo");
  window.removeEventListener('deviceorientation', manejarTilt);
  tiltBeta = null;            // Ángulo beta
  tiltGamma = null;           // Ángulo gamma
  tiltCooldown = false;       // Cooldown
  bloqueoVertical = false;    // Bloqueo vertical
  bloqueoHorizontal = false;  // Bloqueo horizontal
  limpiarFocoAsistido();      // Limpia el foco asistido

  /*Cierra el modal de instrucciones de tilt*/
  const modalTilt = document.getElementById("modalInstruccionesTilt");
  if (modalTilt) modalTilt.style.display = "none";
}

/*Si se pulsa el botón de activar tilt*/
if (btnActivarTilt) {
  btnActivarTilt.addEventListener("click", () => {
    if (tiltActivo) {
      desactivarControlTilt();
      return;
    }

    if (window.gestosMenuActivo === true && typeof window.desactivarControlGestosMenu === "function") {
      window.desactivarControlGestosMenu();
    }

    tiltActivo = true;
    /*Si el control por inclinación está activo*/
    if (tiltActivo) {
      btnActivarTilt.classList.add("activo");
      tiltBeta = null;      // Reinicia el ángulo beta
      tiltGamma = null;     // Reinicia el ángulo gamma
      tiltCooldown = false; // Reinicia el cooldown
      
      /*Muestra el modal de instrucciones de tilt*/
      const mostrarModalTilt = () => {
        const modalTilt = document.getElementById("modalInstruccionesTilt");
        if (modalTilt) modalTilt.style.display = "flex";
      };
      
      /*Si el control por inclinación está activo*/
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()        // Solicita permiso para el control por inclinación
          .then(permissionState => {
            /*Si el permiso es concedido*/
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', manejarTilt);  // Añade el evento de control por inclinación
              mostrarModalTilt();
            } else {
              alert("Permiso denegado para el control por inclinación.");   // Si el permiso es denegado
              tiltActivo = false;                                           // Desactiva el control por inclinación
              btnActivarTilt.classList.remove("activo");                    // Elimina la clase activo del botón
            }
          })
          .catch(console.error);  // Si hay un error
      } else {
        window.addEventListener('deviceorientation', manejarTilt);  // Añade el evento de control por inclinación si el dispositivo lo soporta
        mostrarModalTilt();
      }
      actualizarElementosTilt();  // Actualiza los elementos que se pueden focalizar
      pintarFocoTilt();           // Pinta el foco en el elemento focalizado
    }
  });
}

/*Si se pulsa el botón de desplegar controles entonces se refresca el foco asistido*/
const btnDesplegarControles = document.getElementById("btnDesplegarControles");
if (btnDesplegarControles) {
  btnDesplegarControles.addEventListener("click", () => {
    refrescarFocoAsistido();
  });
}

/* Event listener para cerrar el modal de tilt */
const cerrarModalTiltBtn = document.getElementById("cerrarModalTilt");
if (cerrarModalTiltBtn) {
  cerrarModalTiltBtn.addEventListener("click", () => {
    const modalTilt = document.getElementById("modalInstruccionesTilt");
    if (modalTilt) modalTilt.style.display = "none";
  });
}

/*Esta sección exporta las funciones para que puedan ser utilizadas por otros módulos*/
window.desactivarControlTiltMenu = desactivarControlTilt;
window.navegacionAsistida = {
  actualizarElementos: actualizarElementosTilt,
  pintarFoco: pintarFocoTilt,
  limpiarFoco: limpiarFocoAsistido,
  refrescarFoco: refrescarFocoAsistido,
  obtenerEstadoDesplegable,
  ejecutarAccion: manejarAccionAsistida,
  seleccionarActual: seleccionarOpcionAsistida
};

// =========================
// PASOS E INDICACIONES
// =========================

// Traduce al vuelo parte de los textos de maniobras que llegan en inglés.
function traducirInstruccionRuta(texto) {
  // Fallback cuando no llega texto de instrucción.
  if (!texto) return "Sin texto disponible";
  // Copia editable.
  let t = texto;
  // Diccionario de reemplazos rápidos para instrucciones comunes de OSRM.
  const reemplazos = [
    [/\bHead north\b/gi, "Dirígete al norte"],
    [/\bHead south\b/gi, "Dirígete al sur"],
    [/\bHead east\b/gi, "Dirígete al este"],
    [/\bHead west\b/gi, "Dirígete al oeste"],
    [/\bHead northeast\b/gi, "Dirígete al noreste"],
    [/\bHead northwest\b/gi, "Dirígete al noroeste"],
    [/\bHead southeast\b/gi, "Dirígete al sureste"],
    [/\bHead southwest\b/gi, "Dirígete al suroeste"],
    [/\bTurn left\b/gi, "Gira a la izquierda"],
    [/\bTurn right\b/gi, "Gira a la derecha"],
    [/\bContinue\b/gi, "Continúa"],
    [/\bKeep left\b/gi, "Mantente a la izquierda"],
    [/\bKeep right\b/gi, "Mantente a la derecha"],
    [/\bAt the roundabout\b/gi, "En la rotonda"],
    [/\bTake the (\d+)(st|nd|rd|th) exit\b/gi, "toma la salida $1"],
    [/\bDestination reached\b/gi, "Has llegado al destino"],
    [/\bYou have arrived\b/gi, "Has llegado"],
    [/\bonto\b/gi, "hacia"],
    [/\bon\b/gi, "en"],
    [/\btowards\b/gi, "hacia"]
  ];
  // Aplica cada reemplazo al texto final.
  reemplazos.forEach(([pattern, valor]) => {
    t = t.replace(pattern, valor);
  });
  // Devuelve instrucción traducida.
  return t;
}

// Muestra en AR un panel que combina las indicaciones de la ruta y el contador de pasos.
function actualizarPanelPasoAR() {
  // Si no existe panel, no seguimos.
  if (!panelPasoAR) return;
  
  // Estado actual de AR.
  const enModoAR = typeof isARMode !== "undefined" && isARMode;
  
  // Solo mostrar el panel si AR está activo y la navegación está iniciada.
  if (enModoAR && typeof navegacionIniciada !== "undefined" && navegacionIniciada) {
    let contenidoHTML = "";
    
    // 1. Mostrar la instrucción actual de navegación
    if (typeof instruccionesRuta !== "undefined" && instruccionesRuta.length > 0 && typeof indicePasoActual !== "undefined" && indicePasoActual >= 0 && indicePasoActual < instruccionesRuta.length) {
      const instruccion = instruccionesRuta[indicePasoActual];
      const textoIns = traducirInstruccionRuta(instruccion.text || "");
      const metros = Math.round(instruccion.distance || 0);
      contenidoHTML += `<div style="margin-bottom: 5px; font-size: 15px;"><strong>Paso ${indicePasoActual + 1}/${instruccionesRuta.length}:</strong> ${textoIns} (~${metros} m)</div>`;
    }
    
    // 2. Mostrar el contador de pasos de forma separada si está habilitado
    if (typeof modoContadorPasos !== "undefined" && modoContadorPasos && modoContadorPasos.checked && typeof sesionPasosActiva !== "undefined" && sesionPasosActiva) {
      const p = typeof pasosSesionActual !== "undefined" ? pasosSesionActual : 0;
      const c = typeof caloriasSesionActual !== "undefined" ? caloriasSesionActual : 0;
      // Añadimos un pequeño borde superior para separarlo si hay instrucción previa
      const separator = contenidoHTML ? `<div style="border-top:1px solid rgba(255,255,255,0.2); margin: 5px 0;"></div>` : '';
      contenidoHTML += `${separator}<div style="font-size: 13px; color: #ccffcc;"><strong>Contador:</strong> ${p} pasos · ${c} kcal</div>`;
    }

    // Si por algún casual no hay contenido aún (muy raro), ponemos algo genérico
    if (!contenidoHTML) {
      contenidoHTML = "Navegación iniciada. Sigue la flecha en el suelo.";
    }

    // Muestra panel e inserta contenido.
    panelPasoAR.classList.remove("oculto");
    panelPasoAR.innerHTML = contenidoHTML;
  } else {
    // Oculta panel si no estamos en AR o no hay navegación.
    panelPasoAR.classList.add("oculto");
  }
}

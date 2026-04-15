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

// Muestra en AR el progreso de pasos/calorías de la ruta cuando el contador está activo.
function actualizarPanelPasoAR() {
  // Si no existe panel, no seguimos.
  if (!panelPasoAR) return;
  
  // Estado actual de AR.
  const enModoAR = typeof isARMode !== "undefined" && isARMode;
  
  // Solo mostrar el panel si AR está activo y la navegación está iniciada.
  if (enModoAR && typeof navegacionIniciada !== "undefined" && navegacionIniciada) {
    let contenidoHTML = "";

    // En AR priorizamos el progreso de actividad de la ruta (pasos/calorías).
    if (
      typeof modoContadorPasos !== "undefined" &&
      modoContadorPasos &&
      modoContadorPasos.checked &&
      typeof pasosSesionActual !== "undefined" &&
      typeof caloriasSesionActual !== "undefined"
    ) {
      const p = typeof pasosSesionActual !== "undefined" ? pasosSesionActual : 0;
      const c = typeof caloriasSesionActual !== "undefined" ? caloriasSesionActual : 0;
      contenidoHTML = `<div style="font-size: 15px; color: #ccffcc;"><strong>Ruta actual:</strong> ${p} pasos · ${c} kcal</div>`;
    }

    // Si aún no hay contenido, no mostramos texto extra en AR.
    if (!contenidoHTML) {
      panelPasoAR.classList.add("oculto");
      panelPasoAR.innerHTML = "";
      return;
    }

    // Muestra panel e inserta contenido.
    panelPasoAR.classList.remove("oculto");
    panelPasoAR.innerHTML = contenidoHTML;
  } else {
    // Oculta panel si no estamos en AR o no hay navegación.
    panelPasoAR.classList.add("oculto");
  }
}

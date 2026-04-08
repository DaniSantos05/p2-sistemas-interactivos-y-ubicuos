// =========================
// PASOS E INDICACIONES
// =========================

// Traduce al vuelo parte de los textos de maniobras que llegan en inglés.
function traducirInstruccionRuta(texto) {
  if (!texto) return "Sin texto disponible";
  let t = texto;
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
  reemplazos.forEach(([pattern, valor]) => {
    t = t.replace(pattern, valor);
  });
  return t;
}

// Muestra en AR un panel compacto solo cuando el contador está activo en navegación.
function actualizarPanelPasoAR() {
  if (!panelPasoAR) return;
  const enModoAR = typeof isARMode !== "undefined" && isARMode;
  if (enModoAR && modoContadorPasos && modoContadorPasos.checked && navegacionIniciada && sesionPasosActiva) {
    panelPasoAR.classList.remove("oculto");
    panelPasoAR.innerHTML = `<strong>Contador</strong><br>Pasos: ${pasosSesionActual} · ${caloriasSesionActual} kcal`;
    return;
  }
  panelPasoAR.classList.add("oculto");
}

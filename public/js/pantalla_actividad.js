// =========================
// CONTADOR DE RUTA Y ACTIVIDAD
// =========================

// Actualiza el resumen visible de pasos y calorías de la sesión actual.
function actualizarResumenContadorRuta() {
  if (!resumenContadorRuta) return;
  resumenContadorRuta.textContent = `Pasos: ${pasosSesionActual} · Calorías: ${caloriasSesionActual} kcal`;
  actualizarPanelPasoAR();
}

// Reinicia y arranca una nueva sesión de contador al pulsar "Ir".
function iniciarSesionContadorRuta() {
  sesionPasosActiva = true;
  sesionPasosGuardada = false;
  pasosSesionActual = 0;
  caloriasSesionActual = 0;
  distanciaSesionMetros = 0;
  posicionAnteriorSesion = null;
  inicioSesionISO = new Date().toISOString();
  destinoSesionNombre = inputDestino && inputDestino.value ? inputDestino.value.trim() : "Ruta";
  actualizarResumenContadorRuta();
}

// Acumula distancia con GPS y la traduce a pasos/calorías aproximados.
function actualizarContadorRutaConGPS() {
  if (!sesionPasosActiva || !modoContadorPasos || !modoContadorPasos.checked) return;
  if (miLatitud === null || miLongitud === null) return;

  const posicionActual = { lat: miLatitud, lng: miLongitud };
  if (!posicionAnteriorSesion) {
    posicionAnteriorSesion = posicionActual;
    return;
  }

  const incremento = distanciaEnMetros(
    posicionAnteriorSesion.lat,
    posicionAnteriorSesion.lng,
    posicionActual.lat,
    posicionActual.lng
  );

  if (incremento > 0.3 && incremento < 20) {
    distanciaSesionMetros += incremento;
    pasosSesionActual = Math.round(distanciaSesionMetros / 0.78);
    caloriasSesionActual = Math.round((distanciaSesionMetros / 1000) * 50);
    actualizarResumenContadorRuta();
  }

  posicionAnteriorSesion = posicionActual;
}

// Guarda en backend la sesión finalizada (una sola vez por ruta).
async function guardarActividadRuta() {
  if (sesionPasosGuardada || !inicioSesionISO) return;
  if (pasosSesionActual <= 0 && caloriasSesionActual <= 0) return;

  try {
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: miNombre,
        steps: pasosSesionActual,
        calories: caloriasSesionActual,
        distanceKm: Number((distanciaSesionMetros / 1000).toFixed(3)),
        startedAt: inicioSesionISO,
        endedAt: new Date().toISOString(),
        destination: destinoSesionNombre || "Ruta"
      })
    });
    sesionPasosGuardada = true;
    await cargarActividad(periodoActividadActual);
  } catch (error) {
    console.error("No se pudo guardar la actividad de la ruta", error);
  }
}

// Formatea etiqueta de periodo para historial (día/semana/mes).
function obtenerEtiquetaPeriodo(tipo, clave) {
  if (tipo === "day") return clave;
  if (tipo === "week") return `Semana ${clave}`;
  return clave;
}

// Carga actividad agregada y repinta totales + historial en el menú.
async function cargarActividad(periodo = "day") {
  if (!actividadTotales || !actividadHistorial || !miNombre) return;
  periodoActividadActual = periodo;
  try {
    const resp = await fetch(`/api/activity?username=${encodeURIComponent(miNombre)}&period=${encodeURIComponent(periodo)}`);
    if (!resp.ok) throw new Error("Error al cargar actividad");
    const data = await resp.json();
    const totals = data.totals || { steps: 0, calories: 0, routes: 0 };
    actividadTotales.innerHTML = `
      <p>Pasos: ${totals.steps || 0}</p>
      <p>Calorías: ${totals.calories || 0} kcal</p>
      <p>Rutas: ${totals.routes || 0}</p>
    `;

    const groups = data.groups || [];
    if (!groups.length) {
      actividadHistorial.innerHTML = '<p class="no-contacts-msg">Aún no hay actividad guardada.</p>';
    } else {
      actividadHistorial.innerHTML = groups.map(g => `
        <div class="actividad-item">
          <div class="actividad-item-titulo">${obtenerEtiquetaPeriodo(periodo, g.key)}</div>
          <div class="actividad-item-resumen">Pasos: ${g.steps} · Calorías: ${g.calories} kcal · Rutas: ${g.routes}</div>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error(error);
    actividadHistorial.innerHTML = '<p class="no-contacts-msg">No se pudo cargar la actividad.</p>';
  }
}

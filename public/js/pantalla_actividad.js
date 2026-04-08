// =========================
// CONTADOR DE RUTA Y ACTIVIDAD
// =========================

// Actualiza el resumen visible de pasos y calorías de la sesión actual.
function actualizarResumenContadorRuta() {
  // Si el contenedor no existe, no continuamos.
  if (!resumenContadorRuta) return;
  // Texto de resumen en una sola línea.
  resumenContadorRuta.textContent = `Pasos: ${pasosSesionActual} · Calorías: ${caloriasSesionActual} kcal`;
  // Refresca el panel compacto de AR.
  actualizarPanelPasoAR();
}

// Reinicia y arranca una nueva sesión de contador al pulsar "Ir".
function iniciarSesionContadorRuta() {
  // Marca sesión activa para empezar a acumular.
  sesionPasosActiva = true;
  // Permite guardar al final de esta sesión.
  sesionPasosGuardada = false;
  // Reinicia pasos.
  pasosSesionActual = 0;
  // Reinicia calorías.
  caloriasSesionActual = 0;
  // Reinicia distancia acumulada.
  distanciaSesionMetros = 0;
  // Reinicia punto GPS previo.
  posicionAnteriorSesion = null;
  // Guarda instante de inicio.
  inicioSesionISO = new Date().toISOString();
  // Guarda etiqueta de destino para historial.
  destinoSesionNombre = inputDestino && inputDestino.value ? inputDestino.value.trim() : "Ruta";
  // Refresca UI.
  actualizarResumenContadorRuta();
}

// Acumula distancia con GPS y la traduce a pasos/calorías aproximados.
function actualizarContadorRutaConGPS() {
  // Solo contar si la sesión está activa y el switch encendido.
  if (!sesionPasosActiva || !modoContadorPasos || !modoContadorPasos.checked) return;
  // Sin coordenadas actuales no hay cálculo.
  if (miLatitud === null || miLongitud === null) return;

  // Posición actual del usuario.
  const posicionActual = { lat: miLatitud, lng: miLongitud };
  // Primer punto de referencia de la sesión.
  if (!posicionAnteriorSesion) {
    posicionAnteriorSesion = posicionActual;
    return;
  }

  // Distancia recorrida entre la posición anterior y la actual.
  const incremento = distanciaEnMetros(
    posicionAnteriorSesion.lat,
    posicionAnteriorSesion.lng,
    posicionActual.lat,
    posicionActual.lng
  );

  // Filtro anti-ruido GPS: evita micro saltos y saltos imposibles.
  if (incremento > 0.3 && incremento < 20) {
    // Suma distancia válida.
    distanciaSesionMetros += incremento;
    // Conversión aproximada de distancia a pasos.
    pasosSesionActual = Math.round(distanciaSesionMetros / 0.78);
    // Conversión aproximada de distancia a calorías.
    caloriasSesionActual = Math.round((distanciaSesionMetros / 1000) * 50);
    // Actualiza UI.
    actualizarResumenContadorRuta();
  }

  // Avanza la referencia para el siguiente ciclo.
  posicionAnteriorSesion = posicionActual;
}

// Guarda en backend la sesión finalizada (una sola vez por ruta).
async function guardarActividadRuta() {
  // Evita doble guardado.
  if (sesionPasosGuardada || !inicioSesionISO) return;
  // Evita guardar sesiones vacías.
  if (pasosSesionActual <= 0 && caloriasSesionActual <= 0) return;

  try {
    // Envía sesión al backend.
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
    // Marca como guardada.
    sesionPasosGuardada = true;
    // Refresca actividad visible con el período actual.
    await cargarActividad(periodoActividadActual);
  } catch (error) {
    // Log de diagnóstico.
    console.error("No se pudo guardar la actividad de la ruta", error);
  }
}

// Formatea etiqueta de periodo para historial (día/semana/mes).
function obtenerEtiquetaPeriodo(tipo, clave) {
  // El día ya llega con etiqueta final.
  if (tipo === "day") return clave;
  // Semana se formatea con prefijo.
  if (tipo === "week") return `Semana ${clave}`;
  // Mes o cualquier otro valor.
  return clave;
}

// Carga actividad agregada y repinta totales + historial en el menú.
// `periodo` puede ser "day", "week" o "month".
async function cargarActividad(periodo = "day") {
  // Si falta UI o usuario, no continuamos.
  if (!actividadTotales || !actividadHistorial || !miNombre) return;
  // Guarda período actual seleccionado.
  periodoActividadActual = periodo;
  try {
    // Petición de actividad agregada.
    const resp = await fetch(`/api/activity?username=${encodeURIComponent(miNombre)}&period=${encodeURIComponent(periodo)}`);
    // Si falla HTTP, lanza error.
    if (!resp.ok) throw new Error("Error al cargar actividad");
    // Parse JSON.
    const data = await resp.json();
    // Totales de respaldo.
    const totals = data.totals || { steps: 0, calories: 0, routes: 0 };
    // Pinta tarjetas de totales.
    actividadTotales.innerHTML = `
      <p>Pasos: ${totals.steps || 0}</p>
      <p>Calorías: ${totals.calories || 0} kcal</p>
      <p>Rutas: ${totals.routes || 0}</p>
    `;

    // Grupos del período.
    const groups = data.groups || [];
    // Mensaje vacío si no hay datos.
    if (!groups.length) {
      actividadHistorial.innerHTML = '<p class="no-contacts-msg">Aún no hay actividad guardada.</p>';
    } else {
      // Pinta una fila por grupo temporal.
      actividadHistorial.innerHTML = groups.map(g => `
        <div class="actividad-item">
          <div class="actividad-item-titulo">${obtenerEtiquetaPeriodo(periodo, g.key)}</div>
          <div class="actividad-item-resumen">Pasos: ${g.steps} · Calorías: ${g.calories} kcal · Rutas: ${g.routes}</div>
        </div>
      `).join("");
    }
  } catch (error) {
    // Log de error.
    console.error(error);
    // Mensaje de error en UI.
    actividadHistorial.innerHTML = '<p class="no-contacts-msg">No se pudo cargar la actividad.</p>';
  }
}

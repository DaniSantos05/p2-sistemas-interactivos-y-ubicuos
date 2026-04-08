// =========================
// INTERFAZ AUXILIAR DE PANTALLA
// =========================

// Activa autocompletado de destino usando Nominatim + debounce.
function inicializarAutocompletadoDestino({ inputDestino, btnRuta, sugerenciasDestino, alBuscarRuta }) {
  // Validación mínima de dependencias de interfaz.
  if (!inputDestino || !btnRuta || !sugerenciasDestino || typeof alBuscarRuta !== "function") return;

  // Temporizador para debounce del input.
  let tiempoEsperaBusqueda = null;
  // Permite cancelar peticiones anteriores cuando el usuario sigue escribiendo.
  let solicitudSugerenciasEnCurso = null;

  // Limpia y oculta el panel de sugerencias.
  function ocultarSugerenciasDestino() {
    // Oculta visualmente el panel.
    sugerenciasDestino.classList.add("oculto");
    // Limpia contenido previo.
    sugerenciasDestino.innerHTML = "";
  }

  // Pinta resultados y permite seleccionar uno con clic.
  function mostrarSugerenciasDestino(items) {
    // Si no hay datos, cerramos panel.
    if (!items || !items.length) {
      ocultarSugerenciasDestino();
      return;
    }

    // Render de sugerencias.
    sugerenciasDestino.innerHTML = items.map((item) => (
      `<div class="sugerencia-destino-item" data-display="${item.display_name.replace(/"/g, "&quot;")}">${item.display_name}</div>`
    )).join("");
    // Muestra panel.
    sugerenciasDestino.classList.remove("oculto");

    // Vincula clic por cada opción sugerida.
    sugerenciasDestino.querySelectorAll(".sugerencia-destino-item").forEach((el) => {
      el.addEventListener("click", () => {
        // Copia texto seleccionado al input.
        inputDestino.value = el.getAttribute("data-display") || "";
        // Cierra panel tras seleccionar.
        ocultarSugerenciasDestino();
      });
    });
  }

  // Lanza búsqueda remota de sugerencias y cancela la anterior si existe.
  async function buscarSugerenciasDestino(texto) {
    // Umbral mínimo para no saturar peticiones.
    if (!texto || texto.length < 3) {
      ocultarSugerenciasDestino();
      return;
    }

    if (solicitudSugerenciasEnCurso) {
      // Cancela petición anterior pendiente.
      solicitudSugerenciasEnCurso.abort();
    }
    // Crea nuevo controlador de cancelación.
    solicitudSugerenciasEnCurso = new AbortController();

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}&limit=5`;
      // Petición de sugerencias.
      const resp = await fetch(url, { signal: solicitudSugerenciasEnCurso.signal });
      // Parse JSON.
      const data = await resp.json();
      // Render sugerencias.
      mostrarSugerenciasDestino(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error al cargar sugerencias de destino:", error);
      }
    }
  }

  // Botón de buscar: cierra sugerencias y calcula ruta.
  btnRuta.addEventListener("click", () => {
    // Cierra sugerencias.
    ocultarSugerenciasDestino();
    // Dispara cálculo de ruta.
    alBuscarRuta();
  });

  // Enter en input: mismo comportamiento que botón.
  inputDestino.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Cierra sugerencias.
      ocultarSugerenciasDestino();
      // Dispara cálculo de ruta.
      alBuscarRuta();
    }
  });

  // Debounce de entrada para reducir llamadas a Nominatim.
  inputDestino.addEventListener("input", () => {
    // Texto actual del input.
    const texto = inputDestino.value.trim();
    // Cancela temporizador anterior.
    clearTimeout(tiempoEsperaBusqueda);
    // Programa nueva búsqueda con retardo.
    tiempoEsperaBusqueda = setTimeout(() => {
      buscarSugerenciasDestino(texto);
    }, 250);
  });

  // Pequeño retardo para no perder clic en sugerencia al hacer blur.
  inputDestino.addEventListener("blur", () => {
    // Retardo para permitir que el clic en sugerencia se procese.
    setTimeout(ocultarSugerenciasDestino, 150);
  });
}

// Muestra/oculta el bloque de controles flotantes del mapa.
function inicializarControlesDesplegablesMapa() {
  // Botón principal de despliegue.
  const btnDesplegarControles = document.getElementById("btnDesplegarControles");
  // Contenedor de opciones.
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  // Si falta algo, no seguimos.
  if (!btnDesplegarControles || !opcionesDesplegables) return;

  btnDesplegarControles.addEventListener("click", () => {
    // Alterna visibilidad del bloque de botones.
    opcionesDesplegables.classList.toggle("oculto");
  });
}

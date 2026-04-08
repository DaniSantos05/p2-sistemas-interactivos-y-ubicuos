// =========================
// INTERFAZ AUXILIAR DE PANTALLA
// =========================

// Activa autocompletado de destino usando Nominatim + debounce.
function inicializarAutocompletadoDestino({ inputDestino, btnRuta, sugerenciasDestino, alBuscarRuta }) {
  if (!inputDestino || !btnRuta || !sugerenciasDestino || typeof alBuscarRuta !== "function") return;

  let tiempoEsperaBusqueda = null;
  let solicitudSugerenciasEnCurso = null;

  // Limpia y oculta el panel de sugerencias.
  function ocultarSugerenciasDestino() {
    sugerenciasDestino.classList.add("oculto");
    sugerenciasDestino.innerHTML = "";
  }

  // Pinta resultados y permite seleccionar uno con clic.
  function mostrarSugerenciasDestino(items) {
    if (!items || !items.length) {
      ocultarSugerenciasDestino();
      return;
    }

    sugerenciasDestino.innerHTML = items.map((item) => (
      `<div class="sugerencia-destino-item" data-display="${item.display_name.replace(/"/g, "&quot;")}">${item.display_name}</div>`
    )).join("");
    sugerenciasDestino.classList.remove("oculto");

    sugerenciasDestino.querySelectorAll(".sugerencia-destino-item").forEach((el) => {
      el.addEventListener("click", () => {
        inputDestino.value = el.getAttribute("data-display") || "";
        ocultarSugerenciasDestino();
      });
    });
  }

  // Lanza búsqueda remota de sugerencias y cancela la anterior si existe.
  async function buscarSugerenciasDestino(texto) {
    if (!texto || texto.length < 3) {
      ocultarSugerenciasDestino();
      return;
    }

    if (solicitudSugerenciasEnCurso) {
      solicitudSugerenciasEnCurso.abort();
    }
    solicitudSugerenciasEnCurso = new AbortController();

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}&limit=5`;
      const resp = await fetch(url, { signal: solicitudSugerenciasEnCurso.signal });
      const data = await resp.json();
      mostrarSugerenciasDestino(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error al cargar sugerencias de destino:", error);
      }
    }
  }

  // Botón de buscar: cierra sugerencias y calcula ruta.
  btnRuta.addEventListener("click", () => {
    ocultarSugerenciasDestino();
    alBuscarRuta();
  });

  // Enter en input: mismo comportamiento que botón.
  inputDestino.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      ocultarSugerenciasDestino();
      alBuscarRuta();
    }
  });

  // Debounce de entrada para reducir llamadas a Nominatim.
  inputDestino.addEventListener("input", () => {
    const texto = inputDestino.value.trim();
    clearTimeout(tiempoEsperaBusqueda);
    tiempoEsperaBusqueda = setTimeout(() => {
      buscarSugerenciasDestino(texto);
    }, 250);
  });

  // Pequeño retardo para no perder clic en sugerencia al hacer blur.
  inputDestino.addEventListener("blur", () => {
    setTimeout(ocultarSugerenciasDestino, 150);
  });
}

// Muestra/oculta el bloque de controles flotantes del mapa.
function inicializarControlesDesplegablesMapa() {
  const btnDesplegarControles = document.getElementById("btnDesplegarControles");
  const opcionesDesplegables = document.getElementById("opcionesDesplegables");
  if (!btnDesplegarControles || !opcionesDesplegables) return;

  btnDesplegarControles.addEventListener("click", () => {
    opcionesDesplegables.classList.toggle("oculto");
  });
}

/* Controlador del mapa 3D.
Centraliza creación del mapa, sincronización de marcadores/ruta y cámara de seguimiento. */
function crearControladorMapa3D(configuracion) {
  // `configuracion` actúa como adaptador entre pantalla.js y este módulo 3D.
  // Instancia principal de MapLibre.
  let mapa3d = null;
  // Marcador de posición del usuario.
  let marcadorUsuario3D = null;
  // Marcador del destino seleccionado.
  let marcadorDestino3D = null;

  // Inicializa el mapa 3D solo una vez.
  function inicializar() {
    // Si ya existe mapa o falta librería, salimos.
    if (mapa3d || typeof maplibregl === "undefined") return;
    // Crea instancia de MapLibre.
    mapa3d = new maplibregl.Map({
      container: "mapa3d",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [configuracion.leafletMap.getCenter().lng, configuracion.leafletMap.getCenter().lat],
      zoom: configuracion.leafletMap.getZoom(),
      pitch: 64,
      bearing: 0,
      antialias: false,
      renderWorldCopies: false
    });

    mapa3d.on("load", () => {
      // Controles de navegación nativos.
      mapa3d.addControl(new maplibregl.NavigationControl(), "top-right");

      // Si el usuario mueve el mapa, pausamos el auto-centrado temporalmente.
      const pausar = () => configuracion.alInteractuarUsuarioConMapa(6000);
      mapa3d.on("movestart", pausar);
      mapa3d.on("zoomstart", pausar);
      mapa3d.on("rotatestart", pausar);
      mapa3d.on("pitchstart", pausar);

      // Terreno con DEM público para dar relieve real.
      if (!mapa3d.getSource("terrainSource")) {
        mapa3d.addSource("terrainSource", {
          type: "raster-dem",
          tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
          encoding: "terrarium",
          tileSize: 256,
          maxzoom: 14
        });
      }
      mapa3d.setTerrain({ source: "terrainSource", exaggeration: 1.6 });

      // Permite seleccionar destino con clic en mapa 3D.
      mapa3d.on("click", (ev) => {
        // Validación básica de evento.
        if (!ev || !ev.lngLat) return;
        // Notifica selección al módulo principal.
        configuracion.alSeleccionarDestino(ev.lngLat.lat, ev.lngLat.lng);
      });

      // Fuente/capa de la ruta en 3D (línea azul).
      if (!mapa3d.getSource("route3d")) {
        mapa3d.addSource("route3d", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } }
        });
        mapa3d.addLayer({
          id: "route3d-layer",
          type: "line",
          source: "route3d",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#1f6feb", "line-width": 5 }
        });
      }
      sincronizar();
    });
  }

  // Refresca marcadores y geometría de ruta.
  function sincronizar() {
    // Solo en modo 3D y con mapa inicializado.
    if (!mapa3d || configuracion.obtenerModo() !== "3D") return;

    // Marcador del usuario.
    const posicion = configuracion.obtenerPosicion();
    if (posicion && posicion.lat !== null && posicion.lng !== null) {
      // Crea marcador si no existe.
      if (!marcadorUsuario3D) {
        marcadorUsuario3D = new maplibregl.Marker({ color: "#2563eb" }).setLngLat([posicion.lng, posicion.lat]).addTo(mapa3d);
      } else {
        // O actualiza si ya existe.
        marcadorUsuario3D.setLngLat([posicion.lng, posicion.lat]);
      }
    }

    // Marcador de destino.
    const destino = configuracion.obtenerDestino();
    if (destino && destino.lat !== null && destino.lng !== null) {
      // Crea marcador si no existe.
      if (!marcadorDestino3D) {
        marcadorDestino3D = new maplibregl.Marker({ color: "#ef4444" }).setLngLat([destino.lng, destino.lat]).addTo(mapa3d);
      } else {
        // O actualiza si ya existe.
        marcadorDestino3D.setLngLat([destino.lng, destino.lat]);
      }
    } else if (marcadorDestino3D) {
      // Si ya no hay destino, elimina marcador.
      marcadorDestino3D.remove();
      marcadorDestino3D = null;
    }

    // Trazado de ruta en formato GeoJSON.
    const fuenteRuta = mapa3d.getSource("route3d");
    if (fuenteRuta) {
      // La ruta llega en lat/lng; MapLibre espera [lng, lat].
      const coordenadas = configuracion.obtenerCoordenadasRuta();
      // Actualiza geometría de línea.
      fuenteRuta.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: coordenadas.map((pt) => [pt.lng, pt.lat]) }
      });
    }
  }

  // Sigue al usuario y orienta la cámara hacia el siguiente punto de referencia.
  function actualizarVista() {
    // Requiere mapa inicializado.
    if (!mapa3d) return;
    // Obtiene posición actual del usuario.
    const posicion = configuracion.obtenerPosicion();
    // Si no hay posición válida, salimos.
    if (!posicion || posicion.lat === null || posicion.lng === null) return;

    // Rotación suave para evitar giros bruscos.
    let orientacion = mapa3d.getBearing();
    const puntoReferencia = configuracion.obtenerSiguientePuntoReferencia();
    if (puntoReferencia) {
      // Rumbo objetivo hacia el próximo punto.
      const objetivo = configuracion.calcularRumboObjetivo(posicion.lat, posicion.lng, puntoReferencia.lat, puntoReferencia.lng);
      // Diferencia angular normalizada.
      const delta = ((objetivo - orientacion + 540) % 360) - 180;
      // Suaviza giro para evitar tirones.
      orientacion += delta * 0.2;
    }

    mapa3d.jumpTo({
      center: [posicion.lng, posicion.lat],
      zoom: Math.max(configuracion.leafletMap.getZoom(), 15.5),
      pitch: 58,
      bearing: orientacion
    });
    // Tras mover cámara, refresca overlays.
    sincronizar();
  }

  // Devuelve centro y zoom actuales para sincronizar con mapa 2D.
  function obtenerCentroYZoom() {
    if (!mapa3d) return null;
    const centro = mapa3d.getCenter();
    return { lat: centro.lat, lng: centro.lng, zoom: mapa3d.getZoom() };
  }

  // Recalcula el tamaño cuando cambia el layout de la app.
  function redimensionar() {
    if (mapa3d) mapa3d.resize();
  }

  // Acerca el zoom en el mapa 3D
  function acercarZoom() {
    if (mapa3d) mapa3d.zoomIn();
  }

  // Aleja el zoom en el mapa 3D
  function alejarZoom() {
    if (mapa3d) mapa3d.zoomOut();
  }

  // Recentrado manual rápido (botón recenter).
  function recentrar(lat, lng) {
    if (mapa3d && lat !== null && lng !== null) {
      mapa3d.easeTo({ center: [lng, lat], zoom: 16, pitch: 60, duration: 350 });
    }
  }

  return {
    inicializar,
    sincronizar,
    actualizarVista,
    obtenerCentroYZoom,
    redimensionar,
    acercarZoom,
    alejarZoom,
    recentrar
  };
}

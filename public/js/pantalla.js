// =========================
// CONEXIÓN CON SOCKET.IO
// =========================

// Creamos la conexión con el servidor usando Socket.IO.
const socket = io();

// Guardamos referencias a los elementos visuales del estado superior.
const estadoConexion = document.getElementById("estadoConexion"); // Texto que muestra si estamos conectados.
const ultimoEvento = document.getElementById("ultimoEvento");     // Texto del último evento recibido.
const estadoModo = document.getElementById("estadoModo");         // Texto del modo 2D / 3D.
const cajaPasos = document.getElementById("cajaPasos");           // Caja donde se muestran los pasos de la ruta.

// Cuando esta pantalla se conecta correctamente al servidor...
socket.on("connect", () => {
  // Si existe el elemento visual del estado de conexión...
  if (estadoConexion) {
    // Mostramos el identificador único del socket conectado.
    estadoConexion.textContent = `Conectado. ID: ${socket.id}`;
  }

  // Avisamos al servidor de que este cliente es la pantalla principal.
  socket.emit("clientReady", { role: "pantalla" });
});

// =========================
// DATOS DE SESIÓN / USUARIO
// =========================

// Intentamos recuperar del navegador el nombre del usuario guardado.
const nombreUsuarioGuardado = localStorage.getItem("username");

// Si no hay usuario guardado...
if (!nombreUsuarioGuardado) {
  // Redirigimos a la pantalla inicial.
  window.location.href = "/";
}

// Creamos un objeto donde iremos guardando a los contactos conectados.
const contactos = {};

// Inicializamos el nombre del usuario con el dato guardado.
let miNombre = nombreUsuarioGuardado;

// Creamos un avatar por defecto con la inicial del nombre.
let miAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
  miNombre.charAt(0)
)}&background=random&color=fff&rounded=true&size=128`;

// Variable donde guardaremos el tiempo estimado de llegada de nuestra ruta.
let miETA = null;

// Array donde guardaremos los nombres de nuestros amigos.
let misAmigos = [];

// Intentamos recuperar el objeto completo del usuario desde localStorage.
try {
  // Leemos el valor guardado como texto.
  const stringUsuario = localStorage.getItem("user");

  // Si existe...
  if (stringUsuario) {
    // Lo convertimos de JSON a objeto JavaScript.
    const objUsuario = JSON.parse(stringUsuario);

    // Si trae username, lo usamos.
    miNombre = objUsuario.username || miNombre;

    // Si trae avatar, lo usamos.
    if (objUsuario.avatar) miAvatar = objUsuario.avatar;

    // Si trae friends y es un array, lo usamos.
    if (Array.isArray(objUsuario.friends)) misAmigos = objUsuario.friends;
  }
} catch (e) {
  // Si falla la lectura del usuario, lo mostramos en consola.
  console.error("Error leyendo datos del usuario:", e);
}

// =========================
// ELEMENTOS DEL DOM
// =========================

// ---------- PERFIL / USUARIO ----------

const btnPerfil = document.getElementById("btnPerfil");                   // Botón para abrir el modal de perfil.
const modalPerfil = document.getElementById("modalPerfil");               // Modal del perfil.
const cerrarModalPerfil = document.getElementById("cerrarModalPerfil");   // Botón para cerrar el modal.
const nombreMiPerfil = document.getElementById("nombreMiPerfil");         // Nombre dentro del perfil.
const avatarMiPerfil = document.getElementById("avatarMiPerfil");         // Avatar dentro del perfil.
const inputArchivoAvatar = document.getElementById("inputArchivoAvatar"); // Input para subir imagen.
const btnCambiarAvatar = document.getElementById("btnCambiarAvatar");     // Botón para cambiar avatar.
const listaMisAmigos = document.getElementById("listaMisAmigos");         // Lista visual de amigos.
const contadorAmigos = document.getElementById("contadorAmigos");         // Contador de amigos.
const inputBuscarAmigo = document.getElementById("inputBuscarAmigo");     // Input de búsqueda de amigos.
const btnBuscarAmigo = document.getElementById("btnBuscarAmigo");         // Botón de búsqueda de amigos.
const resultadosBusqueda = document.getElementById("resultadosBusqueda"); // Caja donde salen resultados.

// ---------- REALIDAD AUMENTADA ----------

const btnAR = document.getElementById("btnAR");                 // Botón principal de AR.
const contenedorAR = document.getElementById("contenedorAR");   // Contenedor del modo AR.
const videoAR = document.getElementById("videoAR");             // Vídeo de cámara.
const canvasAR = document.getElementById("canvasAR");           // Canvas donde se dibuja la flecha.

// ---------- NAVEGACIÓN ----------

const inputDestino = document.getElementById("inputDestino");                 // Input donde se escribe el destino.
const btnRuta = document.getElementById("btnRuta");                           // Botón para calcular la ruta.
const modoClic = document.getElementById("modoClic");                         // Checkbox para elegir destino con clic.
const modoCompartirUbicacion = document.getElementById("modoCompartirUbicacion"); // Checkbox para compartir ubicación.
const estadoRuta = document.getElementById("estadoRuta");                     // Texto de estado de la ruta.

// ---------- MENÚ SUPERIOR ----------

const menuOpciones = document.getElementById("menuOpciones");          // Menú desplegable / fullscreen.
const btnMenuToggle = document.getElementById("btnMenuToggle");        // Botón que abre el menú.
const cerrarMenuOpciones = document.getElementById("cerrarMenuOpciones"); // Botón que cierra el menú.
const avatarMenu = document.getElementById("avatarMenu");              // Avatar grande dentro del menú.
const nombreMenu = document.getElementById("nombreMenu");              // Nombre dentro del menú.
const btnAvatarIcon = document.getElementById("btnAvatarIcon");        // Avatar pequeño de la barra superior.

// ---------- TARJETA INFERIOR DE RUTA ----------

const tarjetaRuta = document.getElementById("tarjetaRuta");               // Tarjeta inferior.
const tiempoTarjetaRuta = document.getElementById("tiempoTarjetaRuta");   // Tiempo estimado.
const distanciaTarjetaRuta = document.getElementById("distanciaTarjetaRuta"); // Distancia total.
const pasoTarjetaRuta = document.getElementById("pasoTarjetaRuta");       // Paso actual mostrado en la tarjeta.
const cerrarTarjetaRuta = document.getElementById("cerrarTarjetaRuta");   // Botón para cerrar / borrar ruta.
const compartirTarjetaRuta = document.getElementById("compartirTarjetaRuta"); // Botón compartir.
const btnARTarjetaRuta = document.getElementById("btnARTarjetaRuta");     // Botón AR dentro de la tarjeta.
const irTarjetaRuta = document.getElementById("irTarjetaRuta");           // Botón “Ir”.

// ---------- CONTROLES DESPLEGABLES ----------

const btnDesplegarControles = document.getElementById("btnDesplegarControles"); // Botón para abrir/cerrar controles.
const opcionesDesplegables = document.getElementById("opcionesDesplegables");   // Caja de controles desplegables.

// ---------- CONTACTOS LATERALES ----------

const contactosList = document.getElementById("contactosList"); // Lista lateral de contactos visibles.

// Sincronizamos el avatar pequeño de la barra si existe.
if (btnAvatarIcon) btnAvatarIcon.src = miAvatar;

// Sincronizamos el avatar grande del menú si existe.
if (avatarMenu) avatarMenu.src = miAvatar;

// Sincronizamos el avatar del perfil si existe.
if (avatarMiPerfil) avatarMiPerfil.src = miAvatar;

// Sincronizamos el nombre del perfil si existe.
if (nombreMiPerfil) nombreMiPerfil.textContent = miNombre;

// Sincronizamos el nombre del menú si existe.
if (nombreMenu) nombreMenu.textContent = miNombre;

// =========================
// MAPA
// =========================

// Creamos la capa clara.
const capaClara = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  { attribution: "&copy; OpenStreetMap contributors &copy; CARTO" }
);

// Creamos la capa oscura.
const capaOscura = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "&copy; OpenStreetMap contributors &copy; CARTO" }
);

// Creamos la capa satélite.
const capaSatelite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
  }
);

// Guardamos las capas en un array para poder ir alternándolas.
const listaCapasArray = [capaClara, capaOscura, capaSatelite];

// Índice de la capa activa actualmente.
let indiceCapaActual = 0;

// Creamos el mapa Leaflet con la capa clara por defecto.
const mapa = L.map("mapa", {
  center: [40.4168, -3.7038], // Centro inicial.
  zoom: 15,                   // Zoom inicial.
  layers: [capaClara],        // Capa inicial.
  zoomControl: false          // Quitamos el zoom por defecto porque usamos controles propios.
});

// =========================
// VARIABLES DE ESTADO
// =========================

// Coordenadas GPS del usuario.
let miLatitud = null;
let miLongitud = null;

// Marcador del usuario.
let marcadorUsuario = null;

// Control de Leaflet Routing Machine para la ruta.
let controlRuta = null;

// Marcador del destino escogido.
let marcadorDestino = null;

// Coordenadas del destino seleccionado por clic.
let destinoClickLat = null;
let destinoClickLon = null;

// Arrays de navegación.
let instruccionesRuta = []; // Pasos de la ruta.
let coordenadasRuta = [];   // Polilínea completa de la ruta.

// Índice del paso actual.
let indicePasoActual = -1;

// Marcador visual del paso actual.
let marcadorPasoActual = null;

// Distancias y tiempos de control para el autoavance.
const DISTANCIA_CAMBIO_PASO = 18;       // Metros para pasar al siguiente paso.
const DISTANCIA_LLEGADA_DESTINO = 12;   // Metros para considerar llegada al destino.
const RETARDO_CAMBIO_PASO_MS = 2500;    // Tiempo mínimo entre cambios automáticos.

// Variables de control del autoavance.
let ultimoCambioAutomatico = 0; // Timestamp del último cambio.
let rutaTerminada = false;      // Indicador de ruta completada.

// Modo visual del mapa.
let modoActual = "2D";

// =========================
// UTILIDADES
// =========================

// Función para obtener un color estable a partir del id de un contacto.
function obtenerColorContacto(idStr) {
  let hash = 0; // Inicializamos un hash.

  // Recorremos cada carácter del id.
  for (let i = 0; i < idStr.length; i++) {
    // Vamos creando el hash.
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convertimos ese hash a un color hexadecimal.
  const color = Math.floor(Math.abs(Math.sin(hash) * 16777215)).toString(16);

  // Devolvemos el color final con formato #RRGGBB.
  return "#" + ("000000" + color).slice(-6);
}

// Función para calcular distancia entre dos puntos GPS usando Haversine.
function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio medio de la Tierra en metros.
  const aRadianes = (grados) => (grados * Math.PI) / 180; // Conversión a radianes.

  const dLat = aRadianes(lat2 - lat1); // Diferencia de latitud.
  const dLon = aRadianes(lon2 - lon1); // Diferencia de longitud.

  // Fórmula de Haversine.
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const anguloCentral = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Ángulo central.
  return R * anguloCentral; // Distancia final en metros.
}

// Función para traducir una instrucción de ruta al punto exacto de coordenadas.
function obtenerPuntoDeInstruccion(indiceInstruccion) {
  // Si el índice es inválido, devolvemos null.
  if (
    indiceInstruccion < 0 ||
    indiceInstruccion >= instruccionesRuta.length
  ) {
    return null;
  }

  // Cogemos la instrucción correspondiente.
  const instruccion = instruccionesRuta[indiceInstruccion];

  // Si no tiene índice o no existe el punto asociado, devolvemos null.
  if (
    !instruccion ||
    typeof instruccion.index !== "number" ||
    !coordenadasRuta[instruccion.index]
  ) {
    return null;
  }

  // Devolvemos el punto GPS asociado a esa instrucción.
  return coordenadasRuta[instruccion.index];
}

// =========================
// PERFIL Y AMIGOS
// =========================

// Función que dibuja visualmente la lista de mis amigos.
function mostrarMisAmigos() {
  // Si no existe el contenedor, salimos.
  if (!listaMisAmigos) return;

  // Si no hay amigos...
  if (misAmigos.length === 0) {
    // Mostramos mensaje por defecto.
    listaMisAmigos.innerHTML =
      "<p style='font-size:13px; color:gray;'>Aún no tienes amigos agregados.</p>";

    // Ponemos contador a 0 si existe.
    if (contadorAmigos) contadorAmigos.textContent = "0";

    return;
  }

  // Si sí hay amigos, actualizamos el contador.
  if (contadorAmigos) contadorAmigos.textContent = misAmigos.length;

  // Limpiamos la lista antes de volver a pintarla.
  listaMisAmigos.innerHTML = "";

  // Recorremos todos los amigos.
  misAmigos.forEach((amigo) => {
    const div = document.createElement("div"); // Creamos un div.
    div.className = "contact-item";            // Le damos estilo.
    div.innerHTML = `<span style="font-size: 14px; font-weight: bold; color: #333;">${amigo}</span>`; // Metemos el nombre.
    listaMisAmigos.appendChild(div);           // Lo añadimos a la lista.
  });
}

// Si existe el botón de perfil...
if (btnPerfil) {
  btnPerfil.addEventListener("click", () => {
    if (modalPerfil) modalPerfil.style.display = "block"; // Abrimos modal.
    if (nombreMiPerfil) nombreMiPerfil.textContent = miNombre; // Actualizamos nombre.
    if (avatarMiPerfil) avatarMiPerfil.src = miAvatar;         // Actualizamos avatar.
    mostrarMisAmigos();                                        // Redibujamos la lista.
  });
}

// Si existe el botón de cerrar perfil...
if (cerrarModalPerfil) {
  cerrarModalPerfil.addEventListener("click", () => {
    if (modalPerfil) modalPerfil.style.display = "none"; // Cerramos modal.
  });
}

// Si hacemos clic fuera del modal...
window.addEventListener("click", (e) => {
  if (modalPerfil && e.target === modalPerfil) {
    modalPerfil.style.display = "none"; // Cerramos modal.
  }
});

// Si existe botón para cambiar avatar...
if (btnCambiarAvatar) {
  btnCambiarAvatar.addEventListener("click", async () => {
    // Si no hay archivo seleccionado, no seguimos.
    if (!inputArchivoAvatar || !inputArchivoAvatar.files[0]) return;

    const datosFormulario = new FormData(); // Creamos FormData.
    datosFormulario.append("username", miNombre); // Añadimos username.
    datosFormulario.append("avatar", inputArchivoAvatar.files[0]); // Añadimos archivo.

    try {
      const respuesta = await fetch("/api/user/avatar", {
        method: "POST",
        body: datosFormulario
      });

      // Si se actualizó correctamente...
      if (respuesta.ok) {
        const datos = await respuesta.json(); // Leemos la respuesta.
        miAvatar = datos.avatar;              // Guardamos el nuevo avatar.

        if (avatarMiPerfil) avatarMiPerfil.src = miAvatar; // Actualizamos en perfil.
        if (inputArchivoAvatar) inputArchivoAvatar.value = ""; // Limpiamos input.
        if (btnAvatarIcon) btnAvatarIcon.src = miAvatar; // Actualizamos avatar de barra.
        if (avatarMenu) avatarMenu.src = miAvatar;       // Actualizamos avatar de menú.

        // Recuperamos el usuario guardado.
        const objUsuario = JSON.parse(localStorage.getItem("user") || "{}");

        // Actualizamos avatar local.
        objUsuario.avatar = miAvatar;

        // Lo guardamos otra vez.
        localStorage.setItem("user", JSON.stringify(objUsuario));

        // Si estamos compartiendo ubicación, emitimos también el nuevo avatar.
        if (
          modoCompartirUbicacion &&
          modoCompartirUbicacion.checked &&
          miLatitud !== null &&
          miLongitud !== null
        ) {
          socket.emit("shareLocation", {
            lat: miLatitud,
            lng: miLongitud,
            name: miNombre,
            avatar: miAvatar,
            eta: miETA
          });
        }
      }
    } catch (e) {
      console.error(e); // Mostramos error si falla.
    }
  });
}

// Si existe el botón de buscar amigo...
if (btnBuscarAmigo) {
  btnBuscarAmigo.addEventListener("click", async () => {
    const busqueda = inputBuscarAmigo ? inputBuscarAmigo.value.trim() : ""; // Leemos texto.

    if (!busqueda) return; // Si está vacío, no seguimos.

    try {
      // Pedimos al servidor los usuarios que coinciden con la búsqueda.
      const respuesta = await fetch(
        `/api/users?q=${encodeURIComponent(
          busqueda
        )}&current_user=${encodeURIComponent(miNombre)}`
      );

      const datos = await respuesta.json(); // Leemos resultados.

      if (resultadosBusqueda) resultadosBusqueda.innerHTML = ""; // Limpiamos caja.

      // Si no hay resultados...
      if (!datos || datos.length === 0) {
        if (resultadosBusqueda) {
          resultadosBusqueda.innerHTML =
            "<p style='font-size:12px; color:rgba(0,0,0,0.7)'>No se encontraron coincidencias.</p>";
        }
        return;
      }

      // Recorremos cada usuario encontrado.
      datos.forEach((u) => {
        const div = document.createElement("div"); // Contenedor principal.
        div.className = "contact-item";
        div.style.justifyContent = "space-between";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.width = "100%";

        const divInfo = document.createElement("div"); // Bloque de info.
        divInfo.style.display = "flex";
        divInfo.style.alignItems = "center";
        divInfo.style.gap = "10px";

        const imagen = document.createElement("img"); // Imagen del usuario.
        imagen.src = u.avatar;
        imagen.style.width = "30px";
        imagen.style.height = "30px";
        imagen.style.borderRadius = "50%";

        const spanNombre = document.createElement("span"); // Texto del nombre.
        spanNombre.textContent = u.username;

        divInfo.appendChild(imagen);     // Añadimos imagen.
        divInfo.appendChild(spanNombre); // Añadimos nombre.

        const btnAñadir = document.createElement("button"); // Botón de acción.
        btnAñadir.className = "btn-primario";
        btnAñadir.style.padding = "5px 10px";
        btnAñadir.style.fontSize = "11px";
        btnAñadir.style.marginBottom = "0";
        btnAñadir.style.width = "auto";

        // Si ya es amigo...
        if (misAmigos.includes(u.username)) {
          btnAñadir.textContent = "Amigo"; // Mostramos estado.
          btnAñadir.disabled = true;       // Lo desactivamos.
          btnAñadir.style.background = "#555";
        } else {
          btnAñadir.textContent = "Añadir"; // Si no, damos opción de añadir.

          // Acción de añadir amigo.
          btnAñadir.onclick = async () => {
            try {
              const res = await fetch("/api/friend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: miNombre,
                  friend_username: u.username
                })
              });

              // Si el servidor acepta...
              if (res.ok) {
                const datosActualizados = await res.json(); // Leemos nueva lista.
                misAmigos = datosActualizados.friends || []; // La guardamos.

                const objUsuario = JSON.parse(
                  localStorage.getItem("user") || "{}"
                ); // Recuperamos usuario local.

                objUsuario.friends = misAmigos; // Actualizamos friends.

                localStorage.setItem("user", JSON.stringify(objUsuario)); // Guardamos.

                btnAñadir.textContent = "Amigo"; // Actualizamos botón.
                btnAñadir.disabled = true;
                btnAñadir.style.background = "#555";

                mostrarMisAmigos(); // Redibujamos la lista de amigos.
              }
            } catch (error) {
              console.error(error); // Error si falla.
            }
          };
        }

        div.appendChild(divInfo);   // Añadimos bloque izquierdo.
        div.appendChild(btnAñadir); // Añadimos botón derecho.

        if (resultadosBusqueda) {
          resultadosBusqueda.appendChild(div); // Lo pintamos.
        }
      });
    } catch (e) {
      console.error(e); // Error general de búsqueda.
    }
  });
}

// =========================
// MENÚ SUPERIOR
// =========================

// Si existe el botón que abre el menú...
if (btnMenuToggle) {
  btnMenuToggle.addEventListener("click", () => {
    if (avatarMenu) avatarMenu.src = miAvatar; // Sincronizamos avatar.
    if (nombreMenu) nombreMenu.textContent = miNombre; // Sincronizamos nombre.
    if (btnAvatarIcon) btnAvatarIcon.src = miAvatar;   // Sincronizamos icono pequeño.
    if (menuOpciones) menuOpciones.classList.remove("oculto"); // Mostramos menú.
  });
}

// Si existe el botón de cerrar menú...
if (cerrarMenuOpciones) {
  cerrarMenuOpciones.addEventListener("click", () => {
    if (menuOpciones) menuOpciones.classList.add("oculto"); // Ocultamos menú.
  });
}

// =========================
// CONTACTOS Y RUTAS COMPARTIDAS
// =========================

// Función para redibujar la lista lateral de contactos visibles.
function actualizarContactosLateral() {
  if (!contactosList) return; // Si no existe la caja, salimos.

  const idsActivos = Object.keys(contactos); // Obtenemos ids activos.

  // Si no hay contactos...
  if (idsActivos.length === 0) {
    contactosList.innerHTML =
      '<p class="no-contacts-msg">Activa compartir para ver contactos.</p>';
    return;
  }

  let html = ""; // HTML acumulado.

  // Recorremos cada contacto activo.
  idsActivos.forEach((id) => {
    const contacto = contactos[id]; // Datos del contacto.
    const color = obtenerColorContacto(id); // Color único del contacto.

    const nombre =
      contacto.data && contacto.data.name ? contacto.data.name : "Contacto"; // Nombre.

    const avatar =
      contacto.data && contacto.data.avatar
        ? contacto.data.avatar
        : `https://ui-avatars.com/api/?name=C&rounded=true&size=128`; // Avatar.

    const textoLlegada =
      contacto.data && contacto.data.eta
        ? `<small style="color: #27ae60; font-weight: normal; margin-top: 2px;">📍 ${contacto.data.eta}</small>`
        : ""; // ETA.

    // Construimos el bloque visual.
    html += `
      <div class="contact-item">
        <img src="${avatar}" style="border-color: ${color}">
        <span style="display: flex; flex-direction: column;">
            ${nombre}
            ${textoLlegada}
        </span>
      </div>
    `;
  });

  contactosList.innerHTML = html; // Pintamos la lista.
}

// Cuando un contacto deja de estar disponible...
socket.on("removeContact", (data) => {
  if (contactos[data.id]) {
    if (contactos[data.id].marker) mapa.removeLayer(contactos[data.id].marker);         // Quitamos marcador.
    if (contactos[data.id].polyline) mapa.removeLayer(contactos[data.id].polyline);     // Quitamos ruta.
    if (contactos[data.id].destMarker) mapa.removeLayer(contactos[data.id].destMarker); // Quitamos destino.

    delete contactos[data.id]; // Lo borramos del objeto local.
    actualizarContactosLateral(); // Refrescamos la lista.
  }
});

// Función que procesa la ubicación de un contacto.
function procesarUbicacionContacto(id, data) {
  if (!contactos[id]) contactos[id] = {}; // Si no existía, lo creamos.

  contactos[id].data = data; // Guardamos sus datos.

  const color = obtenerColorContacto(id); // Color del contacto.
  const nombre = data.name || "Contacto"; // Nombre del contacto.

  const avatar =
    data.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      nombre.charAt(0)
    )}&rounded=true&size=128`; // Avatar.

  // Si no tenía marcador aún...
  if (!contactos[id].marker) {
    const htmlIcono = `
      <div class="contact-marker-container">
        <img src="${avatar}" style="border-color: ${color}">
        <span class="contact-marker-name" style="background-color: ${color}">${nombre}</span>
      </div>
    `; // HTML del marcador.

    const iconoDiv = L.divIcon({
      className: "contact-avatar-marker",
      html: htmlIcono,
      iconSize: [40, 60],
      iconAnchor: [20, 30]
    }); // Creamos icono div.

    contactos[id].marker = L.marker([data.lat, data.lng], {
      icon: iconoDiv
    }).addTo(mapa); // Añadimos marcador.

    actualizarContactosLateral(); // Refrescamos lista lateral.
  } else {
    contactos[id].marker.setLatLng([data.lat, data.lng]); // Si ya existía, movemos el marcador.
  }
}

// Función que procesa la ruta compartida por un contacto.
function procesarRutaContacto(id, datosRuta) {
  if (!contactos[id]) contactos[id] = {}; // Si no existía, lo creamos.

  const color = obtenerColorContacto(id); // Color del contacto.
  const nombre =
    contactos[id].data && contactos[id].data.name
      ? contactos[id].data.name
      : "Contacto"; // Nombre.

  if (contactos[id].polyline) {
    mapa.removeLayer(contactos[id].polyline); // Quitamos polilínea previa.
  }

  if (contactos[id].destMarker) {
    mapa.removeLayer(contactos[id].destMarker); // Quitamos marcador de destino previo.
  }

  const coordenadasLatLng = datosRuta.map((pt) => [pt.lat, pt.lng]); // Convertimos coordenadas.

  contactos[id].polyline = L.polyline(coordenadasLatLng, {
    color: color,
    weight: 4,
    opacity: 0.8,
    dashArray: "10, 10"
  })
    .bindTooltip("Ruta de " + nombre, { sticky: true })
    .addTo(mapa); // Dibujamos la ruta.

  if (coordenadasLatLng.length > 0) {
    const destino = coordenadasLatLng[coordenadasLatLng.length - 1]; // Último punto.

    const iconoDestino = L.divIcon({
      className: "contact-avatar-marker",
      html: `<div style="display:flex; flex-direction:column; align-items:center;">
               <div style="background:${color}; color:white; font-size:11px; font-weight:bold; padding:3px 8px; border-radius:8px; white-space:nowrap;">
                 📍 Destino de ${nombre}
               </div>
             </div>`,
      iconSize: [100, 30],
      iconAnchor: [50, 15]
    }); // Icono del destino.

    contactos[id].destMarker = L.marker(destino, {
      icon: iconoDestino
    }).addTo(mapa); // Añadimos destino.
  }
}

// Cuando recibimos el estado inicial de usuarios compartiendo...
socket.on("existingSharedData", (data) => {
  for (const id in data) {
    if (id !== socket.id) {
      const esAmigo = data[id].location
        ? misAmigos.includes(data[id].location.name)
        : true; // Filtramos por amigos.

      if (esAmigo) {
        if (data[id].location) procesarUbicacionContacto(id, data[id].location); // Procesamos ubicación.
        if (data[id].route) procesarRutaContacto(id, data[id].route);             // Procesamos ruta.
      }
    }
  }
});

// Cuando nos llega una nueva ubicación de un contacto...
socket.on("updateContactLocation", (data) => {
  if (misAmigos.includes(data.name)) {
    procesarUbicacionContacto(data.id, data); // Actualizamos ubicación.
  }
});

// Cuando nos llega una nueva ruta de un contacto...
socket.on("updateContactRoute", (data) => {
  if (contactos[data.id]) {
    procesarRutaContacto(data.id, data.route); // Actualizamos ruta.
  }
});

// =========================
// TARJETA INFERIOR DE RUTA
// =========================

// Función para mostrar la tarjeta inferior con distancia, tiempo y botones.
function mostrarTarjetaRuta(distanciaKm, tiempoFormateado) {
  if (!tarjetaRuta || !tiempoTarjetaRuta || !distanciaTarjetaRuta || !pasoTarjetaRuta) return;

  tiempoTarjetaRuta.textContent = tiempoFormateado;       // Mostramos tiempo.
  distanciaTarjetaRuta.textContent = `${distanciaKm} km`; // Mostramos distancia.
  pasoTarjetaRuta.textContent = "Ruta lista. Pulsa Ir para empezar la navegación."; // Texto inicial.

  // Si compartir ubicación está activo...
  if (modoCompartirUbicacion && modoCompartirUbicacion.checked) {
    if (compartirTarjetaRuta) {
      compartirTarjetaRuta.classList.add("active");
      compartirTarjetaRuta.innerHTML =
        '<span class="material-symbols-outlined">share</span> Compartiendo';
    }
  } else {
    // Si no, dejamos el botón normal.
    if (compartirTarjetaRuta) {
      compartirTarjetaRuta.classList.remove("active");
      compartirTarjetaRuta.innerHTML =
        '<span class="material-symbols-outlined">share</span> Compartir';
    }
  }

  tarjetaRuta.classList.remove("oculto");               // Mostramos tarjeta.
  document.body.classList.add("tarjeta-ruta-visible");  // Añadimos clase al body.
}

// Función para ocultar la tarjeta inferior.
function ocultarTarjetaRuta() {
  if (tarjetaRuta) tarjetaRuta.classList.add("oculto"); // Ocultamos tarjeta.
  document.body.classList.remove("tarjeta-ruta-visible"); // Quitamos clase del body.
  if (compartirTarjetaRuta) compartirTarjetaRuta.classList.remove("active"); // Quitamos estado activo.
}

// Función para actualizar el paso actual mostrado dentro de la tarjeta.
function actualizarPasoTarjetaRuta() {
  if (!pasoTarjetaRuta || !instruccionesRuta.length || indicePasoActual < 0) return;

  const instruccion = instruccionesRuta[indicePasoActual]; // Cogemos instrucción actual.

  pasoTarjetaRuta.innerHTML = `<strong>Paso ${indicePasoActual + 1}/${
    instruccionesRuta.length
  }</strong>: ${instruccion.text || ""} (~${Math.round(
    instruccion.distance || 0
  )} m)`; // Mostramos el paso actual.
}

// Si existe el botón de cerrar tarjeta...
if (cerrarTarjetaRuta) {
  cerrarTarjetaRuta.addEventListener("click", () => {
    eliminarRuta(); // Borramos la ruta.
  });
}

// Si existe el botón de compartir tarjeta...
if (compartirTarjetaRuta) {
  compartirTarjetaRuta.addEventListener("click", () => {
    if (!modoCompartirUbicacion) return;

    modoCompartirUbicacion.checked = !modoCompartirUbicacion.checked; // Invertimos estado.
    modoCompartirUbicacion.dispatchEvent(new Event("change"));        // Lanzamos cambio manualmente.
  });
}

// Si existe el botón AR de la tarjeta...
if (btnARTarjetaRuta) {
  btnARTarjetaRuta.addEventListener("click", () => {
    if (typeof toggleAR === "function") {
      toggleAR(); // Llamamos a la función de AR definida en ar.js.
    }
  });
}

// Si existe el botón Ir...
if (irTarjetaRuta) {
  irTarjetaRuta.addEventListener("click", () => {
    if (!instruccionesRuta.length) return; // Si no hay ruta, no hacemos nada.
    indicePasoActual = 0;                  // Reiniciamos el paso.
    mostrarPasoActual();                   // Mostramos el primer paso.
    actualizarPasoTarjetaRuta();           // Actualizamos tarjeta.
  });
}

// =========================
// COMPARTIR UBICACIÓN
// =========================

// Si existe el checkbox de compartir ubicación...
if (modoCompartirUbicacion) {
  modoCompartirUbicacion.addEventListener("change", () => {
    // Actualizamos visualmente el botón de compartir dentro de la tarjeta.
    if (compartirTarjetaRuta) {
      if (modoCompartirUbicacion.checked) {
        compartirTarjetaRuta.classList.add("active");
        compartirTarjetaRuta.innerHTML =
          '<span class="material-symbols-outlined">share</span> Compartiendo';
      } else {
        compartirTarjetaRuta.classList.remove("active");
        compartirTarjetaRuta.innerHTML =
          '<span class="material-symbols-outlined">share</span> Compartir';
      }
    }

    // Si se ha activado compartir...
    if (modoCompartirUbicacion.checked) {
      // Si ya tenemos posición, la emitimos.
      if (miLatitud !== null && miLongitud !== null) {
        socket.emit("shareLocation", {
          lat: miLatitud,
          lng: miLongitud,
          name: miNombre,
          avatar: miAvatar,
          eta: miETA
        });
      }

      // Si además hay ruta calculada, compartimos la ruta.
      if (coordenadasRuta.length > 0) {
        socket.emit("shareRoute", coordenadasRuta);
      }
    } else {
      // Si se desactiva, avisamos al servidor para dejar de compartir.
      socket.emit("stopSharing");
    }
  });
}

// =========================
// GPS DEL USUARIO
// =========================

// Si el navegador soporta geolocalización...
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (pos) => {
      miLatitud = pos.coords.latitude;  // Guardamos latitud.
      miLongitud = pos.coords.longitude; // Guardamos longitud.

      // Si todavía no existe el marcador del usuario...
      if (!marcadorUsuario) {
        mapa.setView([miLatitud, miLongitud], 16); // Centramos mapa.

        marcadorUsuario = L.marker([miLatitud, miLongitud])
          .addTo(mapa)
          .bindPopup("Estás aquí")
          .openPopup(); // Creamos marcador.

        if (estadoRuta) {
          estadoRuta.textContent =
            "Ubicación obtenida. Ya puedes buscar una ruta.";
        }
      } else {
        // Si ya existía, solo lo movemos.
        marcadorUsuario.setLatLng([miLatitud, miLongitud]);
      }

      // Si estamos compartiendo ubicación...
      if (
        modoCompartirUbicacion &&
        modoCompartirUbicacion.checked
      ) {
        socket.emit("shareLocation", {
          lat: miLatitud,
          lng: miLongitud,
          name: miNombre,
          avatar: miAvatar,
          eta: miETA
        });
      }

      // Comprobamos si hay que avanzar automáticamente de paso.
      actualizarPasoAutomatico();
    },
    (err) => {
      if (estadoRuta) {
        estadoRuta.textContent =
          "No se pudo obtener el GPS. Permite el acceso a la ubicación.";
      }
      console.error("Error GPS:", err); // Mostramos error.
    },
    {
      enableHighAccuracy: true, // Queremos alta precisión.
      maximumAge: 0,            // No reutilizar caché.
      timeout: 10000            // Máximo 10 segundos de espera.
    }
  );
} else {
  // Si no soporta geolocalización...
  if (estadoRuta) {
    estadoRuta.textContent = "Tu navegador no soporta geolocalización.";
  }
}

// =========================
// SELECCIÓN DE DESTINO CON CLIC
// =========================

// Cuando se hace clic en el mapa...
mapa.on("click", (e) => {
  if (!modoClic || !modoClic.checked) return; // Si no está activo el modo clic, salimos.

  destinoClickLat = e.latlng.lat; // Guardamos latitud.
  destinoClickLon = e.latlng.lng; // Guardamos longitud.

  // Si ya existía marcador de destino...
  if (marcadorDestino) {
    marcadorDestino.setLatLng(e.latlng); // Lo movemos.
  } else {
    // Si no, lo creamos.
    marcadorDestino = L.marker(e.latlng, {
      icon: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(mapa);
  }

  // Mostramos popup con coordenadas del destino.
  marcadorDestino
    .bindPopup(
      `Destino: ${destinoClickLat.toFixed(5)}, ${destinoClickLon.toFixed(5)}`
    )
    .openPopup();

  // Actualizamos el estado de la ruta.
  if (estadoRuta) {
    estadoRuta.textContent =
      "Destino seleccionado en el mapa. Pulsa 'Buscar y calcular ruta'.";
  }
});

// =========================
// FUNCIONES DE NAVEGACIÓN
// =========================

// Función para limpiar completamente la ruta actual.
function limpiarRuta() {
  if (controlRuta) {
    mapa.removeControl(controlRuta); // Quitamos el control de ruta del mapa.
    controlRuta = null;              // Lo reseteamos.
  }

  // Si AR está activo, lo desactivamos.
  if (
    typeof toggleAR === "function" &&
    typeof isARMode !== "undefined" &&
    isARMode
  ) {
    toggleAR();
  }

  // Ocultamos el botón AR del menú principal si existe.
  if (btnAR) {
    btnAR.classList.add("oculto");
  }

  ocultarTarjetaRuta(); // Ocultamos la tarjeta inferior.

  // Si existe el marcador del paso actual, lo quitamos.
  if (marcadorPasoActual) {
    mapa.removeLayer(marcadorPasoActual);
    marcadorPasoActual = null;
  }

  // Reseteamos arrays y estado de navegación.
  instruccionesRuta = [];
  coordenadasRuta = [];
  indicePasoActual = -1;
  ultimoCambioAutomatico = 0;
  rutaTerminada = false;

  // Estas variables viven en ar.js. Solo las reseteamos si existen.
  if (typeof rumboObjetivoSuavizado !== "undefined") {
    rumboObjetivoSuavizado = null;
  }

  if (typeof anguloFlechaRenderizado !== "undefined") {
    anguloFlechaRenderizado = null;
  }

  // Texto por defecto de la caja de pasos.
  if (cajaPasos) {
    cajaPasos.textContent = "No hay una ruta activa.";
  }

  miETA = null; // Quitamos ETA.

  // Si estamos compartiendo ubicación, mandamos también que ya no tenemos ETA.
  if (
    modoCompartirUbicacion &&
    modoCompartirUbicacion.checked &&
    miLatitud !== null &&
    miLongitud !== null
  ) {
    socket.emit("shareLocation", {
      lat: miLatitud,
      lng: miLongitud,
      name: miNombre,
      avatar: miAvatar,
      eta: miETA
    });
  }
}

// Función que avanza automáticamente de paso cuando te acercas al siguiente punto.
function actualizarPasoAutomatico() {
  // Si no toca avanzar, salimos.
  if (
    rutaTerminada ||
    miLatitud === null ||
    miLongitud === null ||
    !instruccionesRuta.length ||
    !coordenadasRuta.length ||
    indicePasoActual < 0
  ) {
    return;
  }

  const ahora = Date.now(); // Momento actual.

  // Si aún no ha pasado suficiente tiempo desde el último cambio, salimos.
  if (ahora - ultimoCambioAutomatico < RETARDO_CAMBIO_PASO_MS) {
    return;
  }

  const puntoFinal = coordenadasRuta[coordenadasRuta.length - 1]; // Último punto de la ruta.

  // Si tenemos punto final...
  if (puntoFinal) {
    const distanciaFinal = distanciaEnMetros(
      miLatitud,
      miLongitud,
      puntoFinal.lat,
      puntoFinal.lng
    ); // Distancia al destino.

    // Si ya estamos suficientemente cerca del destino...
    if (distanciaFinal <= DISTANCIA_LLEGADA_DESTINO) {
      rutaTerminada = true; // Marcamos la ruta como terminada.
      indicePasoActual = instruccionesRuta.length - 1; // Último paso.

      if (estadoRuta) estadoRuta.textContent = "Has llegado al destino";
      if (cajaPasos) cajaPasos.textContent = "Has llegado al destino";

      ultimoCambioAutomatico = ahora; // Guardamos momento.
      return;
    }
  }

  let haAvanzado = false; // Bandera para saber si hemos pasado al siguiente paso.

  // Mientras aún queden pasos...
  while (indicePasoActual < instruccionesRuta.length - 1) {
    const siguienteIndice = indicePasoActual + 1; // Índice del siguiente paso.
    const puntoSiguiente = obtenerPuntoDeInstruccion(siguienteIndice); // Punto asociado.

    if (!puntoSiguiente) break; // Si no existe, salimos.

    const distanciaSiguiente = distanciaEnMetros(
      miLatitud,
      miLongitud,
      puntoSiguiente.lat,
      puntoSiguiente.lng
    ); // Distancia al siguiente punto.

    // Si estamos lo bastante cerca...
    if (distanciaSiguiente <= DISTANCIA_CAMBIO_PASO) {
      indicePasoActual = siguienteIndice; // Avanzamos paso.
      haAvanzado = true;                  // Marcamos avance.
      ultimoCambioAutomatico = ahora;     // Guardamos tiempo.
    } else {
      break; // Si no, paramos.
    }
  }

  // Si hemos avanzado, redibujamos paso actual.
  if (haAvanzado) {
    mostrarPasoActual();

    if (estadoRuta) {
      estadoRuta.textContent = "Paso actualizado automáticamente.";
    }
  }
}

// Función que muestra el paso actual tanto en caja principal como en tarjeta.
function mostrarPasoActual() {
  if (!instruccionesRuta.length) {
    if (cajaPasos) {
      cajaPasos.textContent = "No hay instrucciones disponibles para esta ruta.";
    }
    return;
  }

  // Corregimos índice por abajo.
  if (indicePasoActual < 0) {
    indicePasoActual = 0;
  }

  // Corregimos índice por arriba.
  if (indicePasoActual >= instruccionesRuta.length) {
    indicePasoActual = instruccionesRuta.length - 1;
  }

  const instruccion = instruccionesRuta[indicePasoActual]; // Instrucción actual.

  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}:<br><br>` +
    `<strong>${instruccion.text || "Sin texto disponible"}</strong><br><br>` +
    `Distancia aproximada: ${Math.round(instruccion.distance || 0)} m`; // Texto principal.

  if (cajaPasos) {
    cajaPasos.innerHTML = textoPaso; // Lo mostramos.
  }

  actualizarPasoTarjetaRuta(); // Refrescamos también la tarjeta.

  // Si la instrucción tiene un punto válido...
  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    const punto = coordenadasRuta[instruccion.index]; // Cogemos el punto.
    mapa.panTo([punto.lat, punto.lng]); // Centramos mapa.

    // Si el marcador del paso ya existe, lo movemos.
    if (marcadorPasoActual) {
      marcadorPasoActual.setLatLng([punto.lat, punto.lng]);
    } else {
      // Si no existe, lo creamos.
      marcadorPasoActual = L.circleMarker([punto.lat, punto.lng], {
        color: "white",
        weight: 5,
        fillColor: "red",
        fillOpacity: 1,
        radius: 9
      }).addTo(mapa);
    }
  }
}

// Función que alterna el modo 2D y 3D.
function toggleModeVisual() {
  if (modoActual === "2D") {
    modoActual = "3D";
    document.body.classList.remove("modo-2d");
    document.body.classList.add("modo-3d");
  } else {
    modoActual = "2D";
    document.body.classList.remove("modo-3d");
    document.body.classList.add("modo-2d");
  }

  if (estadoModo) {
    estadoModo.textContent = `Modo: ${modoActual}`;
  }

  setTimeout(() => {
    mapa.invalidateSize(); // Forzamos refresco visual del mapa.
  }, 450);
}

// Función de zoom in.
function zoomIn() {
  mapa.zoomIn(); // Acercamos el mapa.
}

// Función de zoom out.
function zoomOut() {
  mapa.zoomOut(); // Alejamos el mapa.
}

// Función para cambiar la capa del mapa.
function cambiarCapa() {
  mapa.removeLayer(listaCapasArray[indiceCapaActual]); // Quitamos la capa actual.
  indiceCapaActual = (indiceCapaActual + 1) % listaCapasArray.length; // Pasamos a la siguiente.
  mapa.addLayer(listaCapasArray[indiceCapaActual]); // Añadimos la nueva capa.
}

// Función para recentrar el mapa en la posición actual.
function recentrarMapa() {
  if (miLatitud !== null && miLongitud !== null) {
    mapa.setView([miLatitud, miLongitud], 16); // Centramos mapa en el usuario.

    if (estadoRuta) {
      estadoRuta.textContent = "Mapa recentrado en tu posición.";
    }
  } else {
    if (estadoRuta) {
      estadoRuta.textContent = "Todavía no se conoce tu posición actual.";
    }
  }
}

// Función para eliminar la ruta actual.
function eliminarRuta() {
  if (!controlRuta) {
    if (cajaPasos) {
      cajaPasos.innerHTML =
        "No puedes eliminar la ruta porque todavía no hay una activa.";
    }
    return;
  }

  limpiarRuta(); // Limpiamos la ruta.

  // Si existía marcador de destino, lo quitamos.
  if (marcadorDestino) {
    mapa.removeLayer(marcadorDestino);
    marcadorDestino = null;
    destinoClickLat = null;
    destinoClickLon = null;
  }

  if (cajaPasos) {
    cajaPasos.innerHTML = "Ruta eliminada.";
  }

  if (estadoRuta) {
    estadoRuta.textContent = "Ruta eliminada. Elige un nuevo destino.";
  }
}

// =========================
// EVENTOS RECIBIDOS DESDE SOCKET
// =========================

// Si recibimos “nextStep”...
socket.on("nextStep", () => {
  if (ultimoEvento) ultimoEvento.textContent = "Último evento: nextStep"; // Mostramos evento.
  if (indicePasoActual < instruccionesRuta.length - 1) {
    indicePasoActual++; // Avanzamos paso.
    mostrarPasoActual(); // Actualizamos vista.
  }
});

// Si recibimos “prevStep”...
socket.on("prevStep", () => {
  if (ultimoEvento) ultimoEvento.textContent = "Último evento: prevStep"; // Mostramos evento.
  if (indicePasoActual > 0) {
    indicePasoActual--; // Retrocedemos paso.
    mostrarPasoActual(); // Actualizamos vista.
  }
});

// Si recibimos “zoomIn”...
socket.on("zoomIn", () => {
  if (ultimoEvento) ultimoEvento.textContent = "Último evento: zoomIn"; // Mostramos evento.
  zoomIn(); // Aplicamos zoom.
});

// Si recibimos “zoomOut”...
socket.on("zoomOut", () => {
  if (ultimoEvento) ultimoEvento.textContent = "Último evento: zoomOut"; // Mostramos evento.
  zoomOut(); // Aplicamos zoom.
});

// Si recibimos “toggleMode”...
socket.on("toggleMode", () => {
  if (ultimoEvento) ultimoEvento.textContent = "Último evento: toggleMode"; // Mostramos evento.
  toggleModeVisual(); // Cambiamos modo.
});

// Si recibimos “recenter”...
socket.on("recenter", () => {
  if (ultimoEvento) ultimoEvento.textContent = "Último evento: recenter"; // Mostramos evento.
  recentrarMapa(); // Recentramos mapa.
});

// Si recibimos datos de orientación desde otro cliente...
socket.on("orientationData", (data) => {
  console.log("orientationData recibido:", data); // Solo lo mostramos en consola.
});

// =========================
// CÁLCULO DE RUTA
// =========================

// Función principal para calcular una ruta.
async function calcularRuta() {
  // Si aún no tenemos GPS...
  if (miLatitud === null || miLongitud === null) {
    if (estadoRuta) {
      estadoRuta.textContent =
        "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    }
    return;
  }

  const destino = inputDestino ? inputDestino.value.trim() : ""; // Texto escrito.
  const usarClic = modoClic ? modoClic.checked : false;          // Si se usa modo clic.

  let destLat;    // Latitud destino.
  let destLon;    // Longitud destino.
  let destNombre; // Nombre visible del destino.

  // Si se está usando el punto del mapa...
  if (usarClic && destinoClickLat !== null) {
    destLat = destinoClickLat;
    destLon = destinoClickLon;
    destNombre = `Punto: ${destLat.toFixed(5)}, ${destLon.toFixed(5)}`;
  } else if (destino) {
    // Si se ha escrito texto, buscamos el lugar.
    if (estadoRuta) {
      estadoRuta.textContent = "Buscando el lugar...";
    }

    try {
      // Construimos la URL de Nominatim.
      const urlGeo = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        destino
      )}&limit=1`;

      // Hacemos la petición.
      const respuestaGeo = await fetch(urlGeo);

      // Convertimos a JSON.
      const datosGeo = await respuestaGeo.json();

      // Si no encuentra nada...
      if (datosGeo.length === 0) {
        if (estadoRuta) {
          estadoRuta.textContent =
            "No se encontró ese destino. Intenta ser más específico.";
        }
        return;
      }

      // Guardamos el resultado encontrado.
      destLat = parseFloat(datosGeo[0].lat);
      destLon = parseFloat(datosGeo[0].lon);
      destNombre = datosGeo[0].display_name;
    } catch (error) {
      if (estadoRuta) {
        estadoRuta.textContent =
          "Error de conexión con los servicios de mapas.";
      }
      console.error(error);
      return;
    }
  } else {
    // Si no hay ni texto ni clic...
    if (estadoRuta) {
      estadoRuta.textContent =
        "Escribe un destino o selecciona uno en el mapa.";
    }
    return;
  }

  limpiarRuta(); // Limpiamos cualquier ruta anterior.

  if (estadoRuta) {
    estadoRuta.textContent = "Calculando ruta a pie...";
  }

  // Creamos el control de ruta.
  controlRuta = L.Routing.control({
    waypoints: [
      L.latLng(miLatitud, miLongitud), // Inicio.
      L.latLng(destLat, destLon)       // Final.
    ],
    routeWhileDragging: false, // No recalcular al arrastrar.
    router: L.Routing.osrmv1({
      serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",
      profile: "foot" // Ruta a pie.
    }),
    lineOptions: {
      styles: [{ color: "#1f6feb", weight: 5, opacity: 0.85 }] // Estilo de la línea.
    },
    createMarker: function (i, waypoint) {
      if (i === 0) return null; // No ponemos marcador en el inicio.
      return L.marker(waypoint.latLng).bindPopup(destNombre); // Sí en el destino.
    },
    language: "es",
    show: true,
    collapsible: true,
    fitSelectedRoutes: true
  }).addTo(mapa);

  // Cuando la ruta se calcula correctamente...
  controlRuta.on("routesfound", (e) => {
    const ruta = e.routes[0]; // Cogemos la primera ruta.

    instruccionesRuta = ruta.instructions || []; // Guardamos instrucciones.
    coordenadasRuta = ruta.coordinates || [];    // Guardamos coordenadas.

    indicePasoActual = 0;        // Empezamos en el primer paso.
    ultimoCambioAutomatico = 0;  // Reiniciamos autoavance.
    rutaTerminada = false;       // Marcamos que aún no ha terminado.

    const distanciaKm = (ruta.summary.totalDistance / 1000).toFixed(1); // Distancia en km.
    const minutosTotales = Math.round(ruta.summary.totalTime / 60);      // Tiempo en minutos.

    let tiempoFormateado = ""; // Texto final del tiempo.

    if (minutosTotales < 60) {
      tiempoFormateado = `${minutosTotales} min`;
    } else if (minutosTotales < 1440) {
      const horas = Math.floor(minutosTotales / 60);
      const minutosRestantes = minutosTotales % 60;
      tiempoFormateado = `${horas} h ${minutosRestantes} min`;
    } else {
      const dias = Math.floor(minutosTotales / 1440);
      const horasRestantes = Math.floor((minutosTotales % 1440) / 60);
      tiempoFormateado = `${dias} d ${horasRestantes} h`;
    }

    miETA = `Llega en ${tiempoFormateado} (${distanciaKm} km)`; // Guardamos ETA.

    // Si estamos compartiendo ubicación, actualizamos también ETA.
    if (
      modoCompartirUbicacion &&
      modoCompartirUbicacion.checked &&
      miLatitud !== null &&
      miLongitud !== null
    ) {
      socket.emit("shareLocation", {
        lat: miLatitud,
        lng: miLongitud,
        name: miNombre,
        avatar: miAvatar,
        eta: miETA
      });
    }

    // Actualizamos el estado visible.
    if (estadoRuta) {
      estadoRuta.textContent = `Ruta calculada: ${distanciaKm} km, ~${tiempoFormateado} a pie.`;
    }

    // Mostramos el botón AR principal si existe.
    if (btnAR) {
      btnAR.classList.remove("oculto");
    }

    // Si estamos compartiendo, también compartimos la ruta.
    if (modoCompartirUbicacion && modoCompartirUbicacion.checked) {
      socket.emit("shareRoute", coordenadasRuta);
    }

    mostrarTarjetaRuta(distanciaKm, tiempoFormateado); // Mostramos tarjeta inferior.
    mostrarPasoActual(); // Mostramos primer paso.
  });

  // Si falla el cálculo de la ruta...
  controlRuta.on("routingerror", () => {
    if (estadoRuta) {
      estadoRuta.textContent =
        "No se pudo calcular la ruta. Prueba con otro destino.";
    }
  });
}

// =========================
// BOTÓN Y ENTER PARA CALCULAR LA RUTA
// =========================

// Si existe el botón de ruta...
if (btnRuta) {
  btnRuta.addEventListener("click", calcularRuta); // Calculamos ruta al pulsar.
}

// Si existe el input de destino...
if (inputDestino) {
  inputDestino.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      calcularRuta(); // Calculamos ruta al pulsar Enter.
    }
  });
}

// =========================
// CONTROLES DESPLEGABLES
// =========================

// Si existen el botón y la caja de controles...
if (btnDesplegarControles && opcionesDesplegables) {
  btnDesplegarControles.addEventListener("click", () => {
    opcionesDesplegables.classList.toggle("oculto"); // Alternamos visibilidad.
  });
}
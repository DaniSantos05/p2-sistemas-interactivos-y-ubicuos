// =========================
// CONEXIÓN Y DATOS BASE
// =========================

// Abrimos el canal de tiempo real con el servidor.
const socket = io();

// Referencias de estado para mensajes rápidos en la interfaz.
const estadoConexion = document.getElementById("estadoConexion");
const ultimoEvento = document.getElementById("ultimoEvento");
const estadoModo = document.getElementById("estadoModo");
const cajaPasos = document.getElementById("cajaPasos");

// Leemos el usuario guardado.
const nombreUsuarioGuardado = localStorage.getItem("username");

// Si no hay sesión activa, volvemos a la pantalla de entrada.
if (!nombreUsuarioGuardado) {
  window.location.href = "/";
}

// Mapa en memoria de contactos conectados.
const contactos = {};

// Datos del usuario actual compartidos con el resto de módulos.
let miNombre = nombreUsuarioGuardado;
let miAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(miNombre.charAt(0))}&background=random&color=fff&rounded=true&size=128`;
let miETA = null;
let misAmigos = [];

// Intentamos completar perfil desde localStorage.
try {
  const stringUsuario = localStorage.getItem("user");
  if (stringUsuario) {
    const objUsuario = JSON.parse(stringUsuario);
    miNombre = objUsuario.username;
    if (objUsuario.avatar) miAvatar = objUsuario.avatar;
    if (objUsuario.friends) misAmigos = objUsuario.friends;
  }
} catch (e) {
  // Si hay error en datos guardados seguimos con valores por defecto.
}

// Al conectar mostramos estado y avisamos rol del cliente.
socket.on("connect", () => {
  estadoConexion.textContent = `Conectado. ID: ${socket.id}`;
  socket.emit("clientReady", { role: "pantalla" });
});

// Genera un color estable para cada contacto.
function obtenerColorContacto(idSocket) {
  let hash = 0;
  for (let i = 0; i < idSocket.length; i++) {
    hash = idSocket.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.floor(Math.abs(Math.sin(hash) * 16777215)).toString(16);
  return "#" + ("000000" + color).slice(-6);
}

// =========================
// SINCRONIZACIÓN MULTIUSUARIO
// =========================

// Al entrar recibimos estado inicial de usuarios compartiendo.
socket.on("existingSharedData", (data) => {
  for (const id in data) {
    if (id === socket.id) continue;
    const esAmigo = data[id].location ? misAmigos.includes(data[id].location.name) : true;
    if (!esAmigo) continue;
    if (data[id].location) procesarUbicacionContacto(id, data[id].location);
    if (data[id].route) procesarRutaContacto(id, data[id].route);
  }
});

// Actualización de posición de un contacto.
socket.on("updateContactLocation", (data) => {
  if (misAmigos.includes(data.name)) {
    procesarUbicacionContacto(data.id, data);
  }
});

// Actualización de ruta de un contacto.
socket.on("updateContactRoute", (data) => {
  if (contactos[data.id]) {
    procesarRutaContacto(data.id, data.route);
  }
});

// Si un contacto deja de compartir, lo quitamos del mapa y del lateral.
socket.on("removeContact", (data) => {
  if (!contactos[data.id]) return;
  if (contactos[data.id].marker) mapa.removeLayer(contactos[data.id].marker);
  if (contactos[data.id].polyline) mapa.removeLayer(contactos[data.id].polyline);
  if (contactos[data.id].destMarker) mapa.removeLayer(contactos[data.id].destMarker);
  delete contactos[data.id];
  actualizarContactosLateral();
});

// =========================
// PERFIL Y AMIGOS
// =========================

// Referencias del modal de perfil.
const btnPerfil = document.getElementById("btnPerfil");
const modalPerfil = document.getElementById("modalPerfil");
const cerrarModalPerfil = document.getElementById("cerrarModalPerfil");
const nombreMiPerfil = document.getElementById("nombreMiPerfil");
const avatarMiPerfil = document.getElementById("avatarMiPerfil");
const inputArchivoAvatar = document.getElementById("inputArchivoAvatar");
const btnCambiarAvatar = document.getElementById("btnCambiarAvatar");
const listaMisAmigos = document.getElementById("listaMisAmigos");
const contadorAmigos = document.getElementById("contadorAmigos");

// Pinta la lista de amigos del usuario.
function mostrarMisAmigos() {
  if (!listaMisAmigos) return;

  if (misAmigos.length === 0) {
    listaMisAmigos.innerHTML = "<p style='font-size:13px; color:gray;'>Aún no tienes amigos agregados.</p>";
    if (contadorAmigos) contadorAmigos.textContent = "0";
    return;
  }

  if (contadorAmigos) contadorAmigos.textContent = misAmigos.length;
  listaMisAmigos.innerHTML = "";

  misAmigos.forEach((nombreAmigo) => {
    const div = document.createElement("div");
    div.className = "contact-item";
    div.innerHTML = `<span style="font-size: 14px; font-weight: bold; color: #333;">${nombreAmigo}</span>`;
    listaMisAmigos.appendChild(div);
  });
}

// Abre modal de perfil y sincroniza datos visibles.
if (btnPerfil) {
  btnPerfil.addEventListener("click", () => {
    modalPerfil.style.display = "block";
    nombreMiPerfil.textContent = miNombre;
    avatarMiPerfil.src = miAvatar;
    mostrarMisAmigos();
  });
}

// Cierra modal pulsando la cruz.
if (cerrarModalPerfil) {
  cerrarModalPerfil.addEventListener("click", () => {
    modalPerfil.style.display = "none";
  });
}

// Cierra modal pulsando fuera de su contenido.
window.addEventListener("click", (e) => {
  if (e.target === modalPerfil) {
    modalPerfil.style.display = "none";
  }
});

// Sube una nueva imagen de perfil y refresca interfaz local.
if (btnCambiarAvatar) {
  btnCambiarAvatar.addEventListener("click", async () => {
    if (!inputArchivoAvatar || !inputArchivoAvatar.files[0]) return;

    const datosFormulario = new FormData();
    datosFormulario.append("username", miNombre);
    datosFormulario.append("avatar", inputArchivoAvatar.files[0]);

    try {
      const respuesta = await fetch("/api/user/avatar", {
        method: "POST",
        body: datosFormulario
      });

      if (!respuesta.ok) return;

      const datos = await respuesta.json();
      miAvatar = datos.avatar;
      avatarMiPerfil.src = miAvatar;
      inputArchivoAvatar.value = "";

      // Actualizamos avatares del menú superior y del modal.
      const btnAvatar = document.getElementById("btnAvatarIcon");
      const avatarMenu = document.getElementById("avatarMenu");
      if (btnAvatar) btnAvatar.src = miAvatar;
      if (avatarMenu) avatarMenu.src = miAvatar;

      // Guardamos avatar en localStorage.
      const objUsuario = JSON.parse(localStorage.getItem("user") || "{}");
      objUsuario.avatar = miAvatar;
      localStorage.setItem("user", JSON.stringify(objUsuario));

      // Si estamos compartiendo ubicación emitimos avatar actualizado.
      if (typeof modoCompartirUbicacion !== "undefined" && modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
        socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
      }
    } catch (e) {
      console.error(e);
    }
  });
}

// =========================
// BÚSQUEDA Y ALTA DE AMIGOS
// =========================

const inputBuscarAmigo = document.getElementById("inputBuscarAmigo");
const btnBuscarAmigo = document.getElementById("btnBuscarAmigo");
const resultadosBusqueda = document.getElementById("resultadosBusqueda");

// Busca usuarios y permite añadirlos como amigo.
if (btnBuscarAmigo) {
  btnBuscarAmigo.addEventListener("click", async () => {
    const textoBusqueda = inputBuscarAmigo.value.trim();
    if (!textoBusqueda) return;

    try {
      const respuesta = await fetch(`/api/users?q=${encodeURIComponent(textoBusqueda)}&current_user=${encodeURIComponent(miNombre)}`);
      const usuarios = await respuesta.json();
      resultadosBusqueda.innerHTML = "";

      if (usuarios.length === 0) {
        resultadosBusqueda.innerHTML = "<p style='font-size:12px; color:rgba(0,0,0,0.7)'>No se encontraron coincidencias.</p>";
        return;
      }

      usuarios.forEach((usuario) => {
        const fila = document.createElement("div");
        fila.className = "contact-item";
        fila.style.justifyContent = "space-between";
        fila.style.display = "flex";
        fila.style.alignItems = "center";
        fila.style.width = "100%";

        const info = document.createElement("div");
        info.style.display = "flex";
        info.style.alignItems = "center";
        info.style.gap = "10px";

        const imagen = document.createElement("img");
        imagen.src = usuario.avatar;
        imagen.style.width = "30px";
        imagen.style.height = "30px";
        imagen.style.borderRadius = "50%";

        const spanNombre = document.createElement("span");
        spanNombre.textContent = usuario.username;

        info.appendChild(imagen);
        info.appendChild(spanNombre);

        const boton = document.createElement("button");
        boton.className = "btn-primario";
        boton.style.padding = "5px 10px";
        boton.style.fontSize = "11px";
        boton.style.marginBottom = "0";
        boton.style.width = "auto";

        if (misAmigos.includes(usuario.username)) {
          boton.textContent = "Amigo";
          boton.disabled = true;
          boton.style.background = "#555";
        } else {
          boton.textContent = "Añadir";
          boton.onclick = async () => {
            const res = await fetch("/api/friend", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: miNombre, friend_username: usuario.username })
            });

            if (!res.ok) return;
            const datosActualizados = await res.json();
            misAmigos = datosActualizados.friends;

            const objUsuario = JSON.parse(localStorage.getItem("user") || "{}");
            objUsuario.friends = misAmigos;
            localStorage.setItem("user", JSON.stringify(objUsuario));

            boton.textContent = "Amigo";
            boton.disabled = true;
            boton.style.background = "#555";
            mostrarMisAmigos();
          };
        }

        fila.appendChild(info);
        fila.appendChild(boton);
        resultadosBusqueda.appendChild(fila);
      });
    } catch (e) {
      console.error(e);
    }
  });
}

// =========================
// CONTACTOS EN MAPA Y LATERAL
// =========================

// Refresca el panel lateral con contactos activos.
function actualizarContactosLateral() {
  const container = document.getElementById("contactosList");
  if (!container) return;

  const idsActivos = Object.keys(contactos);
  if (idsActivos.length === 0) {
    container.innerHTML = '<p class="no-contacts-msg">Activa compartir para ver contactos.</p>';
    return;
  }

  let html = "";
  idsActivos.forEach((id) => {
    const contacto = contactos[id];
    const color = obtenerColorContacto(id);
    const nombre = contacto.data && contacto.data.name ? contacto.data.name : "Contacto";
    const avatar = contacto.data && contacto.data.avatar ? contacto.data.avatar : "https://ui-avatars.com/api/?name=C&rounded=true&size=128";
    const textoLlegada = contacto.data && contacto.data.eta ? `<small style="color: #27ae60; font-weight: normal; margin-top: 2px;">📍 ${contacto.data.eta}</small>` : "";

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

  container.innerHTML = html;
}

// Procesa ubicación de un contacto y dibuja o actualiza su marcador.
function procesarUbicacionContacto(id, data) {
  if (!contactos[id]) contactos[id] = {};
  contactos[id].data = data;

  const color = obtenerColorContacto(id);
  const nombre = data.name || "Contacto";
  const avatar = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre.charAt(0))}&rounded=true&size=128`;

  if (!contactos[id].marker) {
    const htmlIcono = `
      <div class="contact-marker-container">
        <img src="${avatar}" style="border-color: ${color}">
        <span class="contact-marker-name" style="background-color: ${color}">${nombre}</span>
      </div>
    `;

    const iconoDiv = L.iconoDiv({
      className: "contact-avatar-marker",
      html: htmlIcono,
      iconSize: [40, 60],
      iconAnchor: [20, 30]
    });

    contactos[id].marker = L.marker([data.lat, data.lng], { icon: iconoDiv }).addTo(mapa);
    actualizarContactosLateral();
  } else {
    contactos[id].marker.setLatLng([data.lat, data.lng]);
  }
}

/* Dibuja de forma local una línea en forma de ruta basándose en todos los puntos GPS 
recibidos por el resto de usuarios cuando comparten su camino actual con nosotros. 
Elimina cualquier trazado anterior de esa persona para que no haya solapamientos visuales. */
function procesarRutaContacto(id, datosRuta) {
  // Si el contacto no existe, lo inicializamos en nuestro listado local.
  if (!contactos[id]) contactos[id] = {};

  // Obtenemos su color distintivo usando su identificador.
  const color = obtenerColorContacto(id);

  // Obtenemos su nombre para rotular ruta y destino.
  const nombre = contactos[id].data && contactos[id].data.name ? contactos[id].data.name : "Contacto";

  // Limpiamos la línea anterior de ruta de este contacto.
  if (contactos[id].polyline) {
    mapa.removeLayer(contactos[id].polyline);
  }

  // Limpiamos el marcador de destino anterior de este contacto.
  if (contactos[id].destMarker) {
    mapa.removeLayer(contactos[id].destMarker);
  }

  // Convertimos la ruta recibida a formato latitud longitud para Leaflet.
  const coordenadasLatLng = datosRuta.map((pt) => [pt.lat, pt.lng]);

  // Dibujamos la ruta de ese contacto en el mapa.
  contactos[id].polyline = L.polyline(coordenadasLatLng, {
    color,
    weight: 4,
    opacity: 0.8,
    dashArray: "10, 10"
  }).bindTooltip("Ruta de " + nombre, { sticky: true }).addTo(mapa);

  // Si hay al menos un punto colocamos marcador de destino.
  if (coordenadasLatLng.length > 0) {
    const destino = coordenadasLatLng[coordenadasLatLng.length - 1];
    const iconoDestino = L.iconoDiv({
      className: "contact-avatar-marker",
      html: `<div style="display:flex; flex-direction:column; align-items:center;">
               <div style="background:${color}; color:white; font-size:11px; font-weight:bold; padding:3px 8px; border-radius:8px; white-space:nowrap;">
                 📍 Destino de ${nombre}
               </div>
             </div>`,
      iconSize: [100, 30],
      iconAnchor: [50, 15]
    });
    contactos[id].destMarker = L.marker(destino, { icon: iconoDestino }).addTo(mapa);
  }
}

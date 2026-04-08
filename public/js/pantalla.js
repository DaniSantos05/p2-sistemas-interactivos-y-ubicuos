// =========================
// CONEXIÓN CON SOCKET.IO
// =========================

// Creamos la conexión con el servidor Socket.IO
const socket = io();

// Referencias a elementos del panel de estado
const estadoConexion = document.getElementById("estadoConexion");
const ultimoEvento = document.getElementById("ultimoEvento");
const estadoModo = document.getElementById("estadoModo");
const cajaPasos = document.getElementById("cajaPasos");


// Cuando la pantalla se conecta correctamente al servidor
socket.on("connect", () => {
    // Mostramos el estado de conexión
    estadoConexion.textContent = `Conectado. ID: ${socket.id}`;

    // Avisamos al servidor de que este cliente es la pantalla principal
    socket.emit("clientReady", { role: "pantalla" });
});




// =========================
// MÓDULO MULTIDISPOSITIVO (COMPARTIR UBICACIÓN Y AMIGOS)
// =========================

const nombreUsuarioGuardado = localStorage.getItem("username");
if (!nombreUsuarioGuardado) {
  window.location.href = "/";
}

const contactos = {};

// Usar el nombre de sesión
let miNombre = nombreUsuarioGuardado;
let miAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(miNombre.charAt(0))}&background=random&color=fff&rounded=true&size=128`;
let miETA = null;
let misAmigos = [];

try {
  const stringUsuario = localStorage.getItem("user");
  if (stringUsuario) {
     const objUsuario = JSON.parse(stringUsuario);
     miNombre = objUsuario.username;
     if (objUsuario.avatar) miAvatar = objUsuario.avatar;
     if (objUsuario.friends) misAmigos = objUsuario.friends;
  }
} catch (e) {}

function obtenerColorContacto(idStr) {
  // Genera un color consistente basado en el socket.id
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.floor(Math.abs(Math.sin(hash) * 16777215)).toString(16);
  return '#' + ('000000' + color).slice(-6);
}

// Recibir estado inicial
socket.on("existingSharedData", (data) => {
  for (const id in data) {
    if (id !== socket.id) {
       const esAmigo = data[id].location ? misAmigos.includes(data[id].location.name) : true;
       if (esAmigo) {
         if (data[id].location) procesarUbicacionContacto(id, data[id].location);
         if (data[id].route) procesarRutaContacto(id, data[id].route);
       }
    }
  }
});

socket.on("updateContactLocation", (data) => {
  if (misAmigos.includes(data.name)) {
    procesarUbicacionContacto(data.id, data);
  }
});

socket.on("updateContactRoute", (data) => {
  if (contactos[data.id]) {
    procesarRutaContacto(data.id, data.route);
  }
});




// =========================
// MI PERFIL (MODAL) Y AMIGOS
// =========================
const btnPerfil = document.getElementById("btnPerfil");
const modalPerfil = document.getElementById("modalPerfil");
const cerrarModalPerfil = document.getElementById("cerrarModalPerfil");
const nombreMiPerfil = document.getElementById("nombreMiPerfil");
const avatarMiPerfil = document.getElementById("avatarMiPerfil");
const inputArchivoAvatar = document.getElementById("inputArchivoAvatar");
const btnCambiarAvatar = document.getElementById("btnCambiarAvatar");
const listaMisAmigos = document.getElementById("listaMisAmigos");
const contadorAmigos = document.getElementById("contadorAmigos");

/* coge la matriz local de misAmigos y la muestra en forma de listado dentro del perfil. 
  Limpia la placa vieja, cuenta los amigos y va fabricando 'divs' pequeños con cada nombre. */
function mostrarMisAmigos() {
  if (!listaMisAmigos) return;
  if (misAmigos.length === 0) {
    listaMisAmigos.innerHTML = "<p style='font-size:13px; color:gray;'>Aún no tienes amigos agregados.</p>";
    if (contadorAmigos) contadorAmigos.textContent = "0";
    return;
  }
  if (contadorAmigos) contadorAmigos.textContent = misAmigos.length;
  listaMisAmigos.innerHTML = "";
  misAmigos.forEach(f => {
    const div = document.createElement("div");
    div.className = "contact-item";
    div.innerHTML = `<span style="font-size: 14px; font-weight: bold; color: #333;">${f}</span>`;
    listaMisAmigos.appendChild(dternamente,iv);
  });
}

/* Este fragmento es el encargado de gestionar la apertura y cierre del modal flotante de perfil del usuario.
  Esta oculto por defecto, y se activa al pulsar sobre la foto de perfil en la barra superior.
  - Cuando hacemos clic en nuestra foto de perfil de arriba a la derecha, forzamos la aparición del cuadro,
  sincronizamos los datos visuales y lanzamos la función para pintar la lista de amigos.
  - También controla el mecanismo de cierre visual, ya sea pulsando la cruz superior o haciendo clic 
  fuera del propio modal en el velo ennegrecido. */
if (btnPerfil) {
  btnPerfil.addEventListener("click", () => {
    modalPerfil.style.display = "block";
    nombreMiPerfil.textContent = miNombre;
    avatarMiPerfil.src = miAvatar;
    mostrarMisAmigos();
  });
}

if (cerrarModalPerfil) {
  cerrarModalPerfil.addEventListener("click", () => {
    modalPerfil.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target == modalPerfil) {
    modalPerfil.style.display = "none";
  }
});

/* Se encarga de subir y procesar una nueva foto de perfil cuando decides cambiarla.
  - Recoge el archivo subido desde tu carpeta mediante un input y lo procesamos mediante FormData.
  - Envía este paquete a nuestra red.
  - Con ella, actualizamos sin pestañear nuestro objeto local de sesión, el almacenamiento permanente y forzamos
  al servidor Socket.io para que actualice a todos tus amigos la nueva foto */
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
      if (respuesta.ok) {
        const datos = await respuesta.json();
        miAvatar = data.avatar;
        avatarMiPerfil.src = miAvatar;
        inputArchivoAvatar.value = "";
        
        // Actualizar avatares en la UI flotante y el menú
        const btnAvatar = document.getElementById("btnAvatarIcon");
        const fsmAv = document.getElementById("avatarMenu");
        if (btnAvatar) btnAvatar.src = miAvatar;
        if (fsmAv) fsmAv.src = miAvatar;
        
        const objUsuario = JSON.parse(localStorage.getItem("user") || "{}");
        objUsuario.avatar = miAvatar;
        localStorage.setItem("user", JSON.stringify(objUsuario));
        
        if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
          socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
        }
      }
    } catch (e) {
      console.error(e);
    }
  });
}

const inputBuscarAmigo = document.getElementById("inputBuscarAmigo");
const btnBuscarAmigo = document.getElementById("btnBuscarAmigo");
const resultadosBusqueda = document.getElementById("resultadosBusqueda");

/* Es el motor de busqueda de amigos. Extra la frase que pongamos elimando espacios en blaco usando trim y pregunta 
a la api por ese usario. Tras esto muestra las coincidencias en forma de trajeta en la caja de reultados. 
Asimismo, comprueba si esa perosona ya estaba agreada, en caso no la vamos a poder agregar */
if (btnBuscarAmigo) {
  btnBuscarAmigo.addEventListener("click", async () => {
    // Obtenemos el texto introducido eliminando espacios extra a los lados
    const busqueda = inputBuscarAmigo.value.trim();
    
    // Si esta vacio no hacemos nada
    if (!q) return;
    
    try {
      // Hacemos la peticion a la api pasandole nuestra busqueda y nuestro usuario actual
      const respuesta = await fetch(`/api/users?q=${encodeURIComponent(q)}&current_user=${encodeURIComponent(miNombre)}`);
      
      // Pasamos la res devuelta a JSON
      const datos = await respuesta.json();
      
      // Limpiamos los resultados antiguos de la caja
      resultadosBusqueda.innerHTML = "";
      
      // Si no hay resultados mostramos un mensaje por pantalla
      if (data.length === 0) {
        resultadosBusqueda.innerHTML = "<p style='font-size:12px; color:rgba(0,0,0,0.7)'>No se encontraron coincidencias.</p>";
        return;
      }
      
      // Iteramos sobre todos los usuarios que nos ha devuelto la api
      data.forEach(u => {
        // Creamos el contenedor global del contacto respuestaectivo
        const div = document.createElement("div");
        div.className = "contact-item";
        div.style.justifyContent = "space-between";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.width = "100%";
        
        // Creamos el contenedor que agrupa la imagen de perfil y su nombre
        const divInfo = document.createElement("div");
        divInfo.style.display = "flex";
        divInfo.style.alignItems = "center";
        divInfo.style.gap = "10px";
        
        // Creamos la imagen de perfil del usuario encontrado
        const imagen = document.createElement("img");
        imagen.src = u.avatar;
        imagen.style.width = "30px";
        imagen.style.height = "30px";
        imagen.style.borderRadius = "50%";
        
        // Creamos el texto de su nombre de usuario
        const spanNombre = document.createElement("span");
        spanNombre.textContent = u.username;
        
        // Añadimos estas piezas al contenedor local que hicimos
        divInfo.appendChild(img);
        divInfo.appendChild(spanNombre);
        
        // Creamos nuestro boton de añadir o de estado "amigo"
        const btnAñadir = document.createElement("button");
        btnAñadir.className = "btn-primario";
        btnAñadir.style.padding = "5px 10px";
        btnAñadir.style.fontSize = "11px";
        btnAñadir.style.marginBottom = "0";
        btnAñadir.style.width = "auto";
        
        // Comprobamos si este usuario ya figura en nuestra lista de amigos existente
        if (misAmigos.includes(u.username)) {
           // Si ya es amigo nuestro desactivamos las acciones del boton limitandolo a enseñarnos esto mismo
           btnAñadir.textContent = "Amigo";
           btnAñadir.disabled = true;
           btnAñadir.style.background = "#555";
        } else {
           // En caso de que no este como amigo todavia, le configuramos un evento de on click
           btnAñadir.textContent = "Añadir";
           btnAñadir.onclick = async () => {
             // Enviamos de vuelta una peticion de amistad a traves de la api
             const res = await fetch("/api/friend", {
               method: "POST",
               headers: {"Content-Type": "application/json"},
               body: JSON.stringify({username: miNombre, friend_username: u.username})
             });
             
             // Si el servidor confirma todo procedemos a actualizar el equipo en local
             if (res.ok) {
                // Volcamos su res para guardar todos nuestros amigos resultantes
                const datosActualizados = await res.json();
                
                // Actualizamos la variable de la lista de todos nuestros amigos localmente
                misAmigos = datosActualizados.friends;
                
                // Extraemos en objeto json nuestro usuario actual del navegador
                const objUsuario = JSON.parse(localStorage.getItem("user") || "{}");
                
                // Le grabamos este array nuevo y lo rescribimos en el localstorage del perifl
                objUsuario.friends = misAmigos;
                localStorage.setItem("user", JSON.stringify(objUsuario));
                
                // Actualizamos tambien la interfaz de nuestro boton con las modificaciones pertinentes
                btnAñadir.textContent = "Amigo";
                btnAñadir.disabled = true;
                btnAñadir.style.background = "#555";
                
                // Lanzamos la funcion para que actualice visualmente nuestra lista de amigos general visible
                mostrarMisAmigos();
             }
           };
        }
        
        // Agrupamos el contenedor del nombre imagen y este ultimo boton en el div global principal
        div.appendChild(divInfo);
        div.appendChild(btnAñadir);
        
        // Lo añadimos por ultima a nuestra interfaz general para que se acabe de enseñar y hacer en pantalla
        resultadosBusqueda.appendChild(div);
      });
    } catch (e) {
      console.error(e);
    }
  });
}

/* Actualiza el panel lateral mostrando los amigos que están compartiendo su ubicación. 
Extrae los ids actuales, genera el HTML para la información de cada usuario y lo inyecta en el panel lateral. */
function actualizarContactosLateral() {
  // Obtenemos el contenedor visual donde va la lista
  const container = document.getElementById("contactosList");
  if (!container) return;
  
  // Extraemos todos los ids de los contactos activos en este momento
  const idsActivos = Object.keys(contactos);
  
  // Si no hay contactos, mostramos un mensaje por defecto y salimos de la función
  if (idsActivos.length === 0) {
    container.innerHTML = '<p class="no-contacts-msg">Activa compartir para ver contactos.</p>';
    return;
  }
  
  // Preparamos la variable donde iremos acumulando el HTML de todos los contactos
  let html = "";
  
  // Iteramos sobre todos los id de los usuarios detectados
  idsActivos.forEach(id => {
    const contacto = contactos[id];
    // Generamos un color para el borde de la imagen basado en su id
    const color = obtenerColorContacto(id);
    
    // Obtenemos su nombre, o le asignamos "Contacto" si no lo tiene
    const nombre = c.data && c.data.name ? c.data.name : `Contacto`;
    
    // Obtenemos su avatar, o le generamos uno genérico si no lo tiene
    const avatar = c.data && c.data.avatar ? c.data.avatar : `https://ui-avatars.com/api/?name=C&rounded=true&size=128`;
    
    // Si el contacto tiene tiempo de llegada (ETA), creamos el HTML para mostrarlo
    const textoLlegada = c.data && c.data.eta ? `<small style="color: #27ae60; font-weight: normal; margin-top: 2px;">📍 ${c.data.eta}</small>` : '';
    
    // Añadimos el HTML del componente del contacto al bloque de texto
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
  
  // Reemplazamos el contenido antiguo del panel con el fragmento HTML nuevo
  container.innerHTML = html;
}

/* Cuando el servidor detecta que alguien deja de compartir su ubicación, lanza este evento. 
Se encarga de limpiar el mapa borrando todos los trazos de su ruta, su marcador y por último
actualiza la lista lateral para que no se muestre en los compañeros. */
socket.on("removeContact", (data) => {
  // Comprobamos si el contacto sigue registrado en nuestro array de contactos
  if (contactos[data.id]) {
    // Si tiene un marcador activo, lo borramos del mapa general
    if (contactos[data.id].marker) mapa.removeLayer(contactos[data.id].marker);
    
    // Si estaba dibujando una ruta, borramos la línea visible en el mapa
    if (contactos[data.id].polyline) mapa.removeLayer(contactos[data.id].polyline);
    
    // Si la ruta tenía un marcador de destino, también lo borramos del mapa
    if (contactos[data.id].destMarker) mapa.removeLayer(contactos[data.id].destMarker);
    
    // Lo eliminamos por completo del listado local de seguimiento
    delete contactos[data.id];
    
    // Volvemos a lanzar la actualización del panel visual para que desaparezca
    actualizarContactosLateral();
  }
});

/* Procesa los datos de ubicación del resto de usuarios en tiempo real. 
Recibe la información, asigna el usuario a la lista de contactos, le designa un color y marcador y
decide si crearlo de cero en el mapa o simplemente actualizar su nueva posición. */
function procesarUbicacionContacto(id, data) {
  // Si el contacto no existe, lo inicializamos en la lista de contactos
  if (!contactos[id]) contactos[id] = {};
  
  // Actualizamos toda la información recibida en su perfil de datos
  contactos[id].data = data;
  
  // Obtenemos su color personalizado usando su id
  const color = obtenerColorContacto(id);
  
  // Sacamos su nombre, poniendo un valor por defecto si no venía en los datos
  const nombre = data.name || "Contacto";
  
  // Comprobamos si nos manda avatar, en caso negativo generamos una imagen inicial
  const avatar = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre.charAt(0))}&rounded=true&size=128`;

  // Comprueba si este contacto no tiene todavía una marca creada dentro del mapa de Leaflet
  if (!contactos[id].marker) {
    // Definimos la estructura HTML del contenedor de su avatar en el mapa
    const htmlIcono = `
      <div class="contact-marker-container">
        <img src="${avatar}" style="border-color: ${color}">
        <span class="contact-marker-name" style="background-color: ${color}">${nombre}</span>
      </div>
    `;
    
    // Lo convertimos en formato DivIcon que la API Leaflet sabe procesar
    const iconoDiv = L.iconoDiv({
      className: 'contact-avatar-marker',
      html: htmlIcono,
      iconSize: [40, 60],
      iconAnchor: [20, 30]
    });

    // Inyectamos el marcador en el mapa usando sus coordenadas de latitud y longitud
    contactos[id].marker = L.marker([data.lat, data.lng], { icon: iconoDiv }).addTo(mapa);
    
    // Actualizamos el listado derecho para añadir visualmente su presencia en pantalla
    actualizarContactosLateral();
  } else {
    // Como su marcador ya estaba en el mapa, simplemente actualizamos sus coordenadas actuales
    contactos[id].marker.setLatLng([data.lat, data.lng]);
  }
}

/* Dibuja de forma local una línea en forma de ruta basándose en todos los puntos GPS 
recibidos por el resto de usuarios cuando comparten su camino actual con nosotros. 
Elimina cualquier trazado anterior de esa persona para que no haya solapamientos visuales. */
function procesarRutaContacto(id, datosRuta) {
  // Si el contacto no existe, lo inicializamos en nuestro listado local
  if (!contactos[id]) contactos[id] = {};
  
  // Obtenemos su color distintivo usando el hash numérico de su identificador
  const color = obtenerColorContacto(id);
  
  // Conseguimos o preponemos un nombre que va a usarse al mostrar el cartel destino
  const nombre = (contactos[id].data && contactos[id].data.name) ? contactos[id].data.name : "Contacto";
  
  // Limpiamos la antigua capa principal orientativa de la ruta que hubiera dibujada en el mapa
  if (contactos[id].polyline) {
    mapa.removeLayer(contactos[id].polyline);
  }
  
  // Y limpiamos también el antiguo punto visual del destino por si la ruta cambió
  if (contactos[id].destMarker) {
    mapa.removeLayer(contactos[id].destMarker);
  }

  // Preparamos en pares la latitud y longitud a través de este trazado recibido general de coordenadas
  const coordenadasLatLng = datosRuta.map(pt => [pt.lat, pt.lng]);
  
  // Dibujamos toda la línea a lo largo de esa constelación de puntos en nuestra vista Leaflet
  contactos[id].polyline = L.polyline(coordenadasLatLng, {
    color: color,
    weight: 4,
    opacity: 0.8,
    dashArray: '10, 10'
  }).bindTooltip("Ruta de " + nombre, { sticky: true }).addTo(mapa);

  // Consideramos seguro iterar si dicha ruta posee como mínimo un punto general de comienzo-final
  if (coordenadasLatLng.length > 0) {
    // Obtenemos el registro del último de sus puntos recibidos como su final verdadero del viaje
    const destino = coordenadasLatLng[coordenadasLatLng.length - 1];
    
    // Creamos una nueva etiqueta gráfica Leaflet como meta, que le informa su nombre visual al usuario local
    const iconoDestino = L.iconoDiv({
      className: 'contact-avatar-marker',
      html: `<div style="display:flex; flex-direction:column; align-items:center;">
               <div style="background:${color}; color:white; font-size:11px; font-weight:bold; padding:3px 8px; border-radius:8px; white-space:nowrap;">
                 📍 Destino de ${nombre}
               </div>
             </div>`,
      iconSize: [100, 30],
      iconAnchor: [50, 15]
    });
    
    // Lo fijamos y plasmamos su marca en nuestra propia sesión 
    contactos[id].destMarker = L.marker(destino, { icon: iconoDestino }).addTo(mapa);
  }
}




// =========================
// ELEMENTOS DEL DOM
// =========================

// Elementos de AR
const btnAR = document.getElementById("btnAR");                 // Botón de activar/desactivar AR
const contenedorAR = document.getElementById("contenedorAR");     // Contenedor de AR
const videoAR = document.getElementById("videoAR");             // Video de la cámara
const canvasAR = document.getElementById("canvasAR");           // Canvas para dibujar sobre el video

const inputDestino = document.getElementById("inputDestino");   // Campo de texto del destino
const btnRuta = document.getElementById("btnRuta");             // Botón de calcular ruta
const modoClic = document.getElementById("modoClic");         // Checkbox para elegir destino haciendo clic
const modoCompartirUbicacion = document.getElementById("modoCompartirUbicacion"); // Checkbox para compartir ubicación
const modoContadorPasos = document.getElementById("modoContadorPasos");
const resumenContadorRuta = document.getElementById("resumenContadorRuta");
const actividadTotales = document.getElementById("actividadTotales");
const actividadHistorial = document.getElementById("actividadHistorial");
const botonesFiltroActividad = document.querySelectorAll(".btn-filtro-actividad");
const estadoRuta = document.getElementById("estadoRuta");       // Texto del estado de la ruta

// Elementos del DOM del menú de pantalla completa
const menuOpciones = document.getElementById("menuOpciones");     // Menú de pantalla completa
const btnMenuToggle = document.getElementById("btnMenuToggle");       // Botón avatar para abrir menú
const cerrarMenuOpciones = document.getElementById("cerrarMenuOpciones");   // Botón de cerrar menú
const avatarMenu = document.getElementById("avatarMenu");               // Avatar grande del menú
const nombreMenu = document.getElementById("nombreMenu");                   // Nombre en el menú
const btnAvatarIcon = document.getElementById("btnAvatarIcon");       // Avatar pequeño en la barra flotante

// Actualizar el avatar del botón flotante con el del usuario
if (btnAvatarIcon) {
  btnAvatarIcon.src = miAvatar;
}

/* Este evento reacciona cada vez que el usuario activa o desactiva el 
  interruptor de Multidispositivo.
  Hay que considerar dos frentes:
  - Visual: Cambia el estilo y el texto del botón inferior de Compartir 
  para dar un feedback visual claro en la pantalla de que estamos transmitiendo nuestra ubicación.
  - Conexión: Al activarse, avisa inmediatamente a nuestro servidor emitiendo 
  nuestra latitud, longitud, nombre y estado horario para que el resto de integrantes
  de la sala puedan vernos. Si también estamos en medio de una ruta, emite
  los puntos directos de esa ruta para que nuestros amigos vean exáctamente la línea que 
  vamos a seguir. Viceversa, al desactivarse, solicita al servidor que nos borre furtivamente 
  del mapa de los demás*/
modoCompartirUbicacion.addEventListener("change", () => {
  const btnCompartir = document.getElementById("compartirTarjetaRuta");
  if (btnCompartir) {
    if (modoCompartirUbicacion.checked) {
      btnCompartir.classList.add("active");
      btnCompartir.innerHTML = '<span class="material-symbols-outlined">share</span> Compartiendo';
    } else {
      btnCompartir.classList.remove("active");
      btnCompartir.innerHTML = '<span class="material-symbols-outlined">share</span> Compartir';
    }
  }

  if (modoCompartirUbicacion.checked) {
    if (miLatitud !== null && miLongitud !== null) {
      socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
    }
    if (coordenadasRuta.length > 0) {
      socket.emit("shareRoute", coordenadasRuta);
    }
  } else {
    socket.emit("stopSharing");
  }
});

if (modoClic) {
  modoClic.addEventListener("change", () => {
    if (modoClic.checked) {
      estadoRuta.textContent = "Modo clic activado. Toca el mapa para seleccionar el destino.";
      return;
    }
    estadoRuta.textContent = "Modo clic desactivado. Puedes escribir destino en el buscador.";
  });
}

/* Es el encargado de abrir el menú principal de usuario y opciones 
  al pulsar sobre el su foto en la barra superior de la pantalla.
  Para entender cómo funciona internamente, hay que tener en cuenta que el menú
  es en una pantalla completa que inicialmente está oculta mediante la 
  clase de CSS oculto. Cada vez que el redondel es pulsado:
  - Reseteamos y sincronizamos forzosamente toda la información del menú superior 
  - Eliminamos la clase oculto para que la capa transparente y 
  nuestro reluciente panel de configuración deslicen y se apropien de la pantalla. */
btnMenuToggle.addEventListener("click", () => {
  avatarMenu.src = miAvatar;
  nombreMenu.textContent = miNombre;
  btnAvatarIcon.src = miAvatar;
  menuOpciones.classList.remove("oculto");
  cargarActividad(periodoActividadActual);
});

// Cerrar menú de pantalla completa
cerrarMenuOpciones.addEventListener("click", () => {
  menuOpciones.classList.add("oculto");
});




// =========================
// TARJETA INFERIOR DE RUTA
// =========================

const tarjetaRuta = document.getElementById("tarjetaRuta");
const tiempoTarjetaRuta = document.getElementById("tiempoTarjetaRuta");
const distanciaTarjetaRuta = document.getElementById("distanciaTarjetaRuta");
const pasoTarjetaRuta = document.getElementById("pasoTarjetaRuta");
const cerrarTarjetaRuta = document.getElementById("cerrarTarjetaRuta");
const compartirTarjetaRuta = document.getElementById("compartirTarjetaRuta");
const btnARTarjetaRuta = document.getElementById("btnARTarjetaRuta");
const irTarjetaRuta = document.getElementById("irTarjetaRuta");
function mostrarTarjetaRuta(distanciaKm, tiempoFormateado) {
  tiempoTarjetaRuta.textContent = tiempoFormateado;
  distanciaTarjetaRuta.textContent = `${distanciaKm} km`;
  pasoTarjetaRuta.textContent = "Ruta lista. Pulsa Ir para empezar la navegación.";

  if (modoCompartirUbicacion.checked) {
    compartirTarjetaRuta.classList.add("active");
    compartirTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">share</span> Compartiendo';
  } else {
    compartirTarjetaRuta.classList.remove("active");
    compartirTarjetaRuta.innerHTML = '<span class="material-symbols-outlined">share</span> Compartir';
  }

  tarjetaRuta.classList.remove("oculto");
  document.body.classList.add("tarjeta-ruta-visible");
}

function ocultarTarjetaRuta() {
  tarjetaRuta.classList.add("oculto");
  document.body.classList.remove("tarjeta-ruta-visible");
  compartirTarjetaRuta.classList.remove("active");
}

// Cerrar tarjeta de ruta → elimina la ruta
cerrarTarjetaRuta.addEventListener("click", () => {
  eliminarRuta();
});

// Compartir desde la tarjeta
compartirTarjetaRuta.addEventListener("click", () => {
    modoCompartirUbicacion.checked = !modoCompartirUbicacion.checked;
    modoCompartirUbicacion.dispatchEvent(new Event("change"));
});

// AR desde la tarjeta
btnARTarjetaRuta.addEventListener("click", () => {
  if (typeof toggleAR === "function") {
    toggleAR();
  }
});

/* Este fragmento de código es el encargado de que, cuando un usuario decide que la ruta   
  recién calculada del punto A al punto B es la correcta.
  - Al pulsar el botón verde abajo , listener cerificará si la variable de las instrucciones está vacía. 
  Si no hay, ignora sin más para no crear fallos.
  - Si, por el contrario, sí encuentra un camino mejor, reinicia su progreso 
  reiniciando a 0 el índice */
irTarjetaRuta.addEventListener("click", () => {
  if (!instruccionesRuta.length) return;
  indicePasoActual = 0;
  if (modoContadorPasos && modoContadorPasos.checked) {
    iniciarSesionContadorRuta();
  }
  mostrarPasoActual();
  actualizarPasoTarjetaRuta();
});

// Sincronizar el step en la tarjeta inferior
function actualizarPasoTarjetaRuta() {
  if (!instruccionesRuta.length || indicePasoActual < 0) return;
  const instruccion = instruccionesRuta[indicePasoActual];
  pasoTarjetaRuta.innerHTML = `<strong>Paso ${indicePasoActual + 1}/${instruccionesRuta.length}</strong>: ${instruccion.text || ""} (~${Math.round(instruccion.distance || 0)} m)`;
}




// =========================
// MAPA
// =========================

// Definición de las capas base (Temas)
// Capa base clara
const capaClara = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
);

// Capa base oscura
const capaOscura = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }
);

// Capa base satélite
const capaSatelite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' }
);

// Agrupamos las opciones en un objeto para el selector de Leaflet
const temas = {
  "Modo Claro": capaClara,
  "Modo Oscuro": capaOscura,
  "Satélite": capaSatelite
};

// Inicializamos el mapa y fijamos el Tema Claro por defecto
const mapa = L.map("mapa", {
  center: [40.4168, -3.7038],
  zoom: 15,
  layers: [capaClara],
  zoomControl: false
});






// =========================
// VARIABLES DE ESTADO
// =========================

// Coordenadas actuales del usuario
let miLatitud = null;
let miLongitud = null;

let marcadorUsuario = null;   // Marcador del usuario
let controlRuta = null;       // Control de la ruta actual
let marcadorDestino = null;   // Marcador del destino elegido al hacer clic

let destinoClickLat = null;   // Coordenadas de la latitud del destino seleccionado con clic
let destinoClickLon = null;   // Coordenadas de la longitud del destino seleccionado con clic

let instruccionesRuta = [];   // Ruta e instrucciones actuales
let coordenadasRuta = [];     // Coordenadas de la ruta actual
let indicePasoActual = -1;    // Índice del paso actual
let marcadorPasoActual = null; // Marcador visual (punto azul) del paso actual
let periodoActividadActual = "day";

let sesionPasosActiva = false;
let sesionPasosGuardada = false;
let pasosSesionActual = 0;
let caloriasSesionActual = 0;
let distanciaSesionMetros = 0;
let posicionAnteriorSesion = null;
let inicioSesionISO = null;
let destinoSesionNombre = "";




// =========================
// AUTOAVANCE DE PASOS
// =========================

const DISTANCIA_CAMBIO_PASO = 18;      // Metros para pasar al siguiente paso
const DISTANCIA_LLEGADA_DESTINO = 12;  // Metros para considerar que hemos llegado
const RETARDO_CAMBIO_PASO_MS = 2500;   // Evita saltos demasiado seguidos

let ultimoCambioAutomatico = 0;
let rutaTerminada = false;




// =========================
// AJUSTES DE AR
// =========================

let rumboObjetivoSuavizado = null;
let anguloFlechaRenderizado = null;

let modoActual = "2D";


// =========================
// GPS DEL USUARIO
// =========================

// Comprueba si el navegador soporta geolocalización
if ("geolocation" in navigator) {
  // Empezamos a vigilar la posición del usuario
  navigator.geolocation.watchPosition(
    (pos) => {
      // Actualizamos las coordenadas actuales
      miLatitud = pos.coords.latitude;
      miLongitud = pos.coords.longitude;

      // Si no existe el marcador del usuario, lo creamos
      if (!marcadorUsuario) {
        mapa.setView([miLatitud, miLongitud], 16);

        // Creamos el marcador del usuario
        marcadorUsuario = L.marker([miLatitud, miLongitud])
          .addTo(mapa)              // Lo añadimos al mapa
          .bindPopup("Estás aquí")  // Le ponemos un popup
          .openPopup();             // Lo abrimos

        estadoRuta.textContent = "Ubicación obtenida. Ya puedes buscar una ruta.";
      } else {
        // Actualizamos la posición del marcador
        marcadorUsuario.setLatLng([miLatitud, miLongitud]);
      }

      // Compartir ubicación si está activado
      if (modoCompartirUbicacion.checked) {
        socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
      }

      actualizarContadorRutaConGPS();

      // Actualizamos el paso automático
      actualizarPasoAutomatico();
    },
    (err) => {
      // Si hay un error, mostramos un mensaje
      estadoRuta.textContent =
        "No se pudo obtener el GPS. Permite el acceso a la ubicación.";
      console.error("Error GPS:", err);
    },
    {
      // Estas opciones son para mejorar la precisión del GPS
      enableHighAccuracy: true,  // Alta precisión
      maximumAge: 0,             // Sin caché
      timeout: 10000             // 10 segundos de timeout
    }
  );
// Si el navegador no soporta geolocalización
} else {
  estadoRuta.textContent = "Tu navegador no soporta geolocalización.";
}




// =========================
// SELECCIÓN DE DESTINO CON CLIC
// =========================

// Evento que se ejecuta cuando se hace clic en el mapa
mapa.on("click", (e) => {
  // Si no está activado el modo de clic, no hacemos nada
  if (!modoClic.checked) return;

  // Guardamos las coordenadas del clic
  destinoClickLat = e.latlng.lat;
  destinoClickLon = e.latlng.lng;

  // Si existe el marcador de destino, lo actualizamos
  if (marcadorDestino) {
    marcadorDestino.setLatLng(e.latlng);
  } else {
    // Si no existe, lo creamos
    marcadorDestino = L.marker(e.latlng, {
      icon: L.icon({
        // Los marcadores los sacamos de internet
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],   // Tamaño del icono
        iconAnchor: [12, 41]  // Punto de anclaje del icono
      })
    }).addTo(mapa);
  }

  // Mostramos el popup con las coordenadas del destino
  marcadorDestino
    .bindPopup(
      `Destino: ${destinoClickLat.toFixed(5)}, ${destinoClickLon.toFixed(5)}`
    )
    .openPopup();

  // Actualizamos el estado de la ruta
  estadoRuta.textContent =
    "Destino seleccionado en el mapa. Pulsa 'Buscar y calcular ruta'.";
});




// =========================
// FUNCIONES AUXILIARES (navegación y controles)
// =========================

// Función para limpiar la ruta
function limpiarRuta() {
  // Si existe el control de ruta, lo eliminamos
  if (controlRuta) {
    mapa.removeControl(controlRuta);
    controlRuta = null;
  }

  // Si existe el modo AR, lo desactivamos
  if (typeof toggleAR === "function" && typeof isARMode !== "undefined" && isARMode) {
    toggleAR();
  }

  // Si existe el botón AR, lo ocultamos
  if (btnAR) {
    btnAR.classList.add("oculto");
  }

  // Ocultamos la tarjeta de ruta
  ocultarTarjetaRuta();

  // Si existe el marcador del paso actual, lo eliminamos
  if (marcadorPasoActual) {
    mapa.removeLayer(marcadorPasoActual);
    marcadorPasoActual = null;
  }

  // Reseteamos las variables de la ruta
  instruccionesRuta = [];       // Array de instrucciones
  coordenadasRuta = [];         // Array de coordenadas
  indicePasoActual = -1;        // Índice del paso actual
  ultimoCambioAutomatico = 0;   // Momento del último cambio automático
  rutaTerminada = false;        // Estado de la ruta

  rumboObjetivoSuavizado = null;  // Rumbo objetivo suavizado
  anguloFlechaRenderizado = null; // Ángulo de la flecha renderizado
  sesionPasosActiva = false;
  sesionPasosGuardada = false;
  posicionAnteriorSesion = null;
  inicioSesionISO = null;
  destinoSesionNombre = "";
  if (modoContadorPasos && modoContadorPasos.checked) {
    actualizarResumenContadorRuta();
  }

  // Actualizamos el estado de la ruta
  cajaPasos.textContent = "No hay una ruta activa.";
  miETA = null;
  // Si estamos compartiendo posición, actualizamos que ya no tenemos ETA
  if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
    socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
  }
}

// Función para calcular la distancia en metros entre dos puntos usando la fórmula de Haversine
function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const aRadianes = (grados) => (grados * Math.PI) / 180;  // Convierte grados a radianes

  const dLat = aRadianes(lat2 - lat1);    // Diferencia de latitud en radianes
  const dLon = aRadianes(lon2 - lon1);    // Diferencia de longitud en radianes

  // Fórmula de Haversine
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  // Distancia en metros
  const contacto = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * contacto;    // Devuelve el producto del radio de la Tierra y el ángulo central en radianes
}

function actualizarResumenContadorRuta() {
  if (!resumenContadorRuta) return;
  resumenContadorRuta.textContent = `Pasos: ${pasosSesionActual} · Calorías: ${caloriasSesionActual} kcal`;
}

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

function obtenerEtiquetaPeriodo(tipo, clave) {
  if (tipo === "day") return clave;
  if (tipo === "week") return `Semana ${clave}`;
  return clave;
}

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

/* Función que devuelve el punto GPS asociado a una instrucción concreta.
Sirve para traducir una instrucción de texto en un punto exacto del mapa donde
debe ocurrir la maniobra*/
function obtenerPuntoDeInstruccion(indiceInstruccion) {
  // Si el índice está fuera de rango, devolvemos null
  if (indiceInstruccion < 0 || indiceInstruccion >= instruccionesRuta.length) {
    return null;
  }

  // Obtenemos la instrucción
  const instruccion = instruccionesRuta[indiceInstruccion];

  // Si la instrucción no es válida, devolvemos null
  if (!instruccion || typeof instruccion.index !== "number" || !coordenadasRuta[instruccion.index]) {
    return null;
  }

  // Devolvemos el punto GPS asociado a la instrucción
  return coordenadasRuta[instruccion.index];
}

// Función que cambia automáticamente al siguiente paso cuando te acercas al punto de maniobra
function actualizarPasoAutomatico() {
  // Si la ruta ha terminado o no hay datos, no hacemos nada
  if (rutaTerminada || miLatitud === null || miLongitud === null || !instruccionesRuta.length || !coordenadasRuta.length || indicePasoActual < 0) {
    return;
  }

  // Obtenemos el tiempo actual
  const ahora = Date.now();

  // Esto es para que la instrucción no cambie cada milisegundo y evitar parpadeos por culpa del GPS
  if (ahora - ultimoCambioAutomatico < RETARDO_CAMBIO_PASO_MS) {
    return;
  }

  // Obtenemos el punto final de la ruta
  const puntoFinal = coordenadasRuta[coordenadasRuta.length - 1];

  // Si el punto final existe, calculamos la distancia al destino con la función distanciaEnMetros
  if (puntoFinal) {
    const distanciaFinal = distanciaEnMetros(miLatitud, miLongitud, puntoFinal.lat, puntoFinal.lng);

    // Si estamos cerca del destino, terminamos la ruta
    if (distanciaFinal <= DISTANCIA_LLEGADA_DESTINO) {
      rutaTerminada = true;
      indicePasoActual = instruccionesRuta.length - 1;    // Actualizamos el índice del paso actual
      estadoRuta.textContent = "Has llegado al destino.";
      cajaPasos.textContent = "Has llegado al destino.";
      if (sesionPasosActiva && modoContadorPasos && modoContadorPasos.checked) {
        guardarActividadRuta();
        sesionPasosActiva = false;
      }
      ultimoCambioAutomatico = ahora;                     // Actualizamos el tiempo del último cambio automático
      return;
    }
  }

  let haAvanzado = false;                                // Variable para indicar si hemos avanzado al siguiente paso

  // Mientras no hayamos llegado al final de la ruta
  while (indicePasoActual < instruccionesRuta.length - 1) {
    // Obtenemos el siguiente índice y el punto siguiente
    const siguienteIndice = indicePasoActual + 1;
    const puntoSiguiente = obtenerPuntoDeInstruccion(siguienteIndice);

    // Si el punto siguiente no existe, salimos del bucle
    if (!puntoSiguiente) break;

    // Calculamos la distancia al siguiente punto
    const distanciaSiguiente = distanciaEnMetros(miLatitud, miLongitud, puntoSiguiente.lat, puntoSiguiente.lng);

    // Si estamos cerca del siguiente punto, avanzamos al siguiente paso
    if (distanciaSiguiente <= DISTANCIA_CAMBIO_PASO) {
      indicePasoActual = siguienteIndice;  // Actualizamos el índice del paso actual
      haAvanzado = true;                   // Indicamos que hemos avanzado al siguiente paso
      ultimoCambioAutomatico = ahora;      // Actualizamos el tiempo del último cambio automático
      // Si hemos avanzado, salimos del bucle
    } else {
      break;                               // Si no estamos cerca del siguiente punto, salimos del bucle
    }
  }

  // Si hemos avanzado, mostramos el paso actual
  if (haAvanzado) {
    mostrarPasoActual();
    estadoRuta.textContent = "Paso actualizado automáticamente.";
  }
}

// Función que muestra el paso actual
function mostrarPasoActual() {
  // Si no hay instrucciones, mostramos un mensaje
  if (!instruccionesRuta.length) {
    cajaPasos.textContent = "No hay instrucciones disponibles para esta ruta.";
    return;
  }
  /* Esto de los indices se usa para que si por ejemplo estamos en el paso 2 
  y le damos a anterior, no se vaya al paso -1, sino que se quede en el 1*/

  // Si el índice se ha salido por abajo, lo ajustamos
  if (indicePasoActual < 0) {
    indicePasoActual = 0;
  }
  // Si el índice se ha salido por arriba, lo ajustamos
  if (indicePasoActual >= instruccionesRuta.length) {
    indicePasoActual = instruccionesRuta.length - 1;
  }

  // Cogemos la instrucción actual
  const instruccion = instruccionesRuta[indicePasoActual];

  // Mostramos el paso actual
  const textoPaso =
    `Paso ${indicePasoActual + 1} de ${instruccionesRuta.length}:<br><br>` +
    `<strong>${instruccion.text || "Sin texto disponible"}</strong><br><br>` +
    `Distancia aproximada: ${Math.round((instruccion.distance || 0))} m`;

  // Usamos innerHTML para que se interpreten los saltos de línea
  cajaPasos.innerHTML = textoPaso;

  /* Se encarga de que la cámara del mapa se deslice automáticamente hacia
  el lugar donde ocurre la instrucción. El trazador de rutas nos devuelve dos listas separadas:
  - instruccionesRuta: El listado de maniobras en texto (Gira a la derecha, Sigue recto 200m, etc.)
  - coordenadasRuta: Un listado gigante de coordenadas GPS de toda la línea azul dibujada en el mapa, punto por punto.
  Cada vez que da una instrucción, suele venir con una propiedad lamada index que nos indica en qué punto de la lista de coordenadas 
  se encuentra esa instrucción.*/

    /* Este 'if' realiza 2 comprobaciones de seguridad:
     - Verifica que la propiedad 'index' traiga un número asociado a la instrucción
     - Verifica que exista un punto en la lista de coordenadas con ese índice
     */
  if (
    typeof instruccion.index === "number" &&
    coordenadasRuta[instruccion.index]
  ) {
    // Si ambas comprobaciones son correctas, cogemos ese punto
    const punto = coordenadasRuta[instruccion.index];
    // En AR priorizamos el centro en la posición real del usuario para evitar descentrados.
    if (typeof isARMode !== "undefined" && isARMode && miLatitud !== null && miLongitud !== null) {
      mapa.panTo([miLatitud, miLongitud]);
    } else {
      // En modo normal centramos la instrucción actual.
      mapa.panTo([punto.lat, punto.lng]);
    }
    // Ponemos un puntito rojo para que se vea donde está la instrucción
    if (marcadorPasoActual) {
        marcadorPasoActual.setLatLng([punto.lat, punto.lng]);
    } else {
        marcadorPasoActual = L.circleMarker([punto.lat, punto.lng], {
            color: 'white',           // Borde blanco
            weight: 5,                // Grosor del borde
            fillColor: 'red',         // Color rojo
            fillOpacity: 1,           // Opacidad total
            radius: 9                 // Tamaño del punto
        }).addTo(mapa);
    }
  }
}


// Función que cambia entre modo 2D y 3D
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

  estadoModo.textContent = `Modo: ${modoActual}`;

  setTimeout(() => {
    mapa.invalidateSize();
  }, 450);
}

// Función para hacer zoom in
function zoomIn() {
    mapa.zoomIn();
}

// Función para hacer zoom out
function zoomOut() {
    mapa.zoomOut();
}

// Gestión personalizada de las capas de mapa
let indiceCapaActual = 0;
// Deben coincidir con las definidas arriba (capaClara, capaOscura, capaSatelite)
const listaCapasArray = [capaClara, capaOscura, capaSatelite]; 

//Función que cambia entre capas
function cambiarCapa() {
  // Retira la que haya puesta
  mapa.removeLayer(listaCapasArray[indiceCapaActual]);
  
  // Salta a la siguiente (0 -> 1 -> 2 -> 0)
  indiceCapaActual = (indiceCapaActual + 1) % listaCapasArray.length;
  
  // Y la añade al mapa
  mapa.addLayer(listaCapasArray[indiceCapaActual]);
}


// Función que recentra el mapa en la posición actual
function recentrarMapa() {
  // Si la posición actual es conocida, movemos el mapa hacia ella
  if (miLatitud !== null && miLongitud !== null) {
    mapa.setView([miLatitud, miLongitud], 16);
    estadoRuta.textContent = "Mapa recentrado en tu posición.";
  } else {
    estadoRuta.textContent = "Todavía no se conoce tu posición actual.";
  }
}

// Función que elimina la ruta actual
function eliminarRuta() {
    // Si no hay ruta que se esté mostrando, avisamos
    if (!controlRuta) {
        cajaPasos.innerHTML = "No puedes eliminar la ruta porque todavía no hay una activa.";
        return;
    }

    // Usamos limpiarRuta() que quita la línea azul del mapa, el punto de paso y resetea las listas
    limpiarRuta();

    // Quitamos también la chincheta del destino si fue seleccionada con el ratón
    if (marcadorDestino) {
        mapa.removeLayer(marcadorDestino);
        marcadorDestino = null;
        destinoClickLat = null;
        destinoClickLon = null;
    }

    // Actualizamos el texto de la caja de información
    cajaPasos.innerHTML = "Ruta eliminada.";
    estadoRuta.textContent = "Ruta eliminada. Elige un nuevo destino.";
}

// Asignamos la funcionalidad a cada botón del menú usando su atributo data-event
document.querySelectorAll(".btn-control-menu").forEach(boton => {
    boton.addEventListener("click", () => {
        const evento = boton.getAttribute("data-event");

        switch (evento) {
            case "zoomIn":
                zoomIn();
                break;
            case "zoomOut":
                zoomOut();
                break;
            case "toggleMode":
                toggleModeVisual();
                break;
            case "recenter":
                recentrarMapa();
                break;
            case "deleteRoute":
                eliminarRuta();
                break;
        }
    });
});

if (modoContadorPasos) {
  modoContadorPasos.addEventListener("change", () => {
    if (!modoContadorPasos.checked) {
      sesionPasosActiva = false;
      sesionPasosGuardada = false;
      pasosSesionActual = 0;
      caloriasSesionActual = 0;
      distanciaSesionMetros = 0;
      posicionAnteriorSesion = null;
      inicioSesionISO = null;
      destinoSesionNombre = "";
    }
    actualizarResumenContadorRuta();
  });
}

if (botonesFiltroActividad && botonesFiltroActividad.length) {
  botonesFiltroActividad.forEach((btn) => {
    btn.addEventListener("click", () => {
      botonesFiltroActividad.forEach((b) => b.classList.remove("activo"));
      btn.classList.add("activo");
      cargarActividad(btn.getAttribute("data-period") || "day");
    });
  });
}

actualizarResumenContadorRuta();




// =========================
// CÁLCULO DE RUTA
// =========================

// Función que calcula la ruta
/* Este bloque es el corazón incansable del motor de recolección inicial y la barra de búsqueda superior,
   y es el encargado absoluto de arrancar toda la operativa cada vez que un usuario decide que "ahí va a ir".
   Para entender cómo funciona internamente y cómo controla el flujo inicial al pulsar 
   enter en la caja de destino o el botón de lupa, hace falta tener en cuenta que necesitamos
   evaluar a toda costa si tenemos algo desde dónde partir. Sigue un escalafón estricto de sentencias:
    - 1. Si no nos está llegando señal activa de ubicación GPS en la matriz de estado local 
      ('miLatitud' en nulo), la maquinaria nos deniega drásticamente un cálculo y aborta (su return final).
    - 2. Suponiendo que hay conexión con nosotros, empieza por desbrozar y quitar los espacios en blanco
      accidentales que pudiera haber en el destino textual escrito en la barra ('inputDestino.value.trim').
    - 3. Evalúa si de modo contrario, un usuario ha estado marcando una chincheta roja con el dedo 
      al pulsar por el mapa (su 'modoClic.checked' está activo), para dar a esas coordenadas absolutas 
      prioridad abrumadora de destino frente a buscar algo en el propio servidor de mapas en un segundo. */
async function calcularRuta() {
  // Si no se conoce la posición actual, se muestra un mensaje
  if (miLatitud === null || miLongitud === null) {
    estadoRuta.textContent = "Aún no se ha obtenido tu ubicación GPS. Espera unos segundos.";
    return;
  }

  const destino = inputDestino.value.trim();  // Obtenemos el destino del input
  const usarClic = modoClic.checked;         // Obtenemos si se está usando el modo clic

  // Variables para almacenar las coordenadas y el nombre del destino
  let destLat;
  let destLon;
  let destNombre;

  // Si el modo clic está activado, exigimos que haya un punto seleccionado.
  if (usarClic) {
    if (destinoClickLat === null || destinoClickLon === null) {
      estadoRuta.textContent = "Activa modo clic y toca el mapa para marcar un destino.";
      return;
    }
    destLat = destinoClickLat;
    destLon = destinoClickLon;
    destNombre = `Punto: ${destLat.toFixed(5)}, ${destLon.toFixed(5)}`;
  } else if (destino) {
     // Si se ha escrito un texto, usamos Nominatim
    estadoRuta.textContent = "Buscando el lugar...";

    /*Este fragmento es el encargado de buscar el destino en Nominatim
    y obtener sus coordenadas. Para entender cómo funciona internamente, 
    hay que tener cuenta que Nominatim es un servicio de geocodificación que 
    nos devuelve un listado de coordenadas para una búsqueda dada, ya que el sistema
    no entiende de nombres de lugares. Por lo tanto, necesitamos convertir el nombre 
    del destino en coordenadas para poder calcular la ruta.*/
    try {
      /*Construimos la URL para hacer la petición a Nominatim. 
      format=json indica que queremos la res en formato JSON.
      q=${encodeURIComponent(destino)} sirve para codificar el destino y que se pueda enviar por URL.
      limit=1 indica que queremos solo un resultado*/
      const urlGeo = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino)}&limit=1`;
      // Hacemos la petición a Nominatim y usamos await para obligar al programa a esperar la res
      const respuestaGeo = await fetch(urlGeo);
      // Convertimos la res a JSON
      const datosGeo = await respuestaGeo.json();

      // Si Nominatim no encuentra nada, nos lo dice y no seguimos
      if (datosGeo.length === 0) {
        estadoRuta.textContent =
          "No se encontró ese destino. Intenta ser más específico.";
        return;
      }

      // Si Nominatim encuentra algo, guardamos latitud, longitud y nombre del destino
      destLat = parseFloat(datosGeo[0].lat);
      destLon = parseFloat(datosGeo[0].lon);     // parseFloat convierte el texto en número
      destNombre = datosGeo[0].display_name;     // Guardamos el nombre del destino

    } catch (error) {
      // Si falla la petición
      estadoRuta.textContent = "Error de conexión con los servicios de mapas.";
      console.error(error);
      return;
    }
  // Si no se ha escrito nada y no se ha usado el modo clic, se muestra un mensaje
  } else {
    estadoRuta.textContent = "Escribe un destino o selecciona uno en el mapa.";
    return;
  }

  /*Llamamos a la función limpiarRuta() para eliminar cualquier ruta que pudiera estar mostrándose
  en el mapa. Esto es necesario para evitar conflictos entre rutas y asegurar que solo se muestre
  la ruta que se acaba de calcular.*/
  limpiarRuta();

  estadoRuta.textContent = "Calculando ruta a pie...";

  /*Creamos el control de ruta con Leaflet Routing Machine. 
  Le pasamos como parámetros los waypoints (punto de inicio y fin), 
  la URL del servicio de routing (OSRM en este caso), 
  el perfil de routing (a pie), 
  el idioma (español) y algunas opciones de visualización.*/
  controlRuta = L.Routing.control({
    waypoints: [
      L.latLng(miLatitud, miLongitud),   // Punto de inicio
      L.latLng(destLat, destLon)         // Punto de destino
    ],
    // RouteWhileDragging: false: Indica que no queremos que se recalcule la ruta mientras arrastramos el control
    routeWhileDragging: false,
    // Es el motor que calcula la ruta. En este caso, usamos OSRM (Open Source Routing Machine)
    router: L.Routing.osrmv1({
      serviceUrl: "https://routing.openstreetmap.de/routed-foot/route/v1",  // URL del servidor OSRM
      profile: "foot"                                                       // Aquí indicamos que queremos una ruta a pie
    }),
    // LineOptions: Son las opciones de estilo de la línea de la ruta
    lineOptions: {
        // Color azul, grosor 5 y opacidad 0.85
        styles: [{ color: "#1f6feb", weight: 5, opacity: 0.85 }]
    },

    // createMarker: Función que crea clava 2 chinchetas en el mapa
    createMarker: function (i, waypoint) {
        // Borra la chincheta de inicio porque el usuario ya tiene marcadorUsuario
        if (i === 0) return null;

        // Creamos el marcador del destino
        return L.marker(waypoint.latLng).bindPopup(destNombre);
    },
    language: "es",           // Idioma de las instrucciones
    show: true,               // Muestra la ruta en el mapa
    collapsible: true,        // Permite ocultar la ruta
    fitSelectedRoutes: true   // Ajusta el mapa a la ruta
  }).addTo(mapa);

  /*Este fragmento se ejecuta cuando se encuentra la ruta correctamente.
  Lo que hace es guardar las instrucciones y coordenadas de la ruta para poder 
  navegar por ella*/
  controlRuta.on("routesfound", (e) => {
    // Cogemos la primera ruta encontrada
    const ruta = e.routes[0];

    // Guardamos instrucciones y coordenadas
    instruccionesRuta = ruta.instructions || [];
    coordenadasRuta = ruta.coordinates || [];

    // Reiniciamos el índice del paso actual
    indicePasoActual = 0;
    ultimoCambioAutomatico = 0;
    rutaTerminada = false;

    // Calculamos distancia y tiempo
    const distanciaKm = (ruta.summary.totalDistance / 1000).toFixed(1);
    const minutosTotales = Math.round(ruta.summary.totalTime / 60);

    let tiempoFormateado = "";
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

    miETA = `Llega en ${tiempoFormateado} (${distanciaKm} km)`;
    if (modoCompartirUbicacion.checked && miLatitud !== null && miLongitud !== null) {
        socket.emit("shareLocation", { lat: miLatitud, lng: miLongitud, name: miNombre, avatar: miAvatar, eta: miETA });
    }

    estadoRuta.textContent = `Ruta calculada: ${distanciaKm} km, ~${tiempoFormateado} a pie.`;

    // Activamos la opción de AR en el menú full-screen
    btnAR.classList.remove("oculto");

    // Compartir ruta si está activado
    if (modoCompartirUbicacion.checked) {
      socket.emit("shareRoute", coordenadasRuta);
    }

    // Mostramos la tarjeta inferior de ruta con Compartir / AR / Ir
    mostrarTarjetaRuta(distanciaKm, tiempoFormateado);

    // Mostramos el primer paso
    mostrarPasoActual();
  });

  // Si falla el cálculo de la ruta
  controlRuta.on("routingerror", () => {
    estadoRuta.textContent = "No se pudo calcular la ruta. Prueba con otro destino.";
  });
}




// =========================
// BOTÓN Y ENTER PARA CALCULAR LA RUTA
// =========================

// Evento que se ejecuta cuando se hace clic en el botón de calcular ruta
btnRuta.addEventListener("click", calcularRuta);

// Evento que se ejecuta cuando se presiona una tecla en el campo de destino
inputDestino.addEventListener("keydown", (e) => {
  // Si la tecla presionada es Enter, se calcula la ruta
  if (e.key === "Enter") {
    calcularRuta();
  }
});



// =========================
// CONTROLES DESPLEGABLES DEL MAPA
// =========================
const btnDesplegarControles = document.getElementById("btnDesplegarControles");
const opcionesDesplegables = document.getElementById("opcionesDesplegables");

if (btnDesplegarControles && opcionesDesplegables) {
  btnDesplegarControles.addEventListener("click", () => {
    // Alterna la clase oculto para mostrar u ocultar las opciones
    opcionesDesplegables.classList.toggle("oculto");
  });
}






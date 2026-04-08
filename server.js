// Importamos el módulo 'path' para trabajar con rutas de archivos y carpetas
const path = require("path");
// Const fs para el manejo del fichero JSON de usuarios
const fs = require("fs");
// Multer para subir archivos (fotos de perfil)
const multer = require("multer");

// Importamos Express para crear el servidor web
const express = require("express");

// Importamos 'http' para crear el servidor HTTP manualmente
const http = require("http");

// Importamos la clase Server de Socket.IO para la comunicación en tiempo real
const { Server } = require("socket.io");

// Creamos la aplicación Express
const app = express();
// Middleware para parsear JSON en el req.body
app.use(express.json());

// Creamos un servidor HTTP usando la app de Express
const server = http.createServer(app);

// Creamos el servidor de Socket.IO asociado al servidor HTTP
const io = new Server(server);

// Definimos el puerto donde se ejecutará el servidor
// Si existe una variable de entorno PORT la usa, si no usa el 3000
const PORT = process.env.PORT || 3000;

// Le decimos a Express que sirva todos los archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, "public")));

// Configuramos multer para guardar las fotos subidas en public/uploads
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = req.body.username || "user";
    cb(null, name + "_" + Date.now() + ext);
  }
});
const upload = multer({ storage });

// Cuando alguien entre en la raíz "/", lo redirigimos a pantalla.html
app.get("/", (req, res) => {
  res.redirect("/pantalla.html");
});

// Ruta opcional para abrir directamente la pantalla principal
app.get("/pantalla", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pantalla.html"));
});

// --- NUEVOS ENDPOINTS: USUARIOS Y AUTENTICACIÓN ---
const usersFile = path.join(__dirname, "users.json");

function loadUsers() {
  if (!fs.existsSync(usersFile)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function obtenerClaveSemanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - diaNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function obtenerClavePeriodo(fechaISO, periodo) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return null;
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  if (periodo === "month") return `${year}-${month}`;
  if (periodo === "week") return obtenerClaveSemanaISO(fecha);
  return `${year}-${month}-${day}`;
}

function normalizarHistorialActividad(user) {
  if (!Array.isArray(user.activityHistory)) {
    user.activityHistory = [];
  }
}

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Faltan datos" });
  
  const users = loadUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: "El usuario ya existe" });
  }

  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username.charAt(0))}&background=random&color=fff&rounded=true&size=128`;
  const newUser = { username, password, avatar, friends: [] };
  users.push(newUser);
  saveUsers(users);

  res.json({ success: true, user: { username: newUser.username, avatar: newUser.avatar, friends: [] } });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }
  res.json({ success: true, user: { username: user.username, avatar: user.avatar, friends: user.friends || [] } });
});

app.get("/api/users", (req, res) => {
  const { q, current_user } = req.query;
  const users = loadUsers();
  let results = users;
  if (q) {
    results = users.filter(u => u.username.toLowerCase().includes(q.toLowerCase()));
  }
  if (current_user) {
     results = results.filter(u => u.username.toLowerCase() !== current_user.toLowerCase());
  }
  // Return without passwords
  res.json(results.map(u => ({ username: u.username, avatar: u.avatar })));
});

// Subir foto de perfil desde el dispositivo
app.post("/api/user/avatar", upload.single("avatar"), (req, res) => {
  const username = req.body.username;
  if (!req.file) return res.status(400).json({ error: "No se ha subido ningún archivo" });

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  // Guardamos la ruta pública de la imagen
  user.avatar = "/uploads/" + req.file.filename;
  saveUsers(users);

  res.json({ success: true, avatar: user.avatar });
});

app.post("/api/friend", (req, res) => {
  const { username, friend_username } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  const friendExists = users.find(u => u.username === friend_username);
  
  if (!user || !friendExists) {
    return res.status(404).json({ error: "Usuario o amigo no encontrado" });
  }

  if (!user.friends) user.friends = [];
  if (!user.friends.includes(friend_username) && username !== friend_username) {
    user.friends.push(friend_username);
    saveUsers(users);
  }

  res.json({ success: true, friends: user.friends });
});

app.post("/api/activity", (req, res) => {
  const { username, steps, calories, distanceKm, startedAt, endedAt, destination } = req.body;
  if (!username) return res.status(400).json({ error: "Falta username" });

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  normalizarHistorialActividad(user);
  const nuevaActividad = {
    createdAt: new Date().toISOString(),
    startedAt: startedAt || null,
    endedAt: endedAt || new Date().toISOString(),
    destination: destination || "Ruta",
    steps: Math.max(0, parseInt(steps, 10) || 0),
    calories: Math.max(0, parseInt(calories, 10) || 0),
    distanceKm: Math.max(0, Number(distanceKm) || 0)
  };

  if (nuevaActividad.steps === 0 && nuevaActividad.calories === 0) {
    return res.status(400).json({ error: "Actividad sin datos" });
  }

  user.activityHistory.push(nuevaActividad);
  saveUsers(users);
  res.json({ success: true });
});

app.get("/api/activity", (req, res) => {
  const { username, period = "day" } = req.query;
  if (!username) return res.status(400).json({ error: "Falta username" });

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  normalizarHistorialActividad(user);
  const activities = user.activityHistory;
  const groupsMap = new Map();
  const totals = { steps: 0, calories: 0, routes: 0 };

  activities.forEach((a) => {
    const refDate = a.endedAt || a.createdAt;
    const key = obtenerClavePeriodo(refDate, period);
    if (!key) return;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { key, steps: 0, calories: 0, routes: 0, distanceKm: 0 });
    }

    const group = groupsMap.get(key);
    const pasos = Math.max(0, parseInt(a.steps, 10) || 0);
    const cals = Math.max(0, parseInt(a.calories, 10) || 0);
    const distance = Math.max(0, Number(a.distanceKm) || 0);

    group.steps += pasos;
    group.calories += cals;
    group.routes += 1;
    group.distanceKm += distance;

    totals.steps += pasos;
    totals.calories += cals;
    totals.routes += 1;
  });

  const groups = Array.from(groupsMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  res.json({ totals, groups });
});



// Actualmente el mando no se usa, se ha sustituido por el boton hamburguesa
// Pero se deja el codigo por si se quiere volver a usar en el futuro

// Variable para almacenar el estado de las ubicaciones y rutas compartidas
const sharedData = {};

// Escuchamos cuando un cliente se conecta por Socket.IO
io.on("connection", (socket) => {
  // Cuando alguien se conecta, le pasamos los datos que ya estén compartidos
  socket.emit("existingSharedData", sharedData);

  // Mostramos en consola el id del cliente que se ha conectado
  console.log(`Cliente conectado: ${socket.id}`);

  // Escuchamos el evento "clientReady", que manda cada cliente al conectarse
  socket.on("clientReady", (data) => {
    // Mostramos en consola qué tipo de cliente se ha conectado
    console.log("clientReady recibido:", data);

    // Reenviamos a todos los clientes un mensaje de estado indicando quién se ha conectado
    io.emit("statusMessage", {
      text: `${data?.role || "cliente"} conectado`,
      socketId: socket.id
    });
  });

  // Cuando el mando emita "nextStep", lo mostramos por consola y lo reenviamos
  socket.on("nextStep", () => {
    console.log("Servidor recibió: nextStep");
    io.emit("nextStep");
  });

  // Cuando el mando emita "prevStep", lo mostramos por consola y lo reenviamos
  socket.on("prevStep", () => {
    console.log("Servidor recibió: prevStep");
    io.emit("prevStep");
  });

  // Cuando el mando emita "zoomIn", lo mostramos por consola y lo reenviamos
  socket.on("zoomIn", () => {
    console.log("Servidor recibió: zoomIn");
    io.emit("zoomIn");
  });

  // Cuando el mando emita "zoomOut", lo mostramos por consola y lo reenviamos
  socket.on("zoomOut", () => {
    console.log("Servidor recibió: zoomOut");
    io.emit("zoomOut");
  });

  // Cuando el mando emita "toggleMode", lo mostramos por consola y lo reenviamos
  socket.on("toggleMode", () => {
    console.log("Servidor recibió: toggleMode");
    io.emit("toggleMode");
  });

  // Cuando el mando emita "recenter", lo mostramos por consola y lo reenviamos
  socket.on("recenter", () => {
    console.log("Servidor recibió: recenter");
    io.emit("recenter");
  });

  // Cuando el mando emita "confirm", lo mostramos por consola y lo reenviamos
  socket.on("confirm", () => {
    console.log("Servidor recibió: confirm");
    io.emit("confirm");
  });

  // Cuando el mando emita "exit", lo mostramos por consola y lo reenviamos
  socket.on("exit", () => {
    console.log("Servidor recibió: exit");
    io.emit("exit");
  });

  // Si el mando envía datos de orientación más detallados, los mostramos y los reenviamos
  socket.on("orientationData", (data) => {
    console.log("Servidor recibió orientationData:", data);
    io.emit("orientationData", data);
  });

  // --- NUEVOS EVENTOS: UBICACIÓN Y RUTA COMPARTIDA ---
  
  socket.on("shareLocation", (data) => {
    // Inicializamos si no existía
    if (!sharedData[socket.id]) {
      sharedData[socket.id] = {};
    }
    sharedData[socket.id].location = data;
    // Retransmitimos a los demás
    socket.broadcast.emit("updateContactLocation", { id: socket.id, ...data });
  });

  socket.on("shareRoute", (data) => {
    if (!sharedData[socket.id]) {
      sharedData[socket.id] = {};
    }
    sharedData[socket.id].route = data;
    socket.broadcast.emit("updateContactRoute", { id: socket.id, route: data });
  });

  socket.on("stopSharing", () => {
    // Un cliente decidió dejar de compartir explícitamente
    delete sharedData[socket.id];
    socket.broadcast.emit("removeContact", { id: socket.id });
  });

  // Escuchamos cuándo un cliente se desconecta
  socket.on("disconnect", () => {
    // Si estaba compartiendo datos, limpiamos el diccionario
    if (sharedData[socket.id]) {
      delete sharedData[socket.id];
      // Le decimos al resto que le borren del mapa
      socket.broadcast.emit("removeContact", { id: socket.id });
    }

    // Mostramos en consola el id del cliente que se ha desconectado
    console.log(`Cliente desconectado: ${socket.id}`);

    // Enviamos a todos un mensaje de estado avisando de la desconexión
    io.emit("statusMessage", {
      text: "Un cliente se ha desconectado",
      socketId: socket.id
    });
  });
});

// Ponemos el servidor a escuchar en el puerto indicado
server.listen(PORT, () => {
  // Mostramos en consola la URL local del servidor
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

/*npx localtunnel --port 3000.
Para que funcione en el móvil hay que poner la ip del ordenador en vez de localhost
http://localhost:3000*/
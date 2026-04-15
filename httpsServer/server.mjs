import https from 'https';
import fs from 'fs';
import express from 'express';
import { Server } from 'socket.io';

// Configurar las opciones de HTTPS (certificado y clave privada)
const options = {
    key: fs.readFileSync('certificados/MiServidorHTTPS.key'),
    cert: fs.readFileSync('certificados/MiServidorHTTPS.crt'),
};

const app = express();

// Configurar Express para servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Crear servidor HTTPS
const server = https.createServer(options, app);

// Inicializar socket.io con el servidor HTTPS
const io = new Server(server);

// Manejar conexiones de socket.io
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Recibe los datos de orientación del móvil y los reenvía a los demás clientes
  socket.on('evento', (data) => {
    //Código del socket 


  });

  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
  });

});

// Configurar una ruta básica
app.get('/hola', (req, res) => {
    res.send('Servidor HTTPS con socket.io funcionando y sirviendo archivos estáticos');
});

// Configurar el puerto y arrancar el servidor
const PORT = 3000; // Cambia el puerto según tus necesidades
server.listen(PORT, () => {
    console.log(`Servidor HTTPS corriendo en https://localhost:${PORT}`);
});
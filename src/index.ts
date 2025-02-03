import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
const cors = require("cors");
// Importar eventos
const authEvents = require('./events/auth');
const userEvents = require('./events/usuarios');
const poaEvents = require('./events/poa');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
    },
});
const morgan = require('morgan');

const PORT = 3001;

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Ruta de prueba HTTP
app.get('/', (req, res) => {
    res.send('Hello World! websocket');
});

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Registrar eventos de autenticación
    authEvents(io, socket);
    userEvents(io, socket);
    poaEvents(io, socket);

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Ruta para obtener un documento
app.get('/api/document', (req, res) => {
  const filePath = path.join(__dirname, 'documents', 'test-document.docx');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
    console.log('Documento enviado correctamente y d');
  } else {
    res.status(404).send('El documento no existe');
  }
});

// Ruta para guardar un documento
app.post('/api/save-document', (req, res) => {
console.log('Datos recibidos:', req.body);  // Agrega esta línea para inspeccionar los datos
const filePath = path.join(__dirname, 'documents', 'saved-document.docx');
const documentData = req.body;

if (documentData?.url) {
    const file = fs.createWriteStream(filePath);
    const request = http.get(documentData.url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(() => {
                console.log('Documento guardado correctamente');
                res.status(200).send('Documento guardado correctamente');
            });
        });
    });

    request.on('error', (err) => {
        console.error('Error al descargar el documento:', err);
        res.status(500).send('Error al guardar el documento');
    });
} else {
    res.status(400).send('Datos inválidos recibidos');
}
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

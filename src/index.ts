import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
const cors = require("cors");
// Importar eventos
const authEvents = require('./events/auth');
const userEvents = require('./events/usuarios');
const poaEvents = require('./events/poa');
const emailEvents = require('./events/email');
const patenteEvents = require('./events/patente');
const form4Events = require('./events/form4');
const express = require('express');
const documentos = require('./events/documentos');
// Importar Rutas
import documentosRoutes from './routes/documentos.routes';

require('dotenv').config();
const router = express.Router();
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


const server = http.createServer(app);
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
const io = new Server(server, {
    path: "/doc/socket.io",
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true 
    },
});
const morgan = require('morgan');

const PORT = 3001;

// Middleware
app.use(morgan('dev'));

// Ruta de prueba http
router.get('/', (req:any, res:any) => {
    res.send('Hello World! websocket');
});

// Usar las rutas de documentos
router.use('/api', documentosRoutes);

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Registrar eventos de autenticación
    authEvents(io, socket);
    // Registrar eventos de usuarios
    userEvents(io, socket);
    // Registrar eventos de poa
    poaEvents(io, socket);
    //enviar correos electronicos 
    emailEvents(io, socket);
    // Registrar eventos de patentes
    patenteEvents(io, socket);
    // Registrar eventos de documentos
    documentos(io, socket);
    // Registrar eventos de form4
    //form4Events(io, socket);
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

app.use('/doc/', router);

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

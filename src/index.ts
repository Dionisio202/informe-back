import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Importar eventos
const authEvents = require('./events/auth');
const userEvents = require('./events/usuarios');
const poaEvents = require('./events/poa');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
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

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

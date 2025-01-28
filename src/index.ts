import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Importar eventos
const authEvents = require('./events/auth');
const userEvents = require('./events/usuarios');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST'],
    },
});
const morgan = require('morgan');

const PORT = 3000;

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

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

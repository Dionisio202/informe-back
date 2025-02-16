import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
const cors = require("cors");
// Importar eventos
const authEvents = require('./events/auth');
const userEvents = require('./events/usuarios');
const poaEvents = require('./events/poa');
const emailEvents = require('./events/email');
const patenteEvents = require('./events/patente');
const form4Events = require('./events/form4');

// Importar Rutas
import documentosRoutes from './routes/documentos.routes';

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
app.use(morgan('dev'));

// Ruta de prueba HTTP
app.get('/', (req, res) => {
    res.send('Hello World! websocket');
});

app.use('/api', documentosRoutes);

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
    // Registrar eventos de form4
    //form4Events(io, socket);
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

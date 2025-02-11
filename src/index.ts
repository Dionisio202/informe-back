import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express-serve-static-core';
const cors = require("cors");
// Importar eventos
const authEvents = require('./events/auth');
const userEvents = require('./events/usuarios');
const poaEvents = require('./events/poa');
const emailEvents = require('./events/email');
const patenteEvents = require('./events/patente');
const form4Events = require('./events/form4');
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

// http://localhost:3001/api/document?nombre=Formato_solicitud_registro.docx
app.get('/api/document', (req: any, res: any) => {
    const nombre = req.query.nombre as string; // Forzamos el tipo a string

    if (!nombre) {
        return res.status(400).send('Debe proporcionar un nombre de documento.');
    }

    const filePath = path.join(__dirname, 'documents', nombre);

    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
        res.setHeader('Content-Type', 'application/octet-stream'); // Tipo de archivo genérico
        res.sendFile(filePath);
        console.log(`Documento ${nombre} enviado correctamente`);
    } else {
        res.status(404).send('El documento no existe');
    }
});
  

// Ruta para guardar un documento
app.post('/api/save-document', (req:any, res:any) => {
    console.log('📥 Datos recibidos en el callback:', req.body); // <-- Agrega esto

    if (!req.body || !req.body.url || !req.body.key) {
        console.error('❌ Datos inválidos recibidos:', req.body);
        return res.status(400).json({ error: 'Datos inválidos recibidos' });
    }

    const filePath = path.join(__dirname, 'documents', `${req.body.key}.docx`);
    const file = fs.createWriteStream(filePath);

    http.get(req.body.url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(() => {
                console.log('✅ Documento guardado correctamente:', filePath);
                res.status(200).json({ message: 'Documento guardado correctamente' }); // 🔹 JSON en lugar de string
            });
        });
    }).on('error', (err) => {
        console.error('❌ Error al descargar el documento:', err);
        res.status(500).json({ error: 'Error al guardar el documento' }); // 🔹 JSON en lugar de string
    });
});


// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

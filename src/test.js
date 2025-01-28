const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log(`✅ Conectado al servidor WebSocket con ID: ${socket.id}`);

    // Enviar evento de login
    socket.emit('login', { email: 'juan.perez@example2.com', password: 'password123' });

    // Escuchar respuesta de éxito
    socket.on('login_success', (data) => {
        console.log('✅ Login exitoso:', data);
    });

    // Escuchar errores
    socket.on('login_error', (message) => {
        console.error('❌ Error en login:', message);
        socket.close(); // Cerrar la conexión
    });
});

// Manejar errores de conexión
socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión:', error);
});
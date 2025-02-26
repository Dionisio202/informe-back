import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // URL de tu servidor

// Emitir evento y recibir respuesta
socket.emit("datos_proceso", (response) => {
    if (response.success) {
        console.log("Datos recibidos:", response.jsonData);
    } else {
        console.error("Error:", response.message);
        // Mostrar alerta al usuario
    }
});
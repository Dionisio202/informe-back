import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // URL de tu servidor

// Emitir evento y recibir respuesta
socket.on("connect", () => {
  console.log("✅ Conectado al servidor WebSocket");

  // Enviar una petición al evento 'obtener_codigo_almacenamiento'
  socket.emit("obtener_facultades_carreras", (response) => {
    if (response.success) {
      console.log("Datos recibidos:", response.data);
    } else {
      console.error("Error:", response.message);
    }
  });
});
import { io } from "socket.io-client";

const socket = io("http://localhost:3001"); // URL de tu servidor

// Emitir evento y recibir respuesta
socket.on("connect", () => {
  console.log("✅ Conectado al servidor WebSocket");

  // Enviar una petición al evento 'obtener_codigo_almacenamiento'
  socket.emit(
    "datos_registro",

    (response) => {
      console.log("📌 Respuesta del servidor:", response);
      socket.disconnect(); // Cerrar la conexión después de recibir la respuesta
    }
  );
});

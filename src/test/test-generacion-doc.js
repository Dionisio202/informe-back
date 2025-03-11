import { io } from "socket.io-client";

// URL del servidor donde se ejecuta tu socket
const SERVER_URL = "http://localhost:3001"; // Reemplázalo por la URL de tu servidor

// Conexión con el servidor de WebSocket
const socket = io(SERVER_URL, {
  reconnectionAttempts: 5, // Intentos de reconexión
  timeout: 5000, // Tiempo de espera antes de considerar un error
});

socket.on("connect", () => {
  console.log("✅ Conectado al servidor WebSocket");

  // Enviar una petición al evento 'obtener_codigo_almacenamiento'
  socket.emit("generar_documentos",
    {
      id_registro: "5635878533707719322-28001", // Reemplázalo con un ID real
      id_tarea: "520002", // Tipo de documento que deseas probar
    },
    (response) => {
      console.log("📌 Respuesta del servidor:", response);
      socket.disconnect(); // Cerrar la conexión después de recibir la respuesta
    }
  );
});

socket.on("disconnect", () => {
  console.log("❌ Desconectado del servidor WebSocket");
});

socket.on("connect_error", (err) => {
  console.error("⚠️ Error de conexión:", err.message);
});

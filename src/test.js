const io = require("socket.io-client");

// URL del servidor donde está corriendo el socket
const socket = io("http://localhost:3001"); // Cambia la URL según tu entorno

// Datos que se enviarán al servidor
const data = {
  id_registro: 3,  // Cambia este valor por el ID de tarea que deseas probar
  id_tarea: 1,      // Cambia este valor por el ID de tarea que deseas probar
};

// Conectar al servidor
socket.on("connect", () => {
  console.log("Conectado al servidor de sockets");

  // Emitir el evento "generar_documentos"
  socket.emit("generar_documentos", data, (response) => {
    // Manejar la respuesta del servidor
    if (response.success) {
      console.log("Respuesta del servidor:", response.message);
    } else {
      console.error("Error en el servidor:", response.message);
    }

    // Desconectar después de recibir la respuesta
    socket.disconnect();
  });
});

// Manejar errores de conexión
socket.on("connect_error", (err) => {
  console.error("Error al conectar al servidor:", err.message);
});

// Manejar desconexión
socket.on("disconnect", () => {
  console.log("Desconectado del servidor");
});
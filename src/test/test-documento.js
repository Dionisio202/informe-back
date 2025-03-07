const { io } = require("socket.io-client");

// Conectar al servidor en el puerto correspondiente
const socket = io("http://localhost:3001");

// Cuando se establece la conexión, se pueden emitir los eventos para testear
socket.on("connect", () => {
  console.log("Conectado al servidor de WebSocket");

  // 1. Testear el evento para obtener registros
  socket.emit("obtener_registros", {}, (response) => {
    if (response.success) {
      console.log("Registros recibidos:", response.data);
      
      // Si hay registros, usar el primero para probar las tareas con documentos
      if (response.data && response.data.length > 0) {
        const primerRegistro = response.data[0].id_registro;
        testearTareasConDocumentos(primerRegistro);
      } else {
        console.log("No hay registros para probar tareas");
      }
    } else {
      console.error("Error al obtener registros:", response.message);
    }
  });
});

// Función para testear obtener_tareas_con_documentos
function testearTareasConDocumentos(id_registro) {
  console.log(`Probando tareas con documentos para registro: ${id_registro}`);
  
  socket.emit("obtener_tareas_con_documentos", { id_registro }, (response) => {
    if (response.success) {
      console.log("Tareas con documentos recibidas:", response.data);
      
      // Si hay tareas, usar la primera para probar los documentos
      if (response.data && response.data.length > 0) {
        const primerTarea = response.data[0].id_tareas;
        testearDocumentosTarea(primerTarea);
      } else {
        console.log("No hay tareas con documentos para probar");
      }
    } else {
      console.error("Error al obtener tareas con documentos:", response.message);
    }
  });
}

// Función para testear obtener_documentos_tarea
function testearDocumentosTarea(id_tarea) {
  console.log(`Probando documentos para tarea: ${id_tarea}`);
  
  socket.emit("obtener_documentos_tarea", { id_tarea }, (response) => {
    if (response.success) {
      console.log("Documentos de la tarea recibidos:", response.data);
    } else {
      console.error("Error al obtener documentos de la tarea:", response.message);
    }
  });
}

// Manejar la desconexión
socket.on("disconnect", () => {
  console.log("Desconectado del servidor de WebSocket");
});

// Manejar errores
socket.on("error", (error) => {
  console.error("Error en la conexión de socket:", error);
});
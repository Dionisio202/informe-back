const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log(`Conectado al servidor con ID: ${socket.id}`);

  const nuevaActividad = {
    nombre_actividad: "Planificación Estratégica 2",
    indicador_actividad: "Cumplimiento de objetivos al 90%",
    proyeccion_actividad: "Lograr metas trimestrales",
    t1: 15,
    t2: 20,
    t3: 25,
    t4: 50,
    gastos_t_humanos: 10000,
    gasto_b_capital: 5000,
    gasto_b_servicios: 3000,
    anio: 2021,
    linea_base: 10000,
    total_actividad: 15000,
    responsables: [14,13,15],
  };

  // Emitir el evento para agregar actividad
  socket.emit("add_poa",nuevaActividad,(response) => {
    if (response.success) {
      console.log("✅ Actividad agregada correctamente:", response.data);
    } else {
      console.error("❌ Error al agregar actividad:", response.message);
    }
    socket.disconnect(); // Cerrar conexión después de la prueba
  });
});

socket.on("connect_error", (err) => {
  console.error("Error de conexión:", err);
});

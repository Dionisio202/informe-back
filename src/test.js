const { io } = require("socket.io-client");
const socket = io("http://localhost:3001");

socket.on("connect", async () => {
  console.log(`✅ Conectado al servidor con ID: ${socket.id}`);
  try {
    // 📌 Datos de prueba
    const data = {
      id_registro: 3,
      productos: [
        { nombre: "Producto 1", tipo: "1" },
        { nombre: "Producto 2", tipo: "1" }
      ],
      autoridad: 1,
      proyecto: {
        nombre: "Proyecto 1",
        codigo: "UTA-sadaskndkajs"
      },
      memorando: "asdadasd"
    };

    console.log("📤 Enviando datos al servidor...");
    // 📌 Emitir el evento para agregar productos
    socket.emit("agregar_producto_datos", data, (response) => {
      if (response.success) {
        console.log("✅ Productos agregados correctamente:", response.message);
      } else {
        console.error("❌ Error al agregar productos:", response.message);
      }
      socket.disconnect(); // Cerrar conexión después de la prueba
    });
  } catch (error) {
    console.error("❌ Error en la prueba:", error.message);
    socket.disconnect();
  }
});

// 📌 Manejo de errores de conexión
socket.on("connect_error", (err) => {
  console.error("❌ Error de conexión:", err);
});
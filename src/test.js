const { io } = require("socket.io-client");
const fs = require("fs");
const path = require("path");

const socket = io("http://localhost:3001");

socket.on("connect", async () => {
  console.log(`✅ Conectado al servidor con ID: ${socket.id}`);

  try {
    // 📂 Ruta del archivo de prueba (PDF o DOCX)
    const filePath = path.join(__dirname, "documents/autores.docx"); // Asegúrate de tener el archivo en la misma carpeta
    if (!fs.existsSync(filePath)) {
      throw new Error("❌ Archivo no encontrado: " + filePath);
    }

    // 📌 Leer el archivo y convertirlo a Base64
    const fileBuffer = fs.readFileSync(filePath);
    const documento = fileBuffer.toString("base64");

    // 📌 Datos de prueba
    const data = {
      codigo: 1, // Código de la patente o registro
      documento: documento, // Archivo en Base64
    };

    console.log("📤 Enviando datos al servidor...");

    // 📌 Emitir el evento para guardar autores
    socket.emit("set_autores", data, (response) => {
      if (response.success) {
        console.log("✅ Autores guardados correctamente:", response.message);
      } else {
        console.error("❌ Error al guardar autores:", response.message);
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
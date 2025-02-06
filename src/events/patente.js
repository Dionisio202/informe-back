const { getConnection, sql } = require("../config/Conecction_SQL_Server");
const { procesarArchivo } = require("../utils/obtener_datos_autores"); // Importar la función para procesar documentos

module.exports = (io, socket) => {
    console.log('📌 Evento WebSocket "patente" registrado');

    // Evento para guardar los autores de un registro de patente
    socket.on("set_autores", async (data, callback) => {
      try {
          const { codigo, documento } = data; // Extraer el código y el documento del objeto data
  
          if (!codigo || !documento) {
              return callback({ success: false, message: "Código y documento son obligatorios" });
          }
  
          // Procesar el documento (PDF o DOCX) y obtener la lista de autores en formato JSON
          const personas = await procesarArchivo(documento);
  
          if (personas.length === 0) {
              return callback({ success: false, message: "No se encontraron datos válidos en el documento" });
          }
  
          // Convertir el array de personas a formato JSON para enviarlo a SQL Server
          const jsonAutores = JSON.stringify(personas);
          //console.log("Autores procesados:", jsonAutores);
          // Obtener la conexión a la base de datos
          const pool = await getConnection();
  
          // Ejecutar el procedimiento almacenado con el JSON de autores y el código de registro
          await pool.request()
              .input("jsonAutores", sql.NVarChar, jsonAutores) // Enviar el JSON como NVARCHAR(MAX)
              .input("codigoRegistro", sql.Int, codigo) // Enviar el código de registro
              .execute("ProcesarAutores"); // Llamar al procedimiento almacenado en SQL Server
  
          console.log("Autores guardados correctamente");
          callback({ success: true, message: "Autores guardados correctamente en la base de datos" });
  
      } catch (err) {
          console.error("Error al guardar autores:", err);
          callback({ success: false, message: "Error al guardar autores en la base de datos" });
      }
  });
  
};
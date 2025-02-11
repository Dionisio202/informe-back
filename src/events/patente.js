const { getConnection, sql } = require("../config/Conecction_SQL_Server");
const { procesarArchivo } = require("../utils/obtener_datos_autores"); // Importar la función para procesar documentos

module.exports = (io, socket) => {
    console.log('📌 Evento WebSocket "patente" registrado');



    // Evento para obtener las autoridades disponibles
    socket.on("obtener_autoridades", async (callback) => {
        try {
            // Obtener la conexión a la base de datos
            const pool = await getConnection();

            // Ejecutar la consulta para obtener las autoridades
            const result = await pool.request().query("SELECT * FROM Autoridades");

            const autoridades = result.recordset; // Extraer las autoridades de la respuesta

            console.log("Autoridades obtenidas:", autoridades);
            callback({ success: true, autoridades }); // Enviar las autoridades al cliente

        } catch (err) {
            console.error("Error al obtener autoridades:", err);
            callback({ success: false, message: "Error al obtener autoridades" });
        }
    });

    // Evento para traer los tipos de productos
    socket.on("obtener_tipos_productos", async (callback) => {
        try {
            // Obtener la conexión a la base de datos
            const pool = await getConnection();

            // Ejecutar la consulta para obtener los tipos de productos
            const result = await pool.request().query("SELECT * FROM TiposProductos");

            const tiposProductos = result.recordset; // Extraer los tipos de productos de la respuesta

            console.log("Tipos de productos obtenidos:", tiposProductos);
            callback({ success: true, tiposProductos }); // Enviar los tipos de productos al cliente

        } catch (err) {
            console.error("Error al obtener tipos de productos:", err);
            callback({ success: false, message: "Error al obtener tipos de productos" });
        }
    });

    // Evento para generar un registro de patente
    socket.on("iniciar_registro", async (data, callback) => {
        try {
            const { id_funcionario, id_proceso } = data;
    
            if (!id_funcionario) {
                return callback({ success: false, message: "El id_funcionario es obligatorio" });
            }
    
            const pool = await getConnection();
    
            // Ejecutar la consulta INSERT
            await pool.request()
                .input("id_funcionario", sql.Int, id_funcionario) // ID del funcionario
                .input("id_proceso", sql.Int, id_proceso) // ID del proceso
                .query(`
                    INSERT INTO tu_tabla (id_funcionario, fecha_registro, fecha_finalizacion, estado, id_autoridad, estado_proceso, id_proceso)
                    VALUES (@id_funcionario, GETDATE(), NULL, 0.00, NULL, 'iniciado', @id_proceso)
                `);
    
            console.log("Registro creado correctamente");
            callback({ success: true, message: "Registro creado correctamente" });
    
        } catch (err) {
            console.error("Error al crear el registro:", err);
            callback({ success: false, message: "Error al crear el registro" });
        }
    });
    
    // Evento para agregar productos a un registro de patente
    socket.on("agregar_producto", async (data, callback) => {
        try {
            const { id_proceso, id_tipo_producto, nombre_producto, proyecto_per, } = data;
    
            if (!id_proceso || !id_tipo_producto || !nombre_producto) {
                return callback({ success: false, message: "Estos campos son obligatorios" });
            }
    
            const pool = await getConnection();
    
            // Ejecutar la consulta INSERT
            await pool.request()
                .input("id_registro", sql.Int, id_registro) // ID del registro
                .input("id_tipo_producto", sql.Int, id_tipo_producto) // ID del tipo de producto
                .input("nombre_producto", sql.NVarChar, nombre_producto) // Nombre del producto
                .input("descripcion_producto", sql.NVarChar, descripcion_producto) // Descripción del producto
                .query(`
                    INSERT INTO Productos (id_registro, id_tipo_producto, nombre_producto, descripcion_producto)
                    VALUES (@id_registro, @id_tipo_producto, @nombre_producto, @descripcion_producto)
                `);
            console.log("Producto agregado correctamente");
            callback({ success: true, message: "Producto agregado correctamente" });
        } catch (err) {
            console.error("Error al agregar el producto:", err);
            callback({ success: false, message: "Error al agregar el producto" });
        }
    });

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
          console.log("Autores procesados:", jsonAutores);
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
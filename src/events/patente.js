const { getConnection, sql } = require("../config/Conecction_SQL_Server");
const { procesarArchivoAutores } = require("../utils/obtener_datos_autores"); // Importar la función para procesar documentos
const { procesarArchivoProducto } = require("../utils/obtener_datos_producto"); // Importar la función para procesar documentos
const generarContrato = require("../utils/generador_contrato_cesion_derechos"); // Importar la función para generar documentos
const generarActaPP = require("../utils/generador_porcentaje_participacion"); // Importar la función para generar documentos

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
      const result = await pool
        .request()
        .query("SELECT * FROM Tipos_Productos");

      const tiposProductos = result.recordset; // Extraer los tipos de productos de la respuesta

      console.log("Tipos de productos obtenidos:", tiposProductos);
      callback({ success: true, tiposProductos }); // Enviar los tipos de productos al cliente
    } catch (err) {
      console.error("Error al obtener tipos de productos:", err);
      callback({
        success: false,
        message: "Error al obtener tipos de productos",
      });
    }
  });

  // Evento para generar un registro de patente
  socket.on("iniciar_registro", async (data, callback) => {
    try {
      const { id_funcionario, id_proceso, id_caso, nombre_proceso } = data;

      // Id combinado
      const id_registro = id_proceso + "-" + id_caso;

      if (!id_funcionario) {
        return callback({
          success: false,
          message: "El id_funcionario es obligatorio",
        });
      }

      const pool = await getConnection();

      // 1️⃣ Insertar o verificar el proceso en la tabla "procesos"
      await pool
        .request()
        .input("id_proceso", sql.BigInt, id_proceso) // ID del proceso
        .input("nombre_proceso", sql.VarChar, nombre_proceso) // Nombre del proceso
        .query(`
          MERGE INTO Procesos AS target
          USING (VALUES (@id_proceso, @nombre_proceso)) 
          AS source (id, name)
          ON target.id = source.id
          WHEN NOT MATCHED THEN
              INSERT (id, name, description)
              VALUES (source.id, source.name, NULL); -- description puede ser NULL o un valor por defecto
        `);

      // 2️⃣ Insertar o verificar el registro en la tabla "Registros"
      await pool
        .request()
        .input("id_funcionario", sql.Int, id_funcionario) // ID del funcionario
        .input("id_registro", sql.VarChar, id_registro) // ID del caso
        .input("id_proceso", sql.BigInt, id_proceso) // ID del proceso
        .query(`
          MERGE INTO Registros AS target
          USING (VALUES (@id_funcionario, @id_registro, @id_proceso)) 
          AS source (id_funcionario, id_registro, id_proceso)
          ON target.id_registro = source.id_registro AND target.id_proceso = source.id_proceso
          WHEN NOT MATCHED THEN
              INSERT (id_funcionario, fecha_registro, fecha_finalizacion, estado, id_autoridad, estado_proceso, id_registro, id_proceso)
              VALUES (source.id_funcionario, GETDATE(), NULL, 0.00, NULL, 'iniciado', source.id_registro, source.id_proceso);
        `);

      console.log("Registro creado o verificado correctamente");
      callback({
        success: true,
        message: "Registro creado o verificado correctamente",
      });
    } catch (err) {
      console.error("Error al crear o verificar el registro:", err);
      callback({
        success: false,
        message: "Error al crear o verificar el registro",
      });
    }
  });

  // Evento para agregar productos a un registro de patente
  socket.on("agregar_producto_datos", async (data, callback) => {
    try {
      const { id_registro, jsonProductos, memorando } = data;
      // Validar que todos los campos estén presentes
      if (!id_registro || !jsonProductos || !memorando) {
        return callback({
          success: false,
          message: "Todos los campos son obligatorios",
        });
      }
      // Parsear el JSON de productos (datos extraídos del documento)
      const datosDocumento = JSON.parse(jsonProductos);
      // Crear el JSON que se enviará al procedimiento almacenado
      const jsonData = JSON.stringify({
        id_registro: id_registro, // Identificador del registro
        productos: datosDocumento.productos, // Productos extraídos del documento
        autoridad: {
          nombre: datosDocumento.solicitante.nombre,
          Rol: datosDocumento.solicitante.cargo,
          facultad: "definir en el formato",
        },
        proyecto: {
          nombre: datosDocumento.proyecto.titulo,
          codigo: datosDocumento.proyecto.resolucion.numero,
        },
        memorando: memorando, // Número o identificador del memorando
      });
      const pool = await getConnection();
      // Ejecutar el procedimiento almacenado
      await pool
        .request()
        .input("json", sql.NVarChar, jsonData) // Pasar el JSON como parámetro
        .query(`EXEC InsertarRegistroConDatos @json`);
      console.log("Datos procesados correctamente");
      callback({ success: true, message: "Datos procesados correctamente" });
    } catch (err) {
      console.error("Error al procesar los datos:", err);
      callback({ success: false, message: "Error al procesar los datos" });
    }
  });

  // Evento de procesamiento de doeumentos y extracción de datos de productos y autores para previsualización en el Front
  socket.on("procesar_documentos", async (data, callback) => {
    const { documento_autores, documento_productos } = data;
    try {
      // Procesar el documento de autores y obtener la lista de autores en formato JSON
      const autores = await procesarArchivoAutores(documento_autores);
      const productos = await procesarArchivoProducto(documento_productos);

      if (autores.length === 0 || productos.length === 0) {
        return callback({
          success: false,
          message: "No se encontraron datos válidos en el documento",
        });
      }

      // Convertir el array de personas a formato JSON para enviarlo al Front
      const jsonAutores = JSON.stringify(autores);
      const jsonProductos = JSON.stringify(productos);
      console.log("Autores procesados:", jsonAutores);
      console.log("Productos procesados:", jsonProductos);

      callback({
        success: true,
        message: "Datos procesados correctamente",
        autores: jsonAutores,
        productos: jsonProductos,
      });
    } catch (err) {
      console.error("Error al procesar los documentos:", err);
      callback({
        success: false,
        message: "Error al procesar los documentos",
      });
    }
  });

  // Evento para guardar los autores de un registro de patente
  socket.on("set_autores", async (data, callback) => {
    try {
      const { codigo, json } = data; // Extraer el código y el documento del objeto data

      if (!codigo || !documento) {
        return callback({
          success: false,
          message: "Código y documento son obligatorios",
        });
      }

      // Convertir el array de personas a formato JSON para enviarlo a SQL Server
      const jsonAutores = JSON.stringify(json);
      console.log("Autores procesados:", jsonAutores);
      // Obtener la conexión a la base de datos
      const pool = await getConnection();

      // Ejecutar el procedimiento almacenado con el JSON de autores y el código de registro
      await pool
        .request()
        .input("jsonAutores", sql.NVarChar, jsonAutores) // Enviar el JSON como NVARCHAR(MAX)
        .input("codigoRegistro", sql.Int, codigo) // Enviar el código de registro
        .execute("ProcesarAutores"); // Llamar al procedimiento almacenado en SQL Server

      console.log("Autores guardados correctamente");
      callback({
        success: true,
        message: "Autores guardados correctamente en la base de datos",
      });
    } catch (err) {
      console.error("Error al guardar autores:", err);
      callback({
        success: false,
        message: "Error al guardar autores en la base de datos",
      });
    }
  });

  // Evento para guardar los estados temporales de los formularios
  socket.on("guardar_estado_temporal", async (data, callback) => {
    try {
      const { id_registro, id_tarea, jsonData, id_funcionario } = data; // Extraer los datos del objeto data

      //id combinado
      const id_combinado = id_registro + "-" + id_tarea;

      // Obtener la conexión a la base de datos
      const pool = await getConnection();

      // Usar MERGE para hacer un "upsert" (insertar o actualizar)
      await pool
        .request()
        .input("id_registro", sql.Int, id_registro)
        .input("id_funcionario", sql.Int, id_funcionario)
        .input("id_tarea", sql.BigInt, id_combinado)
        .input("jsonData", sql.VarChar, jsonData).query(`
          MERGE INTO Tareas_Instancia AS target
          USING (VALUES (@id_registro, @id_tarea, @jsonData, @id_funcionario)) AS source (id_registro, id_tarea, jsonData,id_funcionario)
          ON target.id_registro = source.id_registro AND target.id_tarea = source.id_tarea
          WHEN MATCHED THEN
            UPDATE SET jsonData = source.jsonData
          WHEN NOT MATCHED THEN
            INSERT (id_registro, id_tarea, jsonData, id_funcionario)
            VALUES (source.id_registro, source.id_tarea, source.jsonData, source.id_funcionario);
        `);

      console.log("Estado temporal guardado o actualizado correctamente");

      // Enviar respuesta de éxito al cliente
      callback({
        success: true,
        message: "Estado temporal guardado o actualizado correctamente",
      });
    } catch (err) {
      console.error("Error al guardar o actualizar el estado temporal:", err);
      callback({
        success: false,
        message: "Error al guardar o actualizar el estado temporal",
      });
    }
  });

  // Generacion de documentos
  socket.on("generar_documentos", async (data, callback) => {
    try {
      const { id_registro, id_tarea } = data; // Extraer los datos del objeto data

      // ID combinado
      const id_combinado = `${id_registro}-${id_tarea}`;

      // Nombres de los archivos de salida
      const outputFileNameCCDP = `Contrato_Cesion_Derechos_${id_combinado}.docx`;
      const outputFileNameAPP = `Acta_Porcentaje_Participacion_${id_combinado}.docx`;

      // Obtener Datos de la base de datos
      const pool = await getConnection();
      const result_APP = await pool
        .request()
        .input("id_registro", sql.Int, id_registro)
        .query(`EXEC ObtenerDatosProducto @id_registro = @id_registro;`);

      const result_CCDP = await pool
        .request()
        .input("id_registro", sql.Int, id_registro)
        .query(`EXEC GenerarJSONParaRegistro @id_registro = @id_registro;`);

      // Si la consulta no devuelve resultados
      if (
        !result_APP.recordset ||
        result_APP.recordset.length === 0 ||
        !result_CCDP.recordset ||
        result_CCDP.recordset.length === 0
      ) {
        throw new Error(
          "No se encontraron datos para el id_registro proporcionado."
        );
      }

      // Convertir la respuesta JSON de SQL Server en un objeto JavaScript
      let jsonDataAPP = JSON.parse(result_APP.recordset[0].ResultadoJSON);
      let jsonDataCCDP = JSON.parse(result_CCDP.recordset[0].ResultadoJSON);
      // 🛠️ Reparar la propiedades (convertir string a objeto)
      //Fechas
      jsonDataAPP.fecha = JSON.parse(jsonDataAPP.fecha);
      jsonDataCCDP.fecha = JSON.parse(jsonDataCCDP.fecha);
      //Rector
      jsonDataCCDP.rector = JSON.parse(jsonDataCCDP.rector);

      // Generar los documentos
      generarActaPP(jsonDataAPP, outputFileNameAPP);
      generarContrato(jsonDataCCDP, outputFileNameCCDP);

      // Enviar respuesta de éxito al cliente
      callback({
        success: true,
        message: "Documentos generado correctamente",
        documentNames: {
          CCDP: outputFileNameCCDP,
          APP: outputFileNameAPP,
        },
      });
    } catch (err) {
      console.error("❌ Error al generar el documento:", err.message);
      callback({
        success: false,
        message: "Error al generar el documento",
        error: err.message, // Envía detalles del error para depuración
      });
    }
  });
};

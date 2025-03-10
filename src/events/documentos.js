const { getConnection, sql } = require("../config/Conecction_SQL_Server");
// Variables de entorno
require("dotenv").config();

module.exports = (io, socket) => {
  console.log('📌 Evento WebSocket "patente" registrado');

  socket.on("obtener_registros", async (data, callback) => {
    try {
      const pool = await getConnection();
      const registrosResult = await pool.request().query(`
            SELECT 
            r.id_registro,
            r.fecha_registro,
            p.name AS nombre_registro,
            u.Nombre AS funcionario_registro
        FROM [onlyoffice].[dbo].[Registros] r
        INNER JOIN [onlyoffice].[dbo].[Procesos] p 
            ON r.id_proceso = p.id
        INNER JOIN [onlyoffice].[dbo].[Usuarios] u 
            ON r.id_funcionario = u.Id;

      `);
      const registros = registrosResult.recordset;
  
      callback({
        success: true,
        data: registros,
      });
    } catch (err) {
      console.error("❌ Error al obtener registros:", err.message);
      callback({
        success: false,
        message: "Error al obtener registros",
        error: err.message,
      });
    }
  });
  
  socket.on("obtener_tareas_con_documentos", async (data, callback) => {
    try {
      const { id_registro } = data;
  
      if (!id_registro) {
        throw new Error("El id_registro es requerido.");
      }
  
      const pool = await getConnection();
      const tareasResult = await pool.request()
        .input("id_registro", sql.VarChar, id_registro)
        .query(`
            SELECT TI.id_tareas, TI.nombre_tarea, TI.estado
            FROM [onlyoffice].[dbo].[Tareas_Instancia] TI
            WHERE TI.id_registro =@id_registro
            AND EXISTS (
                SELECT 1 
                FROM [onlyoffice].[dbo].[Documentos] D
                WHERE D.id_tarea_per = TI.id_tareas
    )
        `);
      const tareas = tareasResult.recordset;
  
      callback({
        success: true,
        data: tareas,
      });
    } catch (err) {
      console.error("❌ Error al obtener tareas:", err.message);
      callback({
        success: false,
        message: "Error al obtener tareas",
        error: err.message,
      });
    }
  });
  

  // 2. Método para obtener documentos de una tarea específica
  socket.on("obtener_documentos_tarea", async (data, callback) => {
    try {
      // Se esperan los parámetros id_registro e id_tarea
      const { id_tarea } = data;
      

      const pool = await getConnection();
      const documentosResult = await pool
        .request()
        .input("id_tarea_per", sql.VarChar, id_tarea)
        .query(`
          SELECT codigo_documento, codigo_almacenamiento, fecha_doc 
          FROM [onlyoffice].[dbo].[Documentos]
          WHERE id_tarea_per = @id_tarea_per
        `);

      callback({
        success: true,
        data: documentosResult.recordset,
      });
    } catch (err) {
      console.error("❌ Error al obtener documentos de la tarea:", err.message);
      callback({
        success: false,
        message: "Error al obtener documentos de la tarea",
        error: err.message,
      });
    }
  });
};

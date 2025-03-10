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
          r.fecha_finalizacion,
          r.estado,
          r.estado_proceso,
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

  // Nuevo método para obtener tareas formateadas para el diagrama de Gantt
  socket.on("obtener_tareas_gantt", async (data, callback) => {
    try {
      const pool = await getConnection();
      
      // Obtener todos los registros (casos)
      const registrosResult = await pool.request().query(`
        SELECT
          r.id_registro AS id,
          CONCAT('Caso ', r.id_registro) AS name,
          r.fecha_registro AS startDate,
          r.fecha_finalizacion AS endDate,
          r.estado AS progress,
          r.estado_proceso AS status
        FROM [onlyoffice].[dbo].[Registros] r
      `);
      
      const casos = registrosResult.recordset;
      
      // Formatar los casos para el diagrama de Gantt
      const formattedTasks = [];
      
      for (const caso of casos) {
        // Convertir fechas a formato de cadena ISO para que React pueda manejarlas correctamente
        const startDateStr = caso.startDate ? caso.startDate.toISOString() : new Date().toISOString();
        const endDateStr = caso.endDate ? caso.endDate.toISOString() : new Date(new Date().getTime() + 86400000 * 5).toISOString();
        
        // Obtener subtareas para este registro
        const tareasResult = await pool.request()
          .input("id_registro", sql.VarChar, caso.id)
          .query(`
            SELECT 
              TI.id_tareas AS id,
              TI.nombre_tarea AS name,
              TI.fecha_inicio AS startDate,
              TI.fecha_fin AS endDate,
              TI.estado AS status
            FROM [onlyoffice].[dbo].[Tareas_Instancia] TI
            WHERE TI.id_registro = @id_registro
          `);
        
        const subtasks = await Promise.all(tareasResult.recordset.map(async (tarea) => {
          // Formatear fechas de tareas como cadenas ISO
          const tareaStartDateStr = tarea.startDate 
            ? tarea.startDate.toISOString() 
            : startDateStr;
          
          const tareaEndDateStr = tarea.endDate 
            ? tarea.endDate.toISOString() 
            : new Date(new Date(tareaStartDateStr).getTime() + 86400000 * 2).toISOString();
          
          // Obtener archivos para esta tarea
          const documentosResult = await pool.request()
            .input("id_tarea_per", sql.VarChar, tarea.id)
            .query(`
              SELECT 
                codigo_documento AS id,
                codigo_almacenamiento AS name,
                codigo_almacenamiento AS path
              FROM [onlyoffice].[dbo].[Documentos]
              WHERE id_tarea_per = @id_tarea_per
            `);
          
          // Agregar files solo si hay documentos
          const files = documentosResult.recordset.length > 0 
            ? documentosResult.recordset 
            : undefined;
          
          return {
            id: `${caso.id}.${tarea.id}`,
            name: tarea.name,
            startDate: tareaStartDateStr,
            endDate: tareaEndDateStr,
            status: tarea.status === 1 ? "En Progreso" : (tarea.status === 2 ? "Completado" : "Iniciado"),
            ...(files && { files })
          };
        }));
        
        formattedTasks.push({
          id: caso.id.toString(),
          name: caso.name,
          startDate: startDateStr,
          endDate: endDateStr,
          progress: caso.progress || 0, // Asegurar que progress siempre tenga un valor
          status: caso.status === "1" ? "En Progreso" : (caso.status === "2" ? "Completado" : "Iniciado"),
          subtasks: subtasks
        });
      }
      
      callback({
        success: true,
        data: formattedTasks
      });
    } catch (err) {
      console.error("❌ Error al obtener tareas para Gantt:", err.message);
      callback({
        success: false,
        message: "Error al obtener tareas para Gantt",
        error: err.message
      });
    }
  });

  // Mantengo los métodos originales para compatibilidad
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
          SELECT TI.id_tareas, TI.nombre_tarea, TI.estado, TI.fecha_inicio, TI.fecha_fin
          FROM [onlyoffice].[dbo].[Tareas_Instancia] TI
          WHERE TI.id_registro = @id_registro;
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
    
  socket.on("obtener_documentos_tarea", async (data, callback) => {
    try {
      const { id_tarea } = data;
              
      const pool = await getConnection();
      const documentosResult = await pool
        .request()
        .input("id_tarea_per", sql.VarChar, id_tarea)
        .query(`
          SELECT codigo_documento, codigo_almacenamiento
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
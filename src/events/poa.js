const { getConnection, sql } = require("../config/Conecction_SQL_Server");

module.exports = (io, socket) => {
    console.log('📌 Evento WebSocket "poa" registrado');
  
    // 🔹 Evento para obtener todos los poa
    socket.on("get_poa", async (callback) => {
      try {
        const pool = await getConnection();
        const result = await pool.request().execute("ObtenerActividades");
        callback({ success: true, data: result.recordset }); // Respuesta con las actividades de POA
      } catch (err) {
        console.error("Error al obtener poa:", err);
        callback({ success: false, message: "Error al obtener poa" });
      }
    });
  
    // 🔹 Evento para agregar una nueva actividad
    socket.on("add_poa", async (poa, callback) => {
      try {
        const {
          nombre_actividad,
          indicador_actividad,
          proyeccion_actividad,
          t1,
          t2,
          t3,
          t4,
          gastos_t_humanos,
          gasto_b_capital,
          total_actividad,
          responsables,
        } = poa;
  
        const pool = await getConnection();
        await pool
          .request()
          .input("nombre_actividad", sql.NVarChar, nombre_actividad)
          .input("indicador_actividad", sql.NVarChar, indicador_actividad)
          .input("proyeccion_actividad", sql.NVarChar, proyeccion_actividad)
          .input("t1", sql.Int, t1)
          .input("t2", sql.Int, t2)
          .input("t3", sql.Int, t3)
          .input("t4", sql.Int, t4)
          .input("gastos_t_humanos", sql.Int, gastos_t_humanos)
          .input("gasto_b_capital", sql.Int, gasto_b_capital)
          .input("total_actividad", sql.Int, total_actividad)
          .input("responsables", sql.NVarChar, JSON.stringify(responsables))
          .execute("InsertarActividadConResponsables");
  
        callback({ success: true, message: "Actividad agregada correctamente" });
      } catch (err) {
        console.error("Error al agregar actividad:", err);
        callback({ success: false, message: "Error al agregar actividad" });
      }
    });
  
    // 🔹 Evento para eliminar una actividad
    socket.on("delete_poa", async (id, callback) => {
      try {
        const pool = await getConnection();
        const result = await pool.request()
          .input("actividad_id", sql.Int, id)
          .execute("EliminarActividad");
  
        if (result.rowsAffected[0] === 0) {
          return callback({
            success: false,
            message: `Actividad con ID ${id} no encontrada.`,
          });
        }
  
        callback({
          success: true,
          message: `Actividad con ID ${id} eliminada correctamente.`,
        });
      } catch (err) {
        console.error("Error al eliminar actividad:", err);
        callback({ success: false, message: "Error al eliminar actividad" });
      }
    });
  
    // 🔹 Evento para actualizar una actividad
    socket.on("update_poa", async (poa, callback) => {
      try {
        const {
          id,
          nombre_actividad,
          indicador_actividad,
          proyeccion_actividad,
          t1,
          t2,
          t3,
          t4,
          gastos_t_humanos,
          gasto_b_capital,
          total_actividad,
          responsables,
        } = poa;
  
        const pool = await getConnection();
        await pool
          .request()
          .input("actividad_id", sql.Int, id)
          .input("nombre_actividad", sql.NVarChar, nombre_actividad)
          .input("indicador_actividad", sql.NVarChar, indicador_actividad)
          .input("proyeccion_actividad", sql.NVarChar, proyeccion_actividad)
          .input("t1", sql.Int, t1)
          .input("t2", sql.Int, t2)
          .input("t3", sql.Int, t3)
          .input("t4", sql.Int, t4)
          .input("gastos_t_humanos", sql.Int, gastos_t_humanos)
          .input("gasto_b_capital", sql.Int, gasto_b_capital)
          .input("total_actividad", sql.Int, total_actividad)
          .input("responsables", sql.NVarChar, JSON.stringify(responsables))
          .execute("EditarActividadConResponsables");
  
        callback({
          success: true,
          message: `Actividad con ID ${id} actualizada correctamente.`,
        });
      } catch (err) {
        console.error("Error al actualizar actividad:", err);
        callback({ success: false, message: "Error al actualizar actividad" });
      }
    });
  };  
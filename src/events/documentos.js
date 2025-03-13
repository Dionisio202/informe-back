const { getConnection, sql } = require("../config/Conecction_SQL_Server");
// Variables de entorno
require("dotenv").config();

module.exports = (io, socket) => {
  console.log('📌 Evento WebSocket "patente" registrado');

  socket.on("obtener_registro", async (data, callback) => {
    try {
      const pool = await getConnection();
      
      // Obtener todos los registros con sus facultades y carreras
      const registrosResult = await pool.request().query(`
   SELECT
  r.id_registro AS id,
  SUBSTRING(r.id_registro, CHARINDEX('-', r.id_registro) + 1, LEN(r.id_registro)) AS numero,
  r.fecha_registro AS fechaInicio,
  r.fecha_finalizacion AS fechaFin,
  r.estado AS progreso,
  r.estado_proceso AS estado,
  p.name AS nombre_registro,
  u.Nombre AS funcionario,
  pro.nombre AS nombre,
  tpro.nombre AS tipoProducto,
  tp.nombre AS tipoProyecto,  -- Fixed: Get type name from TipoProyectos
  fcFac.abreviatura AS facultad,
  fcCar.nombre AS carrera
FROM [onlyoffice].[dbo].[Registros] r
INNER JOIN [onlyoffice].[dbo].[Procesos] p 
  ON r.id_proceso = p.id
INNER JOIN [onlyoffice].[dbo].[Usuarios] u 
  ON r.id_funcionario = u.Id
INNER JOIN [onlyoffice].[dbo].[Productos] pro
  ON r.id_registro = pro.id_registro_per
INNER JOIN [onlyoffice].[dbo].[Tipos_productos] tpro
  ON pro.id_tipo = tpro.id_tipo_producto
INNER JOIN [onlyoffice].[dbo].[Proyectos] proyectos
  ON r.id_proyecto = proyectos.id_proyecto
-- Added join to get project type name
INNER JOIN [onlyoffice].[dbo].[TipoProyectos] tp  
  ON proyectos.id_tipo = tp.id  -- Link via id_tipo
INNER JOIN [onlyoffice].[dbo].[Detalle_autor_producto] daup
  ON pro.id_producto = daup.id_producto
INNER JOIN [onlyoffice].[dbo].[Personas] per
  ON daup.id_autor = per.id_persona
INNER JOIN [onlyoffice].[dbo].[FacultadesCarreras] fcCar
  ON per.id_facultad_carrera = fcCar.ID
LEFT JOIN [onlyoffice].[dbo].[FacultadesCarreras] fcFac
  ON fcCar.id_padre = fcFac.ID;
      `);
      
      // Agrupar los resultados por ID de registro
      const registrosMap = new Map();
      
      for (const row of registrosResult.recordset) {
        const id = row.id.toString();
        
        // Si es la primera vez que vemos este ID, inicializamos su entrada
        if (!registrosMap.has(id)) {
          // Capitalizar el estado si es "iniciado"
          let estado = row.estado;
          if (estado === "iniciado") {
            estado = "Iniciado";
          }
          
          registrosMap.set(id, {
            id: id,
            numero: row.numero,
            nombre: row.nombre,
            tipoProducto: row.tipoProducto,
            tipoProyecto: row.tipoProyecto,
            funcionario: row.funcionario,
            estado: estado, // Usar el estado potencialmente capitalizado
            progreso: row.progreso ? parseInt(row.progreso) : 0,
            fechaInicio: row.fechaInicio ? row.fechaInicio.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            fechaFin: row.fechaFin ? row.fechaFin.toISOString().split('T')[0] : null,
            facultadesMap: new Map(), // Mapa temporal para agrupar carreras por facultad
            subtareas: [] // Se llenarán después
          });
        }
        
        // Añadir la facultad y carrera
        const registro = registrosMap.get(id);
        const facultad = row.facultad || 'Sin Facultad';
        const carrera = row.carrera;
        
        if (!registro.facultadesMap.has(facultad)) {
          registro.facultadesMap.set(facultad, new Set());
        }
        
        registro.facultadesMap.get(facultad).add(carrera);
      }
      
      // Obtener y asignar subtareas para cada registro
      const formattedTasks = [];
      
      for (const [id, registro] of registrosMap.entries()) {
        // Convertir el mapa de facultades a la estructura de array deseada
        const facultades = [];
        registro.facultadesMap.forEach((carreras, nombreFacultad) => {
          facultades.push({
            nombre: nombreFacultad,
            carreras: Array.from(carreras)
          });
        });
        
        // Reemplazar el mapa con el array
        delete registro.facultadesMap;
        registro.facultades = facultades;
        
        // Obtener subtareas para este registro
        const tareasResult = await pool.request()
          .input("id_registro", sql.VarChar, id)
          .query(`
            SELECT 
              TI.id_tareas AS id,
              TI.nombre_tarea AS nombre,
              TI.fecha_inicio AS fechaInicio,
              TI.fecha_fin AS fechaFin,
              TI.estado AS estado
            FROM [onlyoffice].[dbo].[Tareas_Instancia] TI
            WHERE TI.id_registro = @id_registro
          `);
        
        const subtareas = await Promise.all(tareasResult.recordset.map(async (tarea) => {
          
          // Formatear fechas de tareas como cadenas ISO
          const tareaStartDateStr = tarea.fechaInicio 
            ? tarea.fechaInicio.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          const tareaEndDateStr = tarea.fechaFin 
            ? tarea.fechaFin.toISOString().split('T')[0]
            : new Date(new Date(tareaStartDateStr).getTime() + 86400000 * 2).toISOString().split('T')[0];
          
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
          
          // Agregar archivos solo si hay documentos
          const archivos = documentosResult.recordset.length > 0 
            ? documentosResult.recordset 
            : undefined;
          
          return {
            id: `${id}.${tarea.id}`,
            nombre: tarea.nombre,
            fechaInicio: tareaStartDateStr,
            fechaFin: tareaEndDateStr,
            estado: tarea.estado,
            ...(archivos && { archivos })
          };
        }));
        
        registro.subtareas = subtareas;
        formattedTasks.push(registro);
      }
      
      callback({
        success: true,
        data: formattedTasks
      });
    } catch (err) {
      console.error("❌ Error al obtener registros:", err.message);
      callback({
        success: false,
        message: "Error al obtener registros",
        error: err.message
      });
    }
  });
};
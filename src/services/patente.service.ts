const { getConnection, sql } = require("../config/Conecction_SQL_Server");
import {
  Registro,
  Proceso,
  ProductoDatos,
  Documento,
} from "../interfaces/patente.interfaces";
// Obtener Autoridades
export const getAutoridades = async () => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener las autoridades
    const result = await pool.request().query("SELECT * FROM Autoridades");
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};
export const getTiposProductos = async () => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener las autoridades
    const result = await pool.request().query("SELECT * FROM Tipos_Productos");
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};

export const insertProceso = async (
  proceso: Proceso
): Promise<{ success: boolean; message: string }> => {
  try {
    const { id_proceso, nombre_proceso } = proceso;
    const pool = await getConnection();

    await pool
      .request()
      .input("id_proceso", sql.BigInt, id_proceso)
      .input("nombre_proceso", sql.VarChar, nombre_proceso).query(`
          MERGE INTO Procesos AS target
          USING (VALUES (@id_proceso, @nombre_proceso)) 
          AS source (id, name)
          ON target.id = source.id
          WHEN NOT MATCHED THEN
              INSERT (id, name, description)
              VALUES (source.id, source.name, NULL);
        `);

    console.log("Proceso registrado/verificado correctamente");
    return {
      success: true,
      message: "Proceso registrado/verificado correctamente",
    };
  } catch (err) {
    console.error("Error al registrar/verificar el proceso:", err);
    return {
      success: false,
      message: "Error al registrar/verificar el proceso",
    };
  }
};

export const insertRegistro = async (
  registro: Registro
): Promise<{ success: boolean; message: string }> => {
  try {
    const { id_funcionario, id_proceso, id_caso } = registro;
    const id_registro = `${id_proceso}-${id_caso}`;

    if (!id_funcionario) {
      return { success: false, message: "El id_funcionario es obligatorio" };
    }

    const pool = await getConnection();

    await pool
      .request()
      .input("id_funcionario", sql.Int, id_funcionario)
      .input("id_registro", sql.VarChar, id_registro)
      .input("id_proceso", sql.BigInt, id_proceso).query(`
          MERGE INTO Registros AS target
          USING (VALUES (@id_funcionario, @id_registro, @id_proceso)) 
          AS source (id_funcionario, id_registro, id_proceso)
          ON target.id_registro = source.id_registro AND target.id_proceso = source.id_proceso
          WHEN NOT MATCHED THEN
              INSERT (id_funcionario, fecha_registro, fecha_finalizacion, estado, id_autoridad, estado_proceso, id_registro, id_proceso)
              VALUES (source.id_funcionario, GETDATE(), NULL, 0.00, NULL, 'iniciado', source.id_registro, source.id_proceso);
        `);

    console.log("Registro creado/verificado correctamente");
    return {
      success: true,
      message: "Registro creado/verificado correctamente",
    };
  } catch (err) {
    console.error("Error al registrar/verificar el registro:", err);
    return {
      success: false,
      message: "Error al registrar/verificar el registro",
    };
  }
};

export const insertProductoDatos = async (
  data: ProductoDatos
): Promise<{ success: boolean; message: string }> => {
  try {
    const { id_registro, jsonProductos, memorando } = data;

    if (!id_registro || !jsonProductos || !memorando) {
      return { success: false, message: "Todos los campos son obligatorios" };
    }

    const datosDocumento = JSON.parse(jsonProductos);

    const jsonData = JSON.stringify({
      id_registro,
      productos: datosDocumento.productos,
      autoridad: {
        nombre: datosDocumento.solicitante.nombre,
        Rol: datosDocumento.solicitante.cargo,
        facultad: "definir en el formato",
      },
      proyecto: {
        nombre: datosDocumento.proyecto.titulo,
        codigo: datosDocumento.proyecto.resolucion.numero,
      },
      memorando,
    });

    const pool = await getConnection();
    await pool
      .request()
      .input("json", sql.NVarChar, jsonData)
      .query(`EXEC InsertarRegistroConDatos @json`);

    console.log("Datos procesados correctamente");
    return { success: true, message: "Datos procesados correctamente" };
  } catch (err) {
    console.error("Error al procesar los datos:", err);
    return { success: false, message: "Error al procesar los datos" };
  }
};

// Guardado de documentos en la base de datos
export const saveDocument = async (
  documento: Documento
): Promise<{ success: boolean; message: string }> => {
  const {
    id_registro,
    codigo_documento,
    id_tipo_documento,
    codigo_almacenamiento,
  } = documento;
  try {
    const pool = await getConnection();

    // Verificar si el codigo_documento ya existe en la base de datos
    const existingDocument = await pool
      .request()
      .input("codigo_documento", sql.VarChar(100), codigo_documento).query(`
          SELECT COUNT(*) AS count
          FROM Documentos
          WHERE codigo_documento = @codigo_documento
        `);

    if (existingDocument.recordset[0].count > 0) {
      console.log("⚠️ El documento con el código ya existe.");
      return {
        success: false,
        message: "El documento con el código ya existe en la base de datos",
      };
    }

    // Si no existe, proceder a insertar el nuevo registro
    await pool
      .request()
      .input("id_registro_per", sql.VarChar(50), id_registro)
      .input("codigo_almacenamiento", sql.VarChar(100), codigo_almacenamiento)
      .input("codigo_documento", sql.VarChar(100), codigo_documento)
      .input("id_tipo_documento", sql.Int, id_tipo_documento).query(`
          INSERT INTO Documentos (id_registro_per, codigo_almacenamiento, codigo_documento, id_tipo_documento) 
          VALUES (@id_registro_per, @codigo_almacenamiento, @codigo_documento, @id_tipo_documento)
        `);

    console.log("✅ Datos insertados en la base de datos");
    return {
      success: true,
      message: "Documento guardado e información insertada en la BD",
    };
  } catch (dbError) {
    console.error(dbError);
    return { success: false, message: "Error al guardar los datos en la BD" };
  }
};

export const updateDocument = async (
  documento: Documento
): Promise<{ success: boolean; message: string }> => {
  const {
    codigo_documento,
    codigo_almacenamiento,
  } = documento;

  try {
    const pool = await getConnection();

    await pool
      .request()
      .input("codigo_almacenamiento", sql.VarChar(100), codigo_almacenamiento)
      .input("codigo_documento", sql.VarChar(100), codigo_documento)
      .query(`
          UPDATE Documentos
          SET 
            codigo_documento = @codigo_documento
          WHERE codigo_almacenamiento = @codigo_almacenamiento
        `);
    console.log("✅ Documento actualizado en la base de datos");
    return {
      success: true,
      message: "Documento actualizado correctamente en la BD",
    };
  } catch (dbError) {
    console.error(dbError);
    return { success: false, message: "Error al actualizar el documento en la BD" };
  }
};
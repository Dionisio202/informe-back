const { getConnection, sql } = require("../config/Conecction_SQL_Server");
import {
  Registro,
  Proceso,
  ProductoDatos,
  Documento,
} from "../interfaces/patente.interfaces";
import { DatabaseResponse } from "../interfaces/database.interfaces";
const {similarityPercentage} = require("../utils/levenshtein.js");
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
    // Si jsonProductos es un string, lo parseamos; de lo contrario, lo usamos directamente.
    const datosDocumento =
      typeof jsonProductos === "string"
        ? JSON.parse(jsonProductos)
        : jsonProductos;
    // Asegurarse de que "productos" sea un objeto (si llegara a ser string, se parsea)
    const productos =
      typeof datosDocumento.productos === "string"
        ? JSON.parse(datosDocumento.productos)
        : datosDocumento.productos;
    //Obtener un solo producto
    let producto = await obtenerSiguienteProducto(memorando, productos);
    if (!producto) {
      return {
        success: false,
        message: "Ya se registraron todos los productos",
      };
    }
    producto.tipo = datosDocumento.tipo;
    // Construir el objeto final que se enviará al SP
    const jsonData = JSON.stringify({
      id_registro,
      productos: [producto],
      autoridad: {
        nombre: datosDocumento.solicitante.nombre,
        Rol: datosDocumento.solicitante.rol,
        facultad: datosDocumento.solicitante.facultad,
      },
      proyecto: {
        nombre: datosDocumento.proyecto.titulo,
        codigo: datosDocumento.proyecto.resolucion.numero,
        tipo: datosDocumento.proyecto.tipo,
      },
      memorando,
      tipo: 1,
    });

    const pool = await getConnection();
    await pool
      .request()
      .input("json", sql.NVarChar, jsonData)
      .query(`EXEC DecidirOperacionRegistro @json`);
    return { success: true, message: "Datos procesados correctamente" };
  } catch (err) {
    console.error("Error al procesar los datos:", err);
    return { success: false, message: "Error al procesar los datos" };
  }
};

//Precedimiento Temporal
const obtenerSiguienteProducto = async (
  memorando: string,
  productos: any[]
): Promise<any | null> => {
  try {
    if (!memorando || !productos || productos.length === 0) {
      return null;
    }

    const pool = await getConnection();

    // Obtener los productos ya registrados con ese memorando
    const result = await pool
      .request()
      .input("memorando", sql.NVarChar, memorando).query(`
        SELECT DISTINCT p.nombre 
        FROM Productos p
        JOIN Documentos d ON p.id_registro_per = d.id_registro_per
        WHERE d.codigo_documento = @memorando
      `);

    const productosRegistrados = result.recordset.map((row: any) => row.nombre);

    // Encontrar el primer producto que no esté registrado
    const productoNuevo = productos.find(
      (producto) => !productosRegistrados.includes(producto.nombre)
    );
    if (!productoNuevo) {
      return null;
    }
    return productoNuevo;
  } catch (err) {
    return null;
  }
};

export const obtenerProductosConIndicador = async (
  memorando: string,
  productos: any[]
): Promise<any[]> => {
  try {
    if (!memorando || !productos?.length) return [];

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("memorando", sql.NVarChar, memorando)
      .execute("ObtenerProductosConIndicador");

    const productosRegistrados = result.recordset;

    // Combinar con la lista original y asignar indicador 0 a los no registrados
    return productos.map((producto) => {
      const encontrado = productosRegistrados.find(
        (pr:any) => pr.nombre === producto.nombre
      );
      return {
        ...producto,
        indicador: encontrado ? encontrado.indicador : 0, // 0 si no existe
      };
    });
  } catch (err) {
    console.error("Error al obtener productos:", err);
    return [];
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
    id_tarea_per,
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
      .input("id_tipo_documento", sql.Int, id_tipo_documento)
      .input("id_tarea_per", sql.VarChar(100), id_tarea_per).query(`
          INSERT INTO Documentos (id_registro_per, codigo_almacenamiento, codigo_documento, id_tipo_documento,id_tarea_per, fecha_doc) 
          VALUES (@id_registro_per, @codigo_almacenamiento, @codigo_documento, @id_tipo_documento,@id_tarea_per, GETDATE())
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
  const { codigo_documento, codigo_almacenamiento } = documento;

  try {
    const pool = await getConnection();

    await pool
      .request()
      .input("codigo_almacenamiento", sql.VarChar(100), codigo_almacenamiento)
      .input("codigo_documento", sql.VarChar(100), codigo_documento).query(`
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
    return {
      success: false,
      message: "Error al actualizar el documento en la BD",
    };
  }
};

export const getRegistrosDatos = async (): Promise<{
  success: boolean;
  message: string;
  data: any[];
}> => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT 
          p.nombre AS nombre_producto,
          r.fecha_registro,
          r.fecha_finalizacion,
          r.estado,
          r.estado_proceso,
          f.Nombre AS facultad, 
          r.id_registro
      FROM Registros r
      JOIN Productos p ON p.id_registro_per = r.id_registro
      JOIN Personas per ON per.id_persona = r.id_funcionario
      JOIN FacultadesCarreras f ON f.ID = per.id_facultad_carrera;`);
    return {
      success: true,
      message: "Datos Extraidos con Exito",
      data: result.recordset,
    };
  } catch (dbError) {
    console.error(dbError);
    return {
      success: false,
      message: "Error al extraer datos",
      data: [],
    };
  }
};

export const getFacultadesCarreras = async () => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener las Facultades y Carreras
    const result = await pool
      .request()
      .query("EXEC ObtenerFacultadesYCarreras");
    return { success: true, data: result.recordset[0].ResultadoJSON };
  } catch (error) {
    return { success: false, error: error };
  }
};

export const getRolFacultadCarrerabyname = async (nombres: string[]) => {
  try {
    const pool = await getConnection();

    // Convertir el array de nombres en JSON
    const jsonNombres = JSON.stringify({ nombres });

    // Ejecutar el procedimiento almacenado
    const result = await pool
      .request()
      .input("jsonNombres", sql.NVarChar, jsonNombres)
      .execute("ObtenerRolFacultadCarreraPorNombre");

    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};


export const getRoles = async () => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener los roles
    const result = await pool.request().query("SELECT * FROM RolPersona");
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};

export const getProductobyRegistro = async (id_registro: string) => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener los roles
    const result = await pool
      .request()
      .input("id_registro", sql.VarChar, id_registro)
      .query("EXEC ObtenerProductosPorRegistro @id_registro");
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};

export const getTiposProyecto = async () => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener los tipos de proyectos
    const result = await pool.request().query("SELECT * FROM TipoProyectos");
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};

export const getRegistroData = async (id_registro: string) => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener los datos del registro
    const result = await pool
      .request()
      .input("id_registro", sql.VarChar, id_registro)
      .query("EXEC ObtenerDatosRegistro @id_registro");
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, error: error };
  }
};

export const getRegistroEnCurso = async (id_registro: string): Promise<DatabaseResponse<boolean>> => {
  try {
    // Obtener la conexión a la base de datos
    const pool = await getConnection();
    // Ejecutar la consulta para obtener el estado del registro
    const result = await pool
      .request()
      .input("id_registro", sql.VarChar, id_registro)
      .query(`
        SELECT CASE 
          WHEN EXISTS (SELECT 1 FROM Productos WHERE id_registro_per = @id_registro)
          THEN 'true'
          ELSE 'false'
        END AS en_curso
      `);
    const en_curso = result.recordset[0]?.en_curso === 'true';
    return { success: true, data: en_curso, message: "Consulta ejecutada correctamente" };
  } catch (error) {
    return { success: false, error: error, message: "Error en la consulta" };
  }
};

// Función que, para cada nombre de facultad en el arreglo, retorna la(s) facultad(es) coincidentes
const getFacultadesCarrerasbyNombreFacultad = async (nombres: string[]) => {
  try {
    const carrerasResponse = await getFacultadesCarreras();
    if (!carrerasResponse.success) {
      throw new Error("Error al obtener facultades y carreras");
    }

    let carrerasData: any;
    // Verificar si la respuesta contiene un único registro con 'ResultadoJSON'
    if (
      carrerasResponse.data.length === 1 &&
      carrerasResponse.data[0].ResultadoJSON
    ) {
      carrerasData = JSON.parse(carrerasResponse.data[0].ResultadoJSON);
    } else {
      carrerasData = carrerasResponse.data;
    }

    // Ajusta el umbral de similitud según tus necesidades (por ejemplo, 80%)
    const umbral = 80;

    // Para cada nombre enviado, buscar las facultades que cumplan el criterio
    const resultados = nombres.map((nombre) => {
      // Se obtienen todas las facultades que superen el umbral de similitud
      const facultadesCoincidentes = carrerasData.filter((facultad: any) => {
        const porcentaje = similarityPercentage(
          nombre,
          facultad.nombre_facultad // Asegúrate de que este campo coincide con el de tu BD
        );
        return porcentaje >= umbral;
      });
      return { nombreBuscado: nombre, facultades: facultadesCoincidentes };
    });

    return { success: true, data: resultados };
  } catch (error: any) {
    return { success: false, error: error.message || error };
  }
};
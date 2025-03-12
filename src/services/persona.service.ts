const { getConnection, sql } = require("../config/Conecction_SQL_Server");
import { DatabaseResponse } from "../interfaces/database.interfaces";
import { Persona, Autor } from "../interfaces/persona.interfaces";

// Obtener todas las personas
export const getPersonas = async (): Promise<DatabaseResponse<Persona[]>> => {
  try {
    const pool = await getConnection();
    // Ejecutar la consulta para obtener las personas
    const result = await pool.request().query("SELECT * FROM Personas");
    return { success: true, data: result.recordset, message: "Personas obtenidas correctamente de la BD" };
  } catch (error) {
    return { success: false, error: error, message: "Error al obtener las personas de la BD" };
  }
};

// Obtener los autores de un registro - producto
export const getAutoresByRegistro = async (id_registro: string): Promise<DatabaseResponse<Autor[]>> => {
    try {
      const pool = await getConnection();
      // Ejecuta el procedimiento almacenado pasando el id_registro como parámetro
      const result = await pool.request()
        .input("id_registro", sql.VarChar, id_registro)
        .query("EXEC ObtenerAutoresPorRegistro @id_registro");
        
      return { success: true, data: result.recordset, message: "Autores del registro obtenidos correctamente" };
    } catch (error) {
      console.error("Error al obtener autores del registro:", error);
      return { success: false, error: error, message: "Error al obtener los autores del registro" };
    }
};


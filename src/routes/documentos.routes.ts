import express from "express";
import fs from "fs";
import path from "path";
import http from "http";
import { saveDocument, updateDocument } from "../services/patente.service";
const { getConnection, sql } = require("../config/Conecction_SQL_Server.js");

const router = express.Router();

//Ruta de prueba HTTP
router.get("/prueba", (req, res) => {
  res.send("Hello World! document");
});

// 📂 Ruta para descargar un documento
router.get("/document", (req: any, res: any) => {
  const nombre = req.query.nombre as string;

  if (!nombre) {
    return res.status(400).send("Debe proporcionar un nombre de documento.");
  }

  const filePath = path.join('/app/documents',nombre);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(filePath);
    console.log(`Documento ${nombre} enviado correctamente`);
  } else {
    res.status(404).send("El documento no existe");
  }
});



// Ruta para guardar un documento
router.post('/save-document', (req:any, res:any) => {
  console.log('📥 Datos recibidos en el callback-save:', req.body); // <-- Agrega esto

  if (!req.body || !req.body.url || !req.body.key) {
      console.error('❌ Datos inválidos recibidos:', req.body);
      return res.status(400).json({ error: 'Datos inválidos recibidos' });
  }

  const filePath = path.join('/app/documents', `${req.body.key}.docx`);
  const file = fs.createWriteStream(filePath);

  http.get(req.body.url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
          file.close(() => {
              console.log('✅ Documento guardado correctamente:', filePath);
              res.status(200).json({ message: 'Documento guardado correctamente' }); // 🔹 JSON en lugar de string
          });
      });
  }).on('error', (err) => {
      console.error('❌ Error al descargar el documento:', err);
      res.status(500).json({ error: 'Error al guardar el documento' }); // 🔹 JSON en lugar de string
  });
});


router.get("/verificar-documento", async (req, res) => {
  const { key, nombre, id_registro_per, id_tipo_documento } = req.query;

  if (!key) {
    return res.status(400).json({ error: "El parámetro 'key' es obligatorio" });
  }
  if (!nombre) {
    return res.status(400).json({ error: "El parámetro 'nombre' es obligatorio" });
  }

  try {
    let pool = await getConnection();
    let checkResult = await pool
      .request()
      .input("codigo_almacenamiento", sql.VarChar(100), key)
      .query("SELECT COUNT(*) AS count FROM Documentos WHERE codigo_almacenamiento = @codigo_almacenamiento");

    const documentExists = checkResult.recordset[0].count > 0;
    console.log("🔍 Documento encontrado en la BD:", documentExists);

    if (!documentExists) {
      // Validamos que se hayan enviado los parámetros necesarios para insertar el documento en la BD
      if (!id_registro_per || !id_tipo_documento) {
        return res.status(400).json({ error: "Los parámetros 'id_registro_per' y 'id_tipo_documento' son obligatorios para generar un nuevo documento." });
      }

      // Ruta del documento base (plantilla) y del nuevo documento a generar
      const baseFilePath = path.join('/app/documents/templates', nombre);
      const newFilePath = path.join('/app/documents', `${key}.docx`);

      // Verifica que el documento base exista
      if (!fs.existsSync(baseFilePath)) {
        return res.status(404).json({ error: "El documento base no se encontró", baseFile: baseFilePath });
      }

      // Copia el documento base para generar el nuevo documento
      await fs.promises.copyFile(baseFilePath, newFilePath);

      // Insertamos el registro en la base de datos, tal como se realiza en el endpoint POST
      await pool.request()
        .input("id_registro_per", sql.VarChar(50), id_registro_per)
        .input("codigo_almacenamiento", sql.VarChar(100), key)
        .input("id_tipo_documento", sql.Int, id_tipo_documento)
        .query(`
          INSERT INTO Documentos (id_registro_per, codigo_almacenamiento, id_tipo_documento) 
          VALUES (@id_registro_per, @codigo_almacenamiento, @id_tipo_documento)
        `);

      return res.status(201).json({ 
        message: "Documento no encontrado. Se ha generado un nuevo documento basado en la plantilla y se ha almacenado en la BD.",
        filePath: newFilePath
      });
    }

    res.status(200).json({ exists: documentExists });
  } catch (error:any) {
    console.error("❌ Error en la BD:", error.message, error.stack);
    res.status(500).json({ error: "Error al verificar el documento en la BD", details: error.message });
  }
});

router.get("/verificar-documento", async (req, res) => {
  const { key, nombre, id_registro_per, id_tipo_documento } = req.query;

  if (!key) {
    return res.status(400).json({ error: "El parámetro 'key' es obligatorio" });
  }
  if (!nombre) {
    return res.status(400).json({ error: "El parámetro 'nombre' es obligatorio" });
  }

  try {
    let pool = await getConnection();
    let checkResult = await pool
      .request()
      .input("codigo_almacenamiento", sql.VarChar(100), key)
      .query("SELECT COUNT(*) AS count FROM Documentos WHERE codigo_almacenamiento = @codigo_almacenamiento");

    const documentExists = checkResult.recordset[0].count > 0;
    console.log("🔍 Documento encontrado en la BD:", documentExists);

    if (!documentExists) {
      // Validamos que se hayan enviado los parámetros necesarios para insertar el documento en la BD
      if (!id_registro_per || !id_tipo_documento) {
        return res.status(400).json({ error: "Los parámetros 'id_registro_per' y 'id_tipo_documento' son obligatorios para generar un nuevo documento." });
      }

      // Ruta del documento base (plantilla) y del nuevo documento a generar
      const baseFilePath = path.join('/app/documents/templates', nombre);
      const newFilePath = path.join('/app/documents', `${key}.docx`);

      // Verifica que el documento base exista
      if (!fs.existsSync(baseFilePath)) {
        return res.status(404).json({ error: "El documento base no se encontró", baseFile: baseFilePath });
      }

      // Copia el documento base para generar el nuevo documento
      await fs.promises.copyFile(baseFilePath, newFilePath);

      // Insertamos el registro en la base de datos, tal como se realiza en el endpoint POST
      await pool.request()
        .input("id_registro_per", sql.VarChar(50), id_registro_per)
        .input("codigo_almacenamiento", sql.VarChar(100), key)
        .input("id_tipo_documento", sql.Int, id_tipo_documento)
        .query(`
          INSERT INTO Documentos (id_registro_per, codigo_almacenamiento, id_tipo_documento) 
          VALUES (@id_registro_per, @codigo_almacenamiento, @id_tipo_documento)
        `);

      return res.status(201).json({ 
        message: "Documento no encontrado. Se ha generado un nuevo documento basado en la plantilla y se ha almacenado en la BD.",
        filePath: newFilePath
      });
    }

    res.status(200).json({ exists: documentExists });
  } catch (error:any) {
    console.error("❌ Error en la BD:", error.message, error.stack);
    res.status(500).json({ error: "Error al verificar el documento en la BD", details: error.message });
  }
});


////guardar un documento 

router.post("/get-document", async (req, res) => {
  const { nombre, id_registro_per, id_tipo_documento, document ,memorando} = req.body;


  if (!nombre) {
    return res.status(400).json({ error: "El parámetro 'nombre' es obligatorio" });
  }
  if (!id_registro_per) {
    return res.status(400).json({ error: "El parametro id_regsitro es obligatorio" });
  }
  if (!document) {
    return res.status(400).json({ error: "El parámetro 'document' es obligatorio" });
  }

  try {
    let pool = await getConnection();
    let checkResult = await pool
      .request()
      .input("codigo_almacenamiento", sql.VarChar(100), nombre)
      .query("SELECT COUNT(*) AS count FROM Documentos WHERE codigo_almacenamiento = @codigo_almacenamiento");

    const documentExists = checkResult.recordset[0].count > 0;
    console.log("🔍 Documento encontrado en la BD:", documentExists);

    if (!documentExists) {
      // Validamos que se hayan enviado los parámetros necesarios para insertar el documento en la BD
      if (!id_registro_per || !id_tipo_documento) {
        return res.status(400).json({ error: "Los parámetros 'id_registro_per' y 'id_tipo_documento' son obligatorios para generar un nuevo documento." });
      }

      // Decodificar el documento recibido (se asume que viene en base64)
      const documentBuffer = Buffer.from(document, 'base64');

      // Construir el nuevo nombre del archivo combinando el nombre original y la key
      const newFileName = `${nombre}.pdf`;
      const newFilePath = path.join('/app/documents', newFileName);

      // Guardar el documento recibido en el sistema de archivos
      await fs.promises.writeFile(newFilePath, documentBuffer);

      // Insertar el registro en la base de datos
      await pool.request()
        .input("id_registro_per", sql.VarChar(50), id_registro_per)
        .input("codigo_almacenamiento", sql.VarChar(100),nombre)
        .input("id_tipo_documento", sql.Int, id_tipo_documento)
        .input("codigo_documento", sql.VarChar(100), memorando)
        .query(`
          INSERT INTO Documentos (id_registro_per, codigo_almacenamiento, id_tipo_documento,codigo_documento) 
          VALUES (@id_registro_per, @codigo_almacenamiento, @id_tipo_documento,@codigo_documento)
        `);

      return res.status(201).json({ 
        message: "Documento no encontrado. Se ha recibido y almacenado un nuevo documento.",
        filePath: newFilePath
      });
    }

    res.status(200).json({ exists: documentExists });
  } catch (error:any) {
    console.error("❌ Error en la BD:", error.message, error.stack);
    res.status(500).json({ error: "Error al verificar el documento en la BD", details: error.message });
  }
});


router.get("/save-memorando", async (req, res) => {
  const { key, id_tipo_documento ,id_registro} = req.query;

  if (!key) {
    return res.status(400).json({ error: "El parámetro 'key' es obligatorio" });
  }
  if (!id_tipo_documento) {
    return res.status(400).json({ error: "El parámetro 'id_tipo_documento' es obligatorio" });
  }
  await saveDocument({
    id_registro: id_registro,
    id_tipo_documento: id_tipo_documento,
    codigo_documento: key,
    id_documento: "",
    codigo_almacenamiento: "",
    id_docuemnto_per: ""
  });

  });

  // Ruta para obtener el codigo de documentos
  router.get("/get-document-code", async (req, res) => {
    try {
      const { id_registro, id_tipo_documento } = req.query; // Usar req.query en GET
      if (!id_registro || !id_tipo_documento) {
        return res.status(400).json({ success: false, message: "Faltan parámetros" });
      }
  
      const pool = await getConnection();
      const result = await pool
        .request()
        .input("id_registro_per", sql.VarChar, id_registro)
        .input("id_tipo_documento", sql.Int, id_tipo_documento)
        .query(`
          SELECT TOP 1 codigo_almacenamiento
          FROM Documentos 
          WHERE id_registro_per = @id_registro_per
          AND id_tipo_documento = @id_tipo_documento
          ORDER BY id_documento DESC;
        `);
  
      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No se encontraron documentos",
        });
      }
  
      res.json({
        success: true,
        message: "Documento encontrado correctamente",
        jsonData: result.recordset[0].codigo_almacenamiento,
      });
    } catch (err) {
      console.error("Error al obtener el código de almacenamiento:", err);
      res.status(500).json({
        success: false,
        message: "Error al obtener el estado temporal",
      });
    }
  });

  router.get("/update-document", async (req, res) => {
    const { codigo_documento, codigo_almacenamiento } = req.query;
    if (!codigo_almacenamiento) {
      return res.status(400).json({ error: "El parámetro 'id_tipo_documento' es obligatorio" });
    }
    await updateDocument({
      codigo_documento: codigo_documento,
      codigo_almacenamiento: "",
    });
  });
  
export default router;


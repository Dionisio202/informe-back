import express from "express";
import fs from "fs";
import path from "path";
import http from "http";
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

  const filePath = path.join(__dirname, "../documents", nombre);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(filePath);
    console.log(`Documento ${nombre} enviado correctamente`);
  } else {
    res.status(404).send("El documento no existe");
  }
});

// 📂 Ruta para guardar un documento
router.post("/save-document", async (req, res) => {
  console.log("📥 Datos recibidos en el callback:", req.body);

  if (
    !req.body ||
    !req.body.url ||
    !req.body.key ||
    !req.body.id_registro_per ||
    !req.body.codigo ||
    !req.body.id_tipo_documento
  ) {
    console.error("❌ Datos inválidos recibidos:", req.body);
    return res.status(400).json({ error: "Datos inválidos recibidos" });
  }

  const { id_registro_per, codigo } = req.body.key;
  const { id_tipo_documento } = req.body;

  // Definir la ruta del archivo
  const filePath = path.join(__dirname, "documents", `${codigo}.docx`);
  const file = fs.createWriteStream(filePath);

  try {
    // Descargar el archivo desde la URL
    http
      .get(req.body.url, (response) => {
        response.pipe(file);
        file.on("finish", async () => {
          file.close();
          console.log("✅ Documento guardado correctamente:", filePath);
          // Guardar la información en SQL Server
          try {
            let pool = await sql.connect(getConnection());
            let result = await pool
              .request()
              .input("id_registro_per", sql.VarChar(50), id_registro_per)
              .input("codigo_almacenamiento", sql.VarChar(100), filePath)
              .input("codigo_documento", sql.VarChar(100), codigo)
              .input("id_tipo_documento", sql.Int, id_tipo_documento).query(`
                            INSERT INTO Documentos (id_registro_per, codigo_almacenamiento, codigo_documento, id_tipo_documento) 
                            VALUES (@id_registro_per, @codigo_almacenamiento, @codigo_documento, @id_tipo_documento)
                        `);

            console.log("✅ Datos insertados en la base de datos");
            res
              .status(200)
              .json({
                message: "Documento guardado e información insertada en la BD",
              });
          } catch (dbError) {
            console.error("❌ Error al insertar en la base de datos:", dbError);
            res
              .status(500)
              .json({ error: "Error al guardar los datos en la BD" });
          }
        });
      })
      .on("error", (err) => {
        console.error("❌ Error al descargar el documento:", err);
        res.status(500).json({ error: "Error al guardar el documento" });
      });
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    res.status(500).json({ error: "Error inesperado en el servidor" });
  }
});

export default router;
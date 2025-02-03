import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// Ruta para obtener un documento
app.get('/api/document', (req, res) => {
    const filePath = path.join(__dirname, 'documents', 'test-document.docx');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
      console.log('Documento enviado correctamente y d');
    } else {
      res.status(404).send('El documento no existe');
    }
  });
  
// Ruta para guardar un documento
app.post('/api/save-document', (req, res) => {
  console.log('Datos recibidos:', req.body);  // Agrega esta línea para inspeccionar los datos
  const filePath = path.join(__dirname, 'documents', 'saved-document.docx');
  const documentData = req.body;

  if (documentData?.url) {
      const file = fs.createWriteStream(filePath);
      const request = http.get(documentData.url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
              file.close(() => {
                  console.log('Documento guardado correctamente');
                  res.status(200).send('Documento guardado correctamente');
              });
          });
      });

      request.on('error', (err) => {
          console.error('Error al descargar el documento:', err);
          res.status(500).send('Error al guardar el documento');
      });
  } else {
      res.status(400).send('Datos inválidos recibidos');
  }
});

  

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

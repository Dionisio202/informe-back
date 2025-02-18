const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { normalizarFecha, capitalizarTexto, normalizarTextoPDF } = require("./normalizar_textos");

// Importación dinámica de file-type
async function getFileType(buffer) {
  const fileTypeModule = await import("file-type");
  return fileTypeModule.fileTypeFromBuffer(buffer);
}

// Función para extraer datos de un archivo PDF
async function procesarPdf(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const pdfData = await pdfParse(data);
    let text = normalizarTextoPDF(pdfData.text);
    return text;
  } catch (error) {
    console.error("Error al procesar el PDF:", error);
    return null;
  }
}

// Función para extraer datos de un archivo DOCX
async function procesarDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("Error al procesar el DOCX:", error);
    return null;
  }
}

// Función para procesar el texto y extraer la estructura de datos
function procesarTexto(text) {
  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p);

  // Inicializar estructura JSON
  let data = {
    fecha: "",
    lugar: "",
    destinatario: {
      nombre: "",
      titulo: "",
      cargo: "Director de Innovación y Emprendimiento",
      institucion: "Universidad Técnica de Ambato",
    },
    solicitante: {
      nombre: "",
      cargo: "",
    },
    productos: [],
    proyecto: {
      tipo: "",
      titulo: "",
      resolucion: {
        numero: "",
        fecha: "",
      },
    },
  };

  // Expresiones regulares
  const fechaCiudadRegex = /^([^,]+),\s*(.+)/;
  const resolucionRegex = /Resolución (\s*[A-Z0-9-]+)/i;
  const productoRegex = /^\d+\.\-\s*(.+)/i;
  const proyectoRegex = /(Proyecto de ([A-Za-zÁÉÍÓÚáéíóúñ]+))\s*“(.+?)”/i;
  const fechaAprobacionRegex = /con fecha\s+(.+)/i;

  // Extraer ciudad y fecha sin importar el formato de la fecha
  let fechaCiudadMatch = paragraphs[0].match(fechaCiudadRegex);
  if (fechaCiudadMatch) {
    data.lugar = fechaCiudadMatch[1].trim(); // Ciudad
    data.fecha = normalizarFecha(fechaCiudadMatch[2].trim()); // Fecha
  }

  // Extraer destinatario (nombre y título)
  let directorIndex = paragraphs.findIndex((p) =>
    p.includes("DIRECTOR DE INNOVACIÓN Y EMPRENDIMIENTO")
  );
  if (directorIndex > 0) {
    data.destinatario.nombre = paragraphs[directorIndex - 1];
    if (
      directorIndex > 1 &&
      paragraphs[directorIndex - 2].match(/(Ingeniero|Doctor|PhD|Licenciado)/i)
    ) {
      data.destinatario.titulo = paragraphs[directorIndex - 2];
    }
  }

  // Extraer productos
  paragraphs.forEach((paragraph) => {
    let productoMatch = paragraph.match(productoRegex);
    if (productoMatch) {
      data.productos.push({
        nombre: capitalizarTexto(productoMatch[1]),
      });
    }
  });

  // Extraer solicitante
  let solicitanteIndex = paragraphs.findIndex((p) =>
    p.includes("Atentamente,")
  );
  if (solicitanteIndex !== -1 && solicitanteIndex + 1 < paragraphs.length) {
    data.solicitante.nombre = paragraphs[solicitanteIndex + 1];
    if (solicitanteIndex + 2 < paragraphs.length) {
      data.solicitante.cargo = paragraphs[solicitanteIndex + 2];
    }
  }

  // Extraer proyecto
  paragraphs.forEach((paragraph) => {
    let proyectoMatch = paragraph.match(proyectoRegex);
    if (proyectoMatch) {
      data.proyecto.tipo = capitalizarTexto(proyectoMatch[2].toLowerCase());
      data.proyecto.titulo = capitalizarTexto(proyectoMatch[3].toLowerCase());
    }

    let resolucionMatch = paragraph.match(resolucionRegex);
    if (resolucionMatch) {
      data.proyecto.resolucion.numero = resolucionMatch[1];
    }

    let fechaAprobacionMatch = paragraph.match(fechaAprobacionRegex);
    if (fechaAprobacionMatch) {
      data.proyecto.resolucion.fecha = normalizarFecha(
        fechaAprobacionMatch[1].trim()
      );
    }
  });

  return data;
}

// Función principal para procesar un archivo
async function procesarArchivoProducto(documento) {
  const buffer = Buffer.from(documento, "base64");
  const fileType = await getFileType(buffer);

  if (!fileType) {
    console.error("No se pudo determinar el tipo de archivo.");
    return null;
  }

  const extension = fileType.ext.toLowerCase();
  const tempFilePath = path.join(
    __dirname,
    `temp_file_${Date.now()}${Math.random()
      .toString(36)
      .substring(7)}.${extension}`
  );

  try {
    fs.writeFileSync(tempFilePath, buffer);

    let text;
    if (extension === "pdf") {
      text = await procesarPdf(tempFilePath);
    } else if (extension === "docx") {
      text = await procesarDocx(tempFilePath);
    } else {
      console.error("Formato de archivo no soportado:", extension);
      return null;
    }

    if (text) {
      return procesarTexto(text);
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error procesando el archivo:", error);
    return null;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

module.exports = { procesarArchivoProducto };
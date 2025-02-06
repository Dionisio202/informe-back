const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { parse, format } = require("date-fns");
const { es } = require("date-fns/locale"); // Para soportar fechas en español

// Importación dinámica de file-type
async function getFileType(buffer) {
  const fileTypeModule = await import("file-type");
  return fileTypeModule.fileTypeFromBuffer(buffer);
}

// Valores por defecto para los campos
const valoresPorDefecto = {
  identificacion: "No especificado",
  nombre: "No especificado",
  telefono: "No especificado",
  fecha_nacimiento: "No especificado",
  direccion: "No especificado",
  correo: "No especificado",
  porcentaje_participacion: "100",
};

// Función para verificar duplicados
function existeDuplicado(personas, nuevaPersona) {
  return personas.some(
    (persona) => persona.identificacion === nuevaPersona.identificacion
  );
}

// Función para normalizar fechas a formato "YYYY-MM-DD"
function normalizarFecha(fecha) {
  if (!fecha || fecha.trim() === "") return "No especificado";

  const formatosPosibles = [
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "dd MMMM yyyy", // Ejemplo: "15 julio 1991"
    "yyyy-MM-dd",
  ];

  for (const formato of formatosPosibles) {
    try {
      const fechaParseada = parse(fecha.trim(), formato, new Date(), { locale: es });
      return format(fechaParseada, "yyyy-MM-dd");
    } catch (error) {
      continue;
    }
  }

  return "Fecha inválida";
}

// Función para extraer datos del texto
function extraerDatos(text) {
  const textoProcesado = text.replace(/\n+/g, "\n");
  const lineas = textoProcesado.split("\n");

  const lineasFiltradas = lineas.filter((linea) => {
    return /^(Número de Cédula|Nombres Completos|Número telefónico|Fecha de Nacimiento|Dirección Domiciliaria|Correo Electrónico|Porcentaje de participación):/.test(
      linea
    );
  });

  const personas = [];
  let personaActual = { ...valoresPorDefecto };

  lineasFiltradas.forEach((linea) => {
    const [clave, valor] = linea.split(":").map((part) => part.trim());

    if (
      clave === "Número de Cédula" &&
      personaActual["identificacion"] !== "No especificado"
    ) {
      if (!existeDuplicado(personas, personaActual)) {
        personas.push(personaActual);
      } else {
        console.warn(
          `⚠️ Advertencia: Se encontró un duplicado para la identificación ${personaActual.identificacion}.`
        );
      }
      personaActual = { ...valoresPorDefecto };
    }

    const mapeoCampos = {
      "Número de Cédula": "identificacion",
      "Nombres Completos": "nombre",
      "Número telefónico": "telefono",
      "Fecha de Nacimiento": "fecha_nacimiento",
      "Dirección Domiciliaria": "direccion",
      "Correo Electrónico": "correo",
      "Porcentaje de participación": "porcentaje_participacion",
    };

    if (mapeoCampos[clave]) {
      if (clave === "Fecha de Nacimiento") {
        personaActual[mapeoCampos[clave]] = normalizarFecha(valor);
      } else {
        personaActual[mapeoCampos[clave]] = valor;
      }
    }
  });

  if (personaActual["identificacion"] !== "No especificado") {
    if (!existeDuplicado(personas, personaActual)) {
      personas.push(personaActual);
    } else {
      console.warn(
        `⚠️ Advertencia: Se encontró un duplicado para la identificación ${personaActual.identificacion}.`
      );
    }
  }

  return personas;
}

// Función para procesar archivos PDF
async function procesarPdf(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    const pdfData = await pdfParse(data);
    const text = pdfData.text;
    return extraerDatos(text);
  } catch (error) {
    console.error("❌ Error al procesar el PDF:", error);
    return [];
  }
}

// Función para procesar archivos DOCX
async function procesarDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    return extraerDatos(text);
  } catch (error) {
    console.error("❌ Error al procesar el DOCX:", error);
    return [];
  }
}

// Función principal para procesar un archivo
async function procesarArchivo(documento) {
  const buffer = Buffer.from(documento, "base64");
  const fileType = await getFileType(buffer);

  if (!fileType) {
    console.error("❌ No se pudo determinar el tipo de archivo.");
    return [];
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

    if (extension === "pdf") {
      return await procesarPdf(tempFilePath);
    } else if (extension === "docx") {
      return await procesarDocx(tempFilePath);
    } else {
      console.error("❌ Formato de archivo no soportado:", extension);
      return [];
    }
  } catch (error) {
    console.error("❌ Error procesando el archivo:", error);
    return [];
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

module.exports = { procesarArchivo };
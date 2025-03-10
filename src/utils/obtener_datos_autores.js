const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const {normalizarFecha} = require("./normalizar_textos");

// Importación dinámica de file-type
async function getFileType(buffer) {
  const fileTypeModule = await import("file-type");
  return fileTypeModule.fileTypeFromBuffer(buffer);
}

// Valores por defecto actualizados con los nuevos campos
const valoresPorDefecto = {
  identificacion: "No especificado",
  nombre: "No especificado",
  telefono: "No especificado",
  fecha_nacimiento: null,
  direccion: "No especificado",
  correo: "No especificado",
  facultad: "No especificado",
  carrera: "No especificado",
  porcentaje_participacion: 100,
};

// Función para verificar duplicados
function existeDuplicado(personas, nuevaPersona) {
  return personas.some(
    (persona) => persona.identificacion === nuevaPersona.identificacion
  );
}

// Función para validar correos electrónicos
function validarCorreo(correo) {
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regexCorreo.test(correo);
}

// Función para normalizar correos electrónicos
function normalizarCorreo(correo) {
  if (!correo || typeof correo !== "string") {
    return null;
  }
  correo = correo.trim().replace(/\s+/g, "").toLowerCase();
  return validarCorreo(correo) ? correo : null;
}

// Función para extraer datos del texto
function extraerDatos(text) {
  const textoProcesado = text.replace(/\n+/g, "\n");
  const lineas = textoProcesado.split("\n");

  // Actualizado con los nuevos campos
  const lineasFiltradas = lineas.filter((linea) => {
    return /^(Número de Cédula|Nombres Completos|Número telefónico|Fecha de Nacimiento|Dirección Domiciliaria|Correo Electrónico|Facultad|Carrera|Porcentaje de participación):/.test(
      linea
    );
  });

  const personas = [];
  let personaActual = { ...valoresPorDefecto };

  lineasFiltradas.forEach((linea) => {
    const [clave, valor] = linea.split(":").map((part) => part.trim());

    // Lógica para detectar nuevo registro
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

    // Mapeo actualizado con nuevos campos
    const mapeoCampos = {
      "Número de Cédula": "identificacion",
      "Nombres Completos": "nombre",
      "Número telefónico": "telefono",
      "Fecha de Nacimiento": "fecha_nacimiento",
      "Dirección Domiciliaria": "direccion",
      "Correo Electrónico": "correo",
      "Facultad": "facultad",        // Nuevo mapeo
      "Carrera": "carrera",          // Nuevo mapeo
      "Porcentaje de participación": "porcentaje_participacion",
    };

    if (mapeoCampos[clave]) {
      if (clave === "Fecha de Nacimiento") {
        personaActual[mapeoCampos[clave]] = normalizarFecha(valor);
      } else if (clave === "Porcentaje de participación") {
        let porcentaje = parseFloat(valor.replace("%", "").trim());
        personaActual[mapeoCampos[clave]] = isNaN(porcentaje) ? 100.00 : porcentaje;
      } else if (clave === "Correo Electrónico") {
        personaActual[mapeoCampos[clave]] = normalizarCorreo(valor);
      } else {
        // Para los nuevos campos (Facultad y Carrera)
        personaActual[mapeoCampos[clave]] = valor;
      }
    }
  });

  // Añadir última persona procesada
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
async function procesarArchivoAutores(documento) {
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

module.exports = { procesarArchivoAutores };
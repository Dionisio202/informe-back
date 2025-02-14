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

// Valores por defecto para los campos
const valoresPorDefecto = {
  identificacion: "No especificado",
  nombre: "No especificado",
  telefono: "No especificado",
  fecha_nacimiento: null, // Se enviará `null` si no se puede convertir
  direccion: "No especificado",
  correo: "No especificado",
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
    return null; // Si no es un string válido, devuelve null
  }

  // Eliminar espacios al principio y al final
  correo = correo.trim();

  // Eliminar espacios adicionales entre caracteres
  correo = correo.replace(/\s+/g, "");

  // Convertir a minúsculas para uniformidad
  correo = correo.toLowerCase();

  // Validar el correo
  if (!validarCorreo(correo)) {
    console.warn(`⚠️ Correo no válido: ${correo}`);
    return null;
  }

  return correo;
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
      } else if (clave === "Porcentaje de participación") {
        // Convertir porcentaje a número, asegurando que sea un decimal válido
        let porcentaje = parseFloat(valor.replace("%", "").trim());
        personaActual[mapeoCampos[clave]] = isNaN(porcentaje) ? 100.00 : porcentaje;
      } else if (clave === "Correo Electrónico") {
        personaActual[mapeoCampos[clave]] = normalizarCorreo(valor); // Normalizar y validar correo
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
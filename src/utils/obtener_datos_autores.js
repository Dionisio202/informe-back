const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { parse, format, isValid } = require("date-fns");
const { es } = require("date-fns/locale");

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
  if (!fecha || fecha.trim() === "" || fecha.trim().toLowerCase() === "fecha inválida") {
    return null; // Enviamos `null` para datos inválidos
  }

  // **1️⃣ Eliminar espacios extra**
  console.log("Fecha original:", fecha);
  fecha = fecha.replace(/\s+/g, " ").trim().toLowerCase(); // Convertir a minúsculas para uniformidad
  console.log("Fecha sin espacios:", fecha);

  // **2️⃣ Verificar si el formato es "DD de MES de YYYY" o con número de mes**
  const regexTexto = /^(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})$/i;
  const match = fecha.match(regexTexto);

  if (match) {
    let day = match[1].padStart(2, "0"); // Asegurar que tenga 2 dígitos
    let monthText = match[2];
    const year = match[3];

    // **3️⃣ Convertir mes a número (acepta texto y números)**
    const meses = {
      enero: "01", febrero: "02", marzo: "03", abril: "04",
      mayo: "05", junio: "06", julio: "07", agosto: "08",
      septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12"
    };

    let month = meses[monthText];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // **4️⃣ Manejo de otros formatos como DD/MM/YYYY o DD-MM-YYYY**
  const formatosPosibles = [
    "yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "dd MMMM yyyy", "dd-MM-yyyy", "dd/MM/yyyy"
  ];

  for (const formato of formatosPosibles) {
    try {
      const fechaParseada = parse(fecha, formato, new Date(), { locale: es });
      if (isValid(fechaParseada)) {
        return format(fechaParseada, "yyyy-MM-dd"); // Siempre retorna YYYY-MM-DD
      }
    } catch (error) {
      continue;
    }
  }

  // **5️⃣ Manejo de fechas con espacios adicionales (ej: "03 - 03 - 2000")**
  const fechaSinEspacios = fecha.replace(/\s+/g, ""); // Eliminar todos los espacios
  const formatosSinEspacios = ["dd-MM-yyyy", "dd/MM/yyyy"];

  for (const formato of formatosSinEspacios) {
    try {
      const fechaParseada = parse(fechaSinEspacios, formato, new Date(), { locale: es });
      if (isValid(fechaParseada)) {
        return format(fechaParseada, "yyyy-MM-dd"); // Siempre retorna YYYY-MM-DD
      }
    } catch (error) {
      continue;
    }
  }

  console.warn(`⚠️ Fecha no válida: ${fecha}`);
  return null; // Si no pudo convertir, devuelve `null`
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
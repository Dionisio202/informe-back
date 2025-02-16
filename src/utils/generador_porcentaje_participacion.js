const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const expressions = require("angular-expressions");
const util = require("util");

// Añadir funciones personalizadas para el manejo de loops
expressions.filters.size = function (arr) {
  return arr.length;
};

function angularParser(tag) {
  if (tag === ".") {
    return {
      get: function (s) {
        return s;
      },
    };
  }
  const expr = expressions.compile(tag.replace(/('|')/g, "'"));
  return {
    get: function (scope, context) {
      let obj = {};
      const scopeList = context.scopeList;
      const num = context.num;
      for (let i = 0, len = num + 1; i < len; i++) {
        obj = Object.assign(obj, scopeList[i]);
      }
      return expr(scope, obj);
    },
  };
}

function generarActaPP(jsonData, outputFileName) {
  try {
    // Preparar los datos para el template
    const data = {
      ...jsonData,
      autores: jsonData.autores.map((autor, index) => ({
        ...autor,
        index: index + 1, // Añadir el índice para usarlo en la plantilla
      })),
      autores_firma: jsonData.autores.reduce((acc, autor, index) => {
        // Agrupar autores en pares para las firmas
        if (index % 2 === 0) {
          acc.push({
            nombre1: autor.nombre,
            cedula1: autor.cedula,
            nombre2: jsonData.autores[index + 1]?.nombre || "", // Usar el siguiente autor o vacío si no existe
            cedula2: jsonData.autores[index + 1]?.cedula || "", // Usar el siguiente autor o vacío si no existe
          });
        }
        return acc;
      }, []),
    };
    console.log("Datos preparados:", data);

    // Cargar la plantilla del documento
    const plantilla = fs.readFileSync(
      "src/documents/APP.docx",
      "binary"
    );
    const zip = new PizZip(plantilla);

    // Configurar Docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      parser: angularParser,
    });

    // Pasar los datos al método render
    doc.render(data); // Aquí pasamos los datos

    // Guardar el documento generado
    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    fs.writeFileSync(outputFileName, buffer);

    console.log("Documento generado correctamente:", outputFileName);
  } catch (err) {
    // Guardar el error en un archivo de texto
    const errorFileName = "error_log.txt";
    const errorMessage = util.inspect(err, { depth: null });
    fs.writeFileSync(errorFileName, errorMessage);

    console.error(
      "Error al generar el documento. Ver detalles en:",
      errorFileName
    );
    throw err;
  }
}

module.exports = generarActaPP;

// Ejemplo de uso
const jsonData = {
  nombre_obra: "Desarrollo de un sistema de gestión de inventarios para PYMEs",
  fecha: {
    dia: 15,
    mes: "octubre",
    anio: 2023,
  },
  autores: [
    {
      nombre: "Juan Pérez",
      cedula: "1234567890",
      ciudad: "Ambato",
      direccion: "Av. Los Shyris y Naciones Unidas",
      participacion: 50,
    },
    {
      nombre: "María Gómez",
      cedula: "0987654321",
      ciudad: "Ambato",
      direccion: "Calle 10 de Agosto y Bolívar",
      participacion: 50,
    },
    {
      nombre: "Carlos López",
      cedula: "1122334455",
      ciudad: "Ambato",
      direccion: "Av. Amazonas y Atahualpa",
      participacion: 30,
    },
    {
      nombre: "Ana Torres",
      cedula: "5566778899",
      ciudad: "Ambato",
      direccion: "Calle 12 de Octubre y Sucre",
      participacion: 20,
    },
  ],
};

// Generar el contrato
generarActaPP(jsonData, "Acta_Participacion_Obra.docx");
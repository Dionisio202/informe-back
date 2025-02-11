const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const expressions = require('angular-expressions');
const util = require('util');

// Añadir funciones personalizadas para el manejo de loops
expressions.filters.size = function(arr) {
    return arr.length;
};

function angularParser(tag) {
    if (tag === '.') {
        return {
            get: function(s){ return s; }
        };
    }
    const expr = expressions.compile(tag.replace(/('|')/g, "'"));
    return {
        get: function(scope, context) {
            let obj = {};
            const scopeList = context.scopeList;
            const num = context.num;
            for (let i = 0, len = num + 1; i < len; i++) {
                obj = Object.assign(obj, scopeList[i]);
            }
            return expr(scope, obj);
        }
    };
}

function generarContrato(jsonData, outputFileName) {
    try {
        console.log('Generando documento...');
        console.log('Datos:', jsonData);
        // Preparar los datos para el template
        const data = {
            ...jsonData,
            autores: jsonData.autores.map((autor, index) => ({
                ...autor,
                isLast: index === jsonData.autores.length - 1,
                needsComma: index < jsonData.autores.length - 1
            }))
        };
        console.log('Datos preparados:', data);
        // Cargar la plantilla del documento
        const plantilla = fs.readFileSync('src/documents/UTA-SGC-B-1-1-P1-T3_Formato_CCDP_plantilla.docx', 'binary');
        const zip = new PizZip(plantilla);
        
        // Configurar Docxtemplater con los datos
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            parser: angularParser,
            data: data // Pasar los datos directamente aquí
        });

        // Renderizar el documento
        doc.render();

        // Guardar el documento generado
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        fs.writeFileSync(outputFileName, buffer);

        console.log('Documento generado correctamente:', outputFileName);
    } catch (err) {
        // Guardar el error en un archivo de texto
        const errorFileName = 'error_log.txt';
        const errorMessage = util.inspect(err, { depth: null });
        fs.writeFileSync(errorFileName, errorMessage);

        console.error('Error al generar el documento. Ver detalles en:', errorFileName);
        throw err;
    }
}

// Ejemplo de uso
const jsonData = {
    nombre_obra: "Desarrollo de un sistema de gestión de inventarios para PYMEs",
    fecha: {
        dia: 15,
        mes: "octubre",
        anio: 2023
    },
    autores: [
        { nombre: "Juan Pérez", cedula: "1234567890" },
        { nombre: "María Gómez", cedula: "0987654321" }
    ],
    rector: "Dr. Luis Morales",
    codigo_memorando_inicial: "MEM-123-2023",
    autoridad: "Dr. Luis Morales",
    tipo_registro: "cesión de derechos patrimoniales",
    proyecto_nombre: "Proyecto de Investigación XYZ",
    proyecto_codigo: "UTA-12345"
};

// Generar el contrato
generarContrato(jsonData, 'Contrato_Cesion_Derechos_1.docx');
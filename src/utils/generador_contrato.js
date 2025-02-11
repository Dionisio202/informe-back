const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

function generarContrato(jsonData, outputFileName) {
    try {
        // Cargar la plantilla del documento
        const plantilla = fs.readFileSync('src/documentsUTA-SGC-B-1-1-P1-T3_Formato_CCDP_plantilla.docx', 'binary');
        const zip = new PizZip(plantilla);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Reemplazar campos en la plantilla con los datos del JSON
        doc.setData(jsonData);
        doc.render();

        // Guardar el documento generado
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        fs.writeFileSync(outputFileName, buffer);

        console.log('Documento generado correctamente:', outputFileName);
    } catch (err) {
        console.error('Error al generar el documento:', err);
        throw err; // Lanza el error para manejarlo en el método que llama a esta función
    }
}
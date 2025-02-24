const pdfParse = require('pdf-parse');

async function extractMemoCode(base64PDF) {
  try {
    // Convertir base64 a Buffer
    const rawData = atob(base64PDF);
    const buffer = Buffer.from(rawData, 'binary');

    // Extraer texto del PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    // Dividir en líneas y buscar el patrón
    const lines = text.split('\n');
    const targetLine = lines.find(line => line.includes('Memorando Nro.'));

    if (!targetLine) return 'Código no encontrado';

    // Extraer código con regex mejorado
    const regex = /Memorando Nro\.\s+([A-Za-z0-9-]+)/;
    const match = targetLine.match(regex);

    return match ? match[1] : 'Formato inválido';

  } catch (error) {
    throw new Error(`Error procesando PDF: ${error.message}`);
  }
}

module.exports = extractMemoCode;
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function leerPdf() {
    const pdfPath = 'src/utils/OFICIO LIBRO  DINOVA-signed.pdf'; // Ruta al archivo PDF
    const dataBuffer = fs.readFileSync(pdfPath); // Leer el archivo PDF

    try {
        // Extraer el texto del PDF
        const data = await pdfParse(dataBuffer);
        const text = data.text;

        // Separar el texto en párrafos (usando líneas vacías como separadores)
        const parrafos = text.split(/\n\s*\n/).filter(parrafo => parrafo.trim() !== '');

        // Mostrar los párrafos por consola
        console.log("📄 **Párrafos del PDF:**");
        parrafos.forEach((parrafo, index) => {
            console.log(`🔹 Párrafo ${index + 1}:`, parrafo.trim());
        });

    } catch (error) {
        console.error("❌ Error al leer el PDF:", error);
    }
}

// Llamar a la función para leer el PDF
leerPdf();
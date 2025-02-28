// testProcesarArchivoProducto.js
const fs = require("fs");
const path = require("path");
const { procesarArchivoProducto } = require("../utils/obtener_datos_producto"); // Ajusta la ruta a donde exportas tu función

class TestProcesarArchivoProducto {
  constructor(filePath) {
    this.filePath = filePath;
  }

  // Método para leer el archivo y convertirlo a base64
  leerArchivoBase64() {
    try {
      const absolutePath = path.resolve(this.filePath);
      const fileBuffer = fs.readFileSync(absolutePath);
      return fileBuffer.toString("base64");
    } catch (error) {
      console.error("Error leyendo el archivo:", error);
      return null;
    }
  }

  // Método para ejecutar la prueba
  async ejecutarTest() {
    const base64Documento = this.leerArchivoBase64();
    if (!base64Documento) {
      console.error("No se pudo leer el archivo para la prueba.");
      return;
    }
    console.log("Procesando el archivo:", this.filePath);
    try {
      const resultado = await procesarArchivoProducto(base64Documento);
      console.log("Resultado de la extracción:", resultado);
    } catch (error) {
      console.error("Error en la ejecución de la prueba:", error);
    }
  }
}

// Ejemplo de uso:
// Asegúrate de que la ruta al archivo de prueba sea correcta (puede ser un PDF o DOCX)
const archivoDePrueba = "./src/test/FORMATO_SOLICITUD_REGISTRO_EJ1.pdf"; // Cambia la extensión o ruta según corresponda

const tester = new TestProcesarArchivoProducto(archivoDePrueba);
tester.ejecutarTest();

// testProcesarArchivoProducto.js
import { io } from "socket.io-client";
import fs from "fs";
import path from "path";

const socket = io("http://localhost:3001"); // URL de tu servidor

class TestProcesarArchivoProducto {
  constructor(fileProd, fileMemo) {
    this.fileProd = fileProd;
    this.fileMemo = fileMemo;
  }

  // Método para leer un archivo y convertirlo a base64 (recibe la ruta)
  leerArchivoBase64(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const fileBuffer = fs.readFileSync(absolutePath);
      return fileBuffer.toString("base64");
    } catch (error) {
      console.error("Error leyendo el archivo:", error);
      return null;
    }
  }

  // Método para ejecutar la prueba
  async ejecutarTest() {
    const base64Prod = this.leerArchivoBase64(this.fileProd);
    const base64Memo = this.leerArchivoBase64(this.fileMemo);

    if (!base64Prod || !base64Memo) {
      console.error("No se pudo leer uno o ambos archivos para la prueba.");
      return;
    }

    socket.once("connect", () => {
      console.log("✅ Conectado al servidor WebSocket");

      // Emitir el evento 'cargar_documento_producto'
      socket.emit(
        "cargar_documento_producto",
        {
          documento_productos: base64Prod,
          documento_memorando: base64Memo,
        },
        (response) => {
          if (response.success) {
            console.log("Datos recibidos:", response.data);
          } else {
            console.error("Error:", response.message);
          }
        }
      );
    });
  }
}

// Ejemplo de uso:
// Asegúrate de que las rutas a los archivos de prueba sean correctas
const archivoProducto = "/app/documents/test/FORMATO_SOLICITUD_REGISTRO_EJ2.pdf";
const archivoMemo = "/app/documents/test/UTA-DINNOVA-2024-0103-M.pdf";

const tester = new TestProcesarArchivoProducto(archivoProducto, archivoMemo);
tester.ejecutarTest();
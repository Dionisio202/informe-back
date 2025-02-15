const fs = require("fs");
const io = require("socket.io-client");

class DocumentoTester {
  constructor(socketUrl) {
    this.socket = io(socketUrl);
  }

  // Método para convertir un archivo a base64
  static convertirArchivoABase64(rutaArchivo) {
    try {
      const archivo = fs.readFileSync(rutaArchivo);
      return archivo.toString("base64");
    } catch (error) {
      console.error("Error al leer el archivo:", error);
      return null;
    }
  }

  // Método para probar el evento procesar_documentos
  probarProcesamiento(rutaAutores, rutaProductos) {
    const documentoAutores = DocumentoTester.convertirArchivoABase64(rutaAutores);
    const documentoProductos = DocumentoTester.convertirArchivoABase64(rutaProductos);

    if (!documentoAutores || !documentoProductos) {
      console.error("❌ Error: No se pudieron leer los archivos.");
      return;
    }

    this.socket.emit("procesar_documentos", 
      { 
        documento_autores: documentoAutores, 
        documento_productos: documentoProductos 
      }, 
      (respuesta) => {
        console.log("📢 Respuesta del servidor:", respuesta);

        // ✅ Verificar si la respuesta es exitosa
        if (respuesta.success) {
          try {
            // 📌 Convertir JSON strings a objetos
            const autores = JSON.parse(respuesta.autores);
            const productos = JSON.parse(respuesta.productos);
            console.log("Productos:", productos);
          } catch (error) {
            console.error("❌ Error al parsear la respuesta:", error);
          }
        } else {
          console.error("❌ Error en la respuesta del servidor:", respuesta.message);
        }
      }
    );
  }
}

// 📌 Uso de la clase
const tester = new DocumentoTester("http://localhost:3001");  // Cambia la URL si es necesario

// 📂 Rutas de los documentos
const rutaAutores = "./src/documents/autores.pdf";  // Cambia con tu archivo real
const rutaProductos = "./src/documents/FORMATO_SOLICITUD_REGISTRO_EJ3.pdf";  // Cambia con tu archivo real

tester.probarProcesamiento(rutaAutores, rutaProductos);
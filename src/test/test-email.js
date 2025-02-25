// clientTest.js
const { io } = require("socket.io-client");

// Conecta con el servidor (reemplaza la URL según tu configuración)
const socket = io("http://localhost:3001");

const sendEmail = () => {
  // Puedes pasar un array en 'to' si deseas múltiples destinatarios
  socket.emit("send_email", {
    to: ["solisedison@outlook.com", "otro@dominio.com"],
    subject: "Asunto del correo",
    message: "Este es el contenido del correo.",
    attachments: ["jfda-001.docx", "jfsr-001.docx"], 
    docBasePath: "/app/documents" // o "/app/documents" según necesites
  }, (response) => {
    console.log("📩 Respuesta del servidor:", response);
  });
};

sendEmail();

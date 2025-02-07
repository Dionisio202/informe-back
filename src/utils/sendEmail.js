const nodemailer = require("nodemailer");
const path = require("path");

// 📌 Configuración de transporte SMTP para Hotmail (Outlook)
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "prueba_backend25@outlook.com",
    pass: "pruebaEd123" // Usa una App Password si tienes 2FA
  }
});

// 📌 Función para enviar correos con múltiples adjuntos
const sendEmail = async (to, subject, message, attachmentNames = []) => {
    try {
      const recipients = Array.isArray(to) ? to.join(", ") : to;
  
      // 📂 Ruta donde están los documentos
      const documentPath = path.join(__dirname, "../documents");
  
      // 🗂 Procesar archivos adjuntos (convertir nombres a rutas completas)
      const attachments = attachmentNames.map(filename => ({
        filename,
        path: path.join(documentPath, filename) // Ruta completa
      }));
  
      const mailOptions = {
        from: "prueba_backend25@outlook.com",
        to: recipients,
        subject,
        text: message,
        attachments: attachments.length > 0 ? attachments : []
      };
  
      // 📩 Enviar el correo
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Correo enviado:", info.response);
      return { success: true, message: "Correo enviado exitosamente." };
    } catch (error) {
      console.error("❌ Error al enviar correo:", error);
      return { success: false, message: error.message };
    }
  };
  
  module.exports = sendEmail;

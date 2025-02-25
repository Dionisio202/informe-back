// utils/sendEmail.js
const nodemailer = require("nodemailer");
const path = require("path");

// Configuración de transporte SMTP para Outlook/Office365 con STARTTLS
const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com", // Servidor SMTP para Outlook
  port: 587,                     // Puerto para STARTTLS
  secure: false,                 // false para usar STARTTLS (no SSL directo)
  auth: {
    user: "eortiz5364@uta.edu.ec", 
    pass: "!dionisio202"
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Envía un correo con múltiples adjuntos.
 * @param {string|string[]} to - Dirección(es) de correo de destino. Puede ser un string o un array.
 * @param {string} subject - Asunto del correo.
 * @param {string} message - Cuerpo del correo.
 * @param {string[]} [attachmentNames=[]] - Nombres de archivos adjuntos.
 * @param {string} [docBasePath="/app/documents"] - Ruta base donde se encuentran los documentos.
 */
const sendEmail = async (to, subject, message, attachmentNames = [], docBasePath = "/app/documents") => {
  try {
    // Si 'to' es un array, unimos las direcciones con comas
    const recipients = Array.isArray(to) ? to.join(", ") : to;

    // Crear la lista de adjuntos con la ruta base parametrizada
    const attachments = attachmentNames.map(filename => ({
      filename,
      path: path.join(docBasePath, filename)
    }));

    const mailOptions = {
      from: "eortiz5364@uta.edu.ec",
      to: recipients,
      subject,
      text: message,
      attachments: attachments.length > 0 ? attachments : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Correo enviado:", info.response);
    return { success: true, message: "Correo enviado exitosamente." };
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    return { success: false, message: error.message };
  }
};

module.exports = sendEmail;

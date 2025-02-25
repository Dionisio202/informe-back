// events/sendEmailEvent.js
const sendEmail = require("../utils/sendEmail");

module.exports = (io, socket) => {
  console.log('📌 Evento WebSocket "send_email" registrado');

  // Evento para enviar correo
  socket.on("send_email", async (data, callback) => {
    try {
      // Ahora recibimos docBasePath como parámetro opcional
      const { to, subject, message, attachments, docBasePath } = data;

      if (!to || !subject || !message) {
        return callback({ success: false, message: "Faltan datos requeridos" });
      }

      // Enviar correo
      const emailResponse = await sendEmail(to, subject, message, attachments, docBasePath);

      callback(emailResponse); // Responder al cliente con el estado del envío
    } catch (error) {
      console.error("❌ Error en el envío de correo:", error);
      callback({ success: false, message: "Error en el servidor al enviar el correo" });
    }
  });
};

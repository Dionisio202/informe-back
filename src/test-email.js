const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

const sendEmail = () => {
    socket.emit("send_email", {
        to: "solisedison@outlook.com",
        subject: "Asunto del correo",
        message: "Este es el contenido del correo.",
        attachments: ["jfda-001.docx", "jfsr-001.docx"] // aqui se envian el key que esta en el front
    }, (response) => {
        console.log("📩 Respuesta del servidor:", response);
    });
};

sendEmail();
const winston = require('winston');
const { format, transports } = winston;

// Configuración del logger
const logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Agrega una marca de tiempo
        format.json() // Formato de salida en JSON
    ),
    transports: [
        // Transporte para consola
        new transports.Console({
            format: format.combine(
                format.colorize(), // Colorea los logs en la consola
                format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] ${level}: ${message}`;
                })
            ),
        }),
        // Transporte para archivo de logs generales
        new transports.File({ filename: 'logs/app.log' }),
        // Transporte para archivo de errores generales
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Transporte para archivo de errores de la base de datos
        new transports.File({ filename: 'logs/database.log', level: 'error' }),
        // Transporte para archivo de errores de autenticación
        new transports.File({ filename: 'logs/auth.log', level: 'error' }),
    ],
});

// Exportar el logger para su uso en otros módulos
module.exports = logger;
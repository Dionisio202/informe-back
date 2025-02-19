const sql = require('mssql');
const winston = require('winston');
require('dotenv').config();


// Configuración de la conexión a SQL Server
// Modifica el archivo de configuración (Conecction_SQL_Server.js)
const dbConfig = {
  user: "sa",
  password: "edison202",
  server: "10.9.5.37",
  database: "onlyoffice",
  port: 1433, // Usa el puerto directamente
  options: {
    encrypt: true,
    trustServerCertificate: true,
    // Remueve 'instanceName' si usas 'port'
  },
};

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'database.log' }),
  ],
});

// Validación de configuración
function validateConfig(config) {
  if (!config.user || !config.password || !config.server || !config.database) {
    throw new Error('Configuración de la base de datos incompleta.');
  }
}

validateConfig(dbConfig);

// Crear el pool de conexiones
let poolPromise;

async function getConnection() {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbConfig)
        .connect()
        .then(pool => {
          logger.info('Pool de conexión creado.');
          console.log(dbConfig);
          return pool;
        })
        .catch(err => {
          logger.error('Error al crear el pool de conexión:', err);
          console.log(dbConfig);
          poolPromise = null; // Reinicia el pool en caso de error
          throw new Error(`Error al conectar a SQL Server: ${err.message}`);
        });
    }
    return poolPromise;
  } catch (err) {
    logger.error('Error inesperado:', err);
    throw new Error(`Error inesperado: ${err.message}`);
  }
}

async function closePool() {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      logger.info('Pool de conexión cerrado.');
      poolPromise = null;
    }
  } catch (err) {
    logger.error('Error al cerrar el pool de conexión:', err);
    throw err;
  }
}

module.exports = {
  getConnection,
  closePool,
  sql,
};
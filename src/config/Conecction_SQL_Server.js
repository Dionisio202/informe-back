const sql = require('mssql');

// Configuración de la conexión a SQL Server
const dbConfig = {
  user: 'sa',
  password: 'codBO123',
  server: 'ARCHER\\DINNOVA',
  database: 'Prueba',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Crear el pool de conexiones
let poolPromise;

async function getConnection() {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbConfig)
        .connect()
        .then(pool => {
          console.log('Pool de conexión creado.');
          return pool;
        })
        .catch(err => {
          console.error('Error al crear el pool de conexión:', err);
          poolPromise = null; // Reinicia el pool en caso de error
          throw err;
        });
    }
    return poolPromise;
  } catch (err) {
    console.error('Error al conectar a SQL Server:', err);
    throw err;
  }
}

module.exports = {
  getConnection,
  sql,
};
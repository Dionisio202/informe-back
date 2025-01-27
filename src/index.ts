import express from 'express';

const app = express();
const PORT = 3000;
const morgan = require('morgan');
const userRoutes = require('./routes/usuarios');


// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Rutas
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.use('/api/usuarios', userRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

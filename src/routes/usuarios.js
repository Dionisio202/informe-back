const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/Conecction_SQL_Server');

// Ruta para obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection(); // Obtiene el pool de conexiones
    const result = await pool.request().query('SELECT * FROM Usuarios');
    res.json(result.recordset); // Devuelve los usuarios como JSON
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).send('Error al obtener usuarios');
  }
});

// Ruta para agregar un nuevo usuario
router.post('/', async (req, res) => {
  try {
    const { nombre, email } = req.body;
    const pool = await getConnection(); // Obtiene el pool de conexiones
    await pool
      .request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email', sql.NVarChar, email)
      .query('INSERT INTO Usuarios (Nombre, Email) VALUES (@nombre, @email)');
    res.status(201).send('Usuario agregado correctamente');
  } catch (err) {
    console.error('Error al agregar usuario:', err);
    res.status(500).send('Error al agregar usuario');
  }
});

module.exports = router;
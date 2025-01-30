// auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getConnection, sql } = require('../config/Conecction_SQL_Server');
const logger = require('../utils/logger');

// Funciones de autenticación
const registerUser = async (pool, { nombre, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool
        .request()
        .input('Nombre', sql.NVarChar, nombre)
        .input('Email', sql.NVarChar, email)
        .input('Password', sql.NVarChar, hashedPassword)
        .query(
            'INSERT INTO Usuarios (Nombre, Email, Password, FechaRegistro) VALUES (@Nombre, @Email, @Password, GETDATE())'
        );
};

const loginUser = async (pool, { email, password }) => {
    const result = await pool
        .request()
        .input('Email', sql.NVarChar, email)
        .query('SELECT * FROM Usuarios WHERE Email = @Email');

    if (result.recordset.length === 0) {
        throw new Error('Usuario no encontrado');
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
        throw new Error('Contraseña incorrecta');
    }

    const token = jwt.sign(
        { id: user.id, email: user.Email },
        process.env.JWT_SECRET || 'mi_clave_secreta',
        { expiresIn: '1h' }
    );

    const sessionResult = await pool
        .request()
        .input('UserId', sql.Int, user.Id)
        .input('Token', sql.NVarChar, token)
        .input('DuracionHoras', sql.Int, 6)
        .execute('InsertarSesion');

    return { token, expiresAt: sessionResult.recordset[0]?.expires_at };
};

module.exports = (io, socket) => {
    logger.info('📌 Evento WebSocket "auth" registrado'); // Registrar en el logger

    // 🔹 Evento para REGISTRAR un usuario
    socket.on('register', async ({ nombre, email, password }) => {
        try {
            const pool = await getConnection();
            await registerUser(pool, { nombre, email, password });
            logger.info('✅ Usuario registrado correctamente'); // Registrar en el logger
            socket.emit('register_success', 'Usuario registrado con éxito');
        } catch (err) {
            logger.error('❌ Error en registro:', err); // Registrar error en el logger
            socket.emit('register_error', 'Error en el servidor');
        }
    });

    // 🔹 Evento para INICIAR SESIÓN
    socket.on('login', async ({ email, password }) => {
        try {
            const pool = await getConnection();
            const { token, expiresAt } = await loginUser(pool, { email, password });
            logger.info('✅ Login exitoso, enviando token...'); // Registrar en el logger
            socket.emit('login_success', { token, expiresAt });
        } catch (err) {
            logger.error('❌ Error en login:', err); // Registrar error en el logger
            socket.emit('login_error', 'Error en el servidor');
        }
    });
};
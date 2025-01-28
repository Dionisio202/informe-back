const { getConnection, sql } = require('../config/Conecction_SQL_Server');

module.exports = (io, socket) => {
    // Evento para obtener todos los usuarios
    socket.on('get_users', async (callback) => {
        try {
            const pool = await getConnection();
            const result = await pool.request().query('SELECT * FROM Usuarios');
            callback({ success: true, data: result.recordset }); // Respuesta con los usuarios
        } catch (err) {
            console.error('Error al obtener usuarios:', err);
            callback({ success: false, message: 'Error al obtener usuarios' });
        }
    });

    // Evento para agregar un nuevo usuario
    socket.on('add_user', async (user, callback) => {
        try {
            const { nombre, email } = user;

            const pool = await getConnection();
            await pool
                .request()
                .input('Nombre', sql.NVarChar, nombre)
                .input('Email', sql.NVarChar, email)
                .query('INSERT INTO Usuarios (Nombre, Email, FechaRegistro) VALUES (@Nombre, @Email, GETDATE())');

            callback({ success: true, message: 'Usuario agregado correctamente' });
        } catch (err) {
            console.error('Error al agregar usuario:', err);
            callback({ success: false, message: 'Error al agregar usuario' });
        }
    });

    // Evento para eliminar un usuario
    socket.on('delete_user', async (id, callback) => {
        try {
            const pool = await getConnection();
            const result = await pool
                .request()
                .input('Id', sql.Int, id)
                .query('DELETE FROM Usuarios WHERE Id = @Id');

            if (result.rowsAffected[0] === 0) {
                return callback({ success: false, message: `Usuario con ID ${id} no encontrado.` });
            }

            callback({ success: true, message: `Usuario con ID ${id} eliminado correctamente.` });
        } catch (err) {
            console.error('Error al eliminar usuario:', err);
            callback({ success: false, message: 'Error al eliminar usuario' });
        }
    });

    // Evento para actualizar un usuario
    socket.on('update_user', async (data, callback) => {
        try {
            const { id, nombre, email } = data;

            if (!nombre && !email) {
                return callback({ success: false, message: 'Debes proporcionar al menos un campo para actualizar (nombre o email).' });
            }

            const pool = await getConnection();
            const updateQuery = `
                UPDATE Usuarios 
                SET 
                    ${nombre ? 'Nombre = @Nombre' : ''} 
                    ${nombre && email ? ',' : ''} 
                    ${email ? 'Email = @Email' : ''}
                WHERE Id = @Id
            `;

            const result = await pool
                .request()
                .input('Id', sql.Int, id)
                .input('Nombre', sql.NVarChar, nombre || null)
                .input('Email', sql.NVarChar, email || null)
                .query(updateQuery);

            if (result.rowsAffected[0] === 0) {
                return callback({ success: false, message: `Usuario con ID ${id} no encontrado.` });
            }

            callback({ success: true, message: `Usuario con ID ${id} actualizado correctamente.` });
        } catch (err) {
            console.error('Error al actualizar usuario:', err);
            callback({ success: false, message: 'Error al actualizar usuario' });
        }
    });
};

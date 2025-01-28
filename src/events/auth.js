const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { getConnection, sql } = require("../config/Conecction_SQL_Server");

module.exports = (io, socket) => {
  console.log('📌 Evento WebSocket "auth" registrado');

  // 🔹 Evento para REGISTRAR un usuario
  socket.on("register", async ({ nombre, email, password }) => {
    try {
      console.log('📌 Evento "register" recibido:', email);

      const pool = await getConnection();

      // 📌 Verificar si el usuario ya existe
      const userExists = await pool
        .request()
        .input("Email", sql.NVarChar, email)
        .query("SELECT * FROM Usuarios WHERE Email = @Email");

      if (userExists.recordset.length > 0) {
        console.log("❌ El usuario ya existe");
        return socket.emit("register_error", "El email ya está registrado");
      }

      // 📌 Hashear la contraseña antes de guardarla en la BD
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log("🔐 Contraseña encriptada:", hashedPassword);

      // 📌 Insertar el nuevo usuario en la BD
      await pool
        .request()
        .input("Nombre", sql.NVarChar, nombre)
        .input("Email", sql.NVarChar, email)
        .input("Password", sql.NVarChar, hashedPassword)
        .query(
          "INSERT INTO Usuarios (Nombre, Email, Password, FechaRegistro) VALUES (@Nombre, @Email, @Password, GETDATE())"
        );

      console.log("✅ Usuario registrado correctamente");
      socket.emit("register_success", "Usuario registrado con éxito");
    } catch (err) {
      console.error("❌ Error en registro:", err);
      socket.emit("register_error", "Error en el servidor");
    }
  });

  // 🔹 Evento para INICIAR SESIÓN (manejo de sesiones)
  socket.on("login", async ({ email, password }) => {
    try {
      console.log('📌 Evento "login" recibido:', email);

      const pool = await getConnection();
      const result = await pool
        .request()
        .input("Email", sql.NVarChar, email)
        .query("SELECT * FROM Usuarios WHERE Email = @Email");

      if (result.recordset.length === 0) {
        console.log("❌ Usuario no encontrado");
        return socket.emit("login_error", "Usuario o contraseña incorrectos");
      }

      const user = result.recordset[0];

      // 📌 Mostrar la contraseña almacenada en la base de datos
      console.log(
        "🔐 Contraseña almacenada en BD (hash bcrypt):",
        user.Password
      );

      // Comparar la contraseña ingresada con la almacenada
      const isMatch = await bcrypt.compare(password, user.Password);
      console.log("📌 Coincidencia de contraseña:", isMatch);

      if (!isMatch) {
        console.log("❌ Contraseña incorrecta");
        return socket.emit("login_error", "Usuario o contraseña incorrectos");
      }

      // 📌 Generar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.Email },
        process.env.JWT_SECRET || "mi_clave_secreta",
        { expiresIn: "1h" }
      );

      // 📌 Ejecutar el procedimiento almacenado para insertar la sesión
      const sessionResult = await pool
        .request()
        .input("UserId", sql.Int, user.Id)
        .input("Token", sql.NVarChar, token)
        .input("DuracionHoras", sql.Int, 6) // Cambia el valor si necesitas más o menos horas
        .execute("InsertarSesion");

      // 📌 Obtener la fecha de expiración de la respuesta del procedimiento almacenado
      const expiresAt = sessionResult.recordset[0]?.expires_at;

      console.log("✅ Login exitoso, enviando token...");
      socket.emit("login_success", { token, expiresAt });
    } catch (err) {
      console.error("❌ Error en login:", err);
      socket.emit("login_error", "Error en el servidor");
    }
  });

  // 🔹 Evento para VALIDAR SESIÓN
  socket.on("validate_session", async ({ token }) => {
    try {
      console.log(`📌 Validando sesión para el token: ${token}`);

      const pool = await getConnection();
      const result = await pool
        .request()
        .input("Token", sql.NVarChar, token)
        .query("SELECT * FROM Sessions WHERE token = @Token AND is_valid = 1");

      if (result.recordset.length === 0) {
        console.log("❌ Sesión no válida o expirada");
        return socket.emit("session_invalid", "Sesión no válida o expirada");
      }

      console.log("✅ Sesión válida");
      socket.emit("session_valid", "Sesión válida");
    } catch (err) {
      console.error("❌ Error al validar sesión:", err);
      socket.emit("session_error", "Error en el servidor");
    }
  });

  // 🔹 Evento para CERRAR SESIÓN
  socket.on("logout", async ({ token }) => {
    try {
      console.log(`📌 Cerrando sesión con token: ${token}`);

      const pool = await getConnection();
      await pool
        .request()
        .input("Token", sql.NVarChar, token)
        .query("UPDATE Sessions SET is_valid = 0 WHERE token = @Token");

      console.log("✅ Sesión cerrada correctamente");
      socket.emit("logout_success", "Sesión cerrada correctamente");
    } catch (err) {
      console.error("❌ Error en logout:", err);
      socket.emit("logout_error", "Error al cerrar sesión");
    }
  });
};
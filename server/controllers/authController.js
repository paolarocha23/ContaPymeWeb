import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { send2FACode, sendPasswordResetEmail } from '../config/email.js';
import { registrarBitacora } from '../utils/bitacora.js';

// Enmascarar correo para privacidad (ej. j***n@correo.com)
function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 5))}${user[user.length - 1]}@${domain}`;
}

/**
 * 1. Inicio de sesión - Paso 1: Valida credenciales y genera código 2FA
 */
export async function login(req, res) {
  try {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, introduce tu nombre de usuario y contraseña.'
      });
    }

    // Buscar usuario y verificar datos
    const { rows } = await pool.query(`
      SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellido_paterno, 
        u.apellido_materno,
        u.nombre_usuario, 
        u.contrasena, 
        u.correo, 
        u.id_rol, 
        u.estatus AS usuario_estatus,
        r.nombre AS rol_nombre,
        r.estatus AS rol_estatus
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.nombre_usuario = $1 OR u.correo = $1
      LIMIT 1
    `, [nombre_usuario.trim()]);

    if (rows.length === 0) {
      await registrarBitacora(req, {
        nombre_usuario,
        accion: 'INICIO_SESION_FALLIDO',
        detalle: 'Intento con usuario inexistente'
      });
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos.'
      });
    }

    const user = rows[0];

    // Validar contraseña cifrada con bcrypt / argon2
    const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!passwordMatch) {
      await registrarBitacora(req, {
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        accion: 'INICIO_SESION_FALLIDO',
        detalle: 'Contraseña incorrecta'
      });
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos.'
      });
    }

    // Verificar si el usuario está activo
    if (Number(user.usuario_estatus) !== 1) {
      await registrarBitacora(req, {
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        accion: 'ACCESO_DENEGADO_USUARIO_INACTIVO',
        detalle: 'El usuario se encuentra inactivo'
      });
      return res.status(403).json({
        success: false,
        code: 'USER_INACTIVE',
        message: 'Tu cuenta está inactiva. Comunícate con el Administrador del sistema.'
      });
    }

    // Verificar si el rol asignado está activo
    if (Number(user.rol_estatus) !== 1) {
      await registrarBitacora(req, {
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        accion: 'ACCESO_DENEGADO_ROL_INACTIVO',
        detalle: `El rol '${user.rol_nombre}' asignado al usuario está inactivo`
      });
      return res.status(403).json({
        success: false,
        code: 'ROLE_INACTIVE',
        message: `El rol (${user.rol_nombre}) asociado a tu cuenta está inactivo. Tu acceso ha sido restringido.`
      });
    }

    // Generar código 2FA numérico de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidar códigos anteriores no usados
    await pool.query(
      `UPDATE codigos_2fa
       SET usado = TRUE
       WHERE id_usuario = $1
         AND (usado = FALSE OR usado IS NULL)`,
      [user.id_usuario]
    );

    // Guardar nuevo código. La expiración se calcula en PostgreSQL para
    // evitar desfases de zona horaria entre Node y Supabase.
    await pool.query(
      `INSERT INTO codigos_2fa (id_usuario, codigo, expiracion, usado)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', FALSE)`,
      [user.id_usuario, code]
    );

    // Enviar código al correo registrado
    await send2FACode(user.correo, user.nombre_usuario, code);

    // Registrar en bitácora de accesos
    await registrarBitacora(req, {
      id_usuario: user.id_usuario,
      nombre_usuario: user.nombre_usuario,
      accion: 'INICIO_SESION_PASO1_EXITOSO',
      detalle: `Código 2FA generado y enviado a ${maskEmail(user.correo)}`
    });

    // Generar token temporal para el paso 2 de verificación
    const tempToken = jwt.sign(
      {
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        step: '2fa_pending'
      },
      process.env.JWT_2FA_SECRET || 'contapyme_temp_2fa_token_key_abcdef123456',
      { expiresIn: '10m' }
    );

    return res.json({
      success: true,
      requires2FA: true,
      message: 'Código de verificación en 2 pasos enviado a tu correo electrónico.',
      tempToken,
      emailMasked: maskEmail(user.correo),
      // Para facilitar pruebas en desarrollo si no se tiene SMTP activo:
      // devCode removed for production
    });

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al procesar el inicio de sesión.'
    });
  }
}

/**
 * 2. Inicio de sesión - Paso 2: Verificar código 2FA
 */
export async function verify2FA(req, res) {
  try {
    const { tempToken, codigo } = req.body;

    if (!tempToken || !codigo) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (token temporal y código 2FA).'
      });
    }

    // Validar token temporal
    let decoded;
    try {
      decoded = jwt.verify(
        tempToken,
        process.env.JWT_2FA_SECRET || 'contapyme_temp_2fa_token_key_abcdef123456'
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'La sesión de verificación ha expirado. Por favor, ingresa tus credenciales nuevamente.'
      });
    }

    const id_usuario = decoded.id_usuario;

    // Buscar el código exacto que ingresó el usuario. Así podemos distinguir
    // entre código incorrecto, ya utilizado y expirado.
    const { rows } = await pool.query(`
      SELECT id_codigo, codigo, expiracion, intentos, usado,
             (expiracion > NOW()) AS vigente
      FROM codigos_2fa
      WHERE id_usuario = $1
        AND codigo = $2
      ORDER BY id_codigo DESC
      LIMIT 1
    `, [id_usuario, codigo.trim()]);

    if (rows.length === 0) {
      console.warn('⚠️ 2FA: código no encontrado', { id_usuario });

      await registrarBitacora(req, {
        id_usuario,
        nombre_usuario: decoded.nombre_usuario,
        accion: 'INICIO_SESION_2FA_FALLIDO',
        detalle: 'Código 2FA incorrecto ingresado'
      });
      return res.status(400).json({
        success: false,
        message: 'Código de verificación incorrecto. Verifica el número recibido en tu correo.'
      });
    }

    const dbCode = rows[0];

    // Se tolera usado NULL (esquemas migrados sin default)
    const yaUsado = dbCode.usado === true || Number(dbCode.usado) === 1;
    if (yaUsado) {
      console.warn('⚠️ 2FA: código ya utilizado', {
        id_usuario,
        id_codigo: dbCode.id_codigo
      });

      await registrarBitacora(req, {
        id_usuario,
        nombre_usuario: decoded.nombre_usuario,
        accion: 'INICIO_SESION_2FA_FALLIDO',
        detalle: 'Código 2FA ya utilizado'
      });
      return res.status(400).json({
        success: false,
        message: 'Este código ya fue utilizado. Solicita un nuevo código.'
      });
    }

    if (!dbCode.vigente) {
      console.warn('⚠️ 2FA: código expirado', {
        id_usuario,
        id_codigo: dbCode.id_codigo,
        expiracion: dbCode.expiracion
      });

      await registrarBitacora(req, {
        id_usuario,
        nombre_usuario: decoded.nombre_usuario,
        accion: 'INICIO_SESION_2FA_FALLIDO',
        detalle: 'Código 2FA expirado'
      });
      return res.status(400).json({
        success: false,
        message: 'El código de verificación ha expirado. Solicita un nuevo código.'
      });
    }

    // Marcar código como usado
    await pool.query('UPDATE codigos_2fa SET usado = TRUE WHERE id_codigo = $1', [dbCode.id_codigo]);

    // Obtener información completa y actualizada del usuario
    const { rows: userRows } = await pool.query(`
      SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellido_paterno, 
        u.apellido_materno, 
        u.nombre_usuario, 
        u.correo, 
        u.id_rol, 
        u.estatus AS usuario_estatus,
        u.fecha_creacion,
        r.nombre AS rol_nombre,
        r.estatus AS rol_estatus,
        r.permisos
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1
      LIMIT 1
    `, [id_usuario]);

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = userRows[0];

    // Doble verificación de estatus activo
    if (Number(user.usuario_estatus) !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Tu usuario ha sido desactivado.'
      });
    }
    if (Number(user.rol_estatus) !== 1) {
      return res.status(403).json({
        success: false,
        message: 'El rol de tu usuario ha sido desactivado.'
      });
    }

    // Parsear permisos
    let permisos = [];
    if (user.permisos) {
      try {
        permisos = typeof user.permisos === 'string' ? JSON.parse(user.permisos) : user.permisos;
      } catch (e) {
        permisos = [];
      }
    }

    // Generar JWT de sesión definitiva (8 horas por defecto)
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        nombre_usuario: user.nombre_usuario,
        id_rol: user.id_rol,
        rol_nombre: user.rol_nombre
      },
      process.env.JWT_SECRET || 'contapyme_super_secret_jwt_key_2026_xyz987654321',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Registrar acceso exitoso en bitácora
    await registrarBitacora(req, {
      id_usuario: user.id_usuario,
      nombre_usuario: user.nombre_usuario,
      accion: 'INICIO_SESION_2FA_EXITOSO',
      detalle: 'Autenticación en 2 pasos completada exitosamente'
    });

    return res.json({
      success: true,
      message: '¡Bienvenido al sistema ContaPyme!',
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido_paterno: user.apellido_paterno,
        apellido_materno: user.apellido_materno,
        nombre_completo: `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno || ''}`.trim(),
        nombre_usuario: user.nombre_usuario,
        correo: user.correo,
        id_rol: user.id_rol,
        rol_nombre: user.rol_nombre,
        estatus: user.usuario_estatus,
        fecha_creacion: user.fecha_creacion,
        permisos
      }
    });

  } catch (err) {
    console.error('Error en verify2FA:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el código de 2 pasos.'
    });
  }
}

/**
 * 3. Reenviar código 2FA
 */
export async function resend2FA(req, res) {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'Token temporal no proporcionado.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        tempToken,
        process.env.JWT_2FA_SECRET || 'contapyme_temp_2fa_token_key_abcdef123456'
      );
    } catch (err) {
      return res.status(401).json({ success: false, message: 'La sesión temporal ha expirado.' });
    }

    const { rows: users } = await pool.query(
      'SELECT correo, nombre_usuario FROM usuarios WHERE id_usuario = $1',
      [decoded.id_usuario]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = users[0];
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidar anteriores
    await pool.query(
      `UPDATE codigos_2fa
       SET usado = TRUE
       WHERE id_usuario = $1
         AND (usado = FALSE OR usado IS NULL)`,
      [decoded.id_usuario]
    );

    // Insertar nuevo código con expiración calculada por PostgreSQL
    await pool.query(
      `INSERT INTO codigos_2fa (id_usuario, codigo, expiracion, usado)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', FALSE)`,
      [decoded.id_usuario, newCode]
    );

    await send2FACode(user.correo, user.nombre_usuario, newCode);

    await registrarBitacora(req, {
      id_usuario: decoded.id_usuario,
      nombre_usuario: user.nombre_usuario,
      accion: 'REENVIO_CODIGO_2FA',
      detalle: 'Nuevo código de verificación solicitado'
    });

    return res.json({
      success: true,
      message: 'Se ha reenviado un nuevo código a tu correo electrónico.',
      // devCode removed for production
    });
  } catch (err) {
    console.error('Error al reenviar 2FA:', err);
    return res.status(500).json({ success: false, message: 'Error interno al reenviar el código.' });
  }
}

/**
 * 4. Cerrar sesión (Manual o Automática por inactividad)
 */
export async function logout(req, res) {
  try {
    const { motivo } = req.body; // 'manual' | 'inactividad'
    const accion = motivo === 'inactividad' ? 'CIERRE_SESION_INACTIVIDAD' : 'CIERRE_SESION_MANUAL';
    const detalle = motivo === 'inactividad' 
      ? 'Sesión cerrada automáticamente tras periodo de inactividad'
      : 'Sesión cerrada voluntariamente por el usuario';

    let id_usuario = null;
    let nombre_usuario = null;

    // Intentar extraer datos del token si viene en los headers
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'contapyme_super_secret_jwt_key_2026_xyz987654321',
          { ignoreExpiration: true } // Permite registrar la bitácora aún si expiró
        );
        id_usuario = decoded.id_usuario;
        nombre_usuario = decoded.nombre_usuario;
      } catch (e) {
        // Ignorar error al decodificar token en logout
      }
    }

    await registrarBitacora(req, {
      id_usuario,
      nombre_usuario,
      accion,
      detalle
    });

    return res.json({
      success: true,
      message: motivo === 'inactividad' 
        ? 'Sesión cerrada automáticamente por inactividad.' 
        : 'Sesión cerrada con éxito.'
    });
  } catch (err) {
    console.error('Error en logout:', err);
    return res.status(500).json({ success: false, message: 'Error al procesar el cierre de sesión.' });
  }
}

/**
 * 5. Recuperar contraseña: Envío de enlace / token al correo
 */
export async function forgotPassword(req, res) {
  try {
    const { correo_o_usuario } = req.body;

    if (!correo_o_usuario) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, introduce tu correo electrónico o nombre de usuario.'
      });
    }

    const { rows } = await pool.query(`
      SELECT id_usuario, nombre_usuario, correo, estatus
      FROM usuarios
      WHERE correo = $1 OR nombre_usuario = $1
      LIMIT 1
    `, [correo_o_usuario.trim()]);

    // Por seguridad, si el usuario no existe, enviamos un mensaje genérico para no filtrar cuentas
    if (rows.length === 0) {
      return res.json({
        success: true,
        message: 'Si el correo o usuario está registrado y activo, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    const user = rows[0];

    if (Number(user.estatus) !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta está inactiva. Contacta al Administrador.'
      });
    }

    // Generar token criptográficamente seguro
    const token = crypto.randomBytes(32).toString('hex');

    // Invalidar tokens previos
    await pool.query(
      `UPDATE tokens_recuperacion
       SET usado = TRUE
       WHERE id_usuario = $1
         AND (usado = FALSE OR usado IS NULL)`,
      [user.id_usuario]
    );

    // Guardar token en tabla tokens_recuperacion
    await pool.query(
      `INSERT INTO tokens_recuperacion (id_usuario, token, expiracion, usado)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', FALSE)`,
      [user.id_usuario, token]
    );

    const clientUrl = req.headers['origin'] || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/?reset_token=${token}`;

    await sendPasswordResetEmail(user.correo, user.nombre_usuario, token, resetUrl);

    await registrarBitacora(req, {
      id_usuario: user.id_usuario,
      nombre_usuario: user.nombre_usuario,
      accion: 'SOLICITUD_RECUPERACION_CONTRASENA',
      detalle: `Token de restablecimiento generado y enviado a ${maskEmail(user.correo)}`
    });

    return res.json({
      success: true,
      message: 'Hemos enviado un enlace y código de recuperación a tu correo electrónico.',
      devToken: process.env.NODE_ENV !== 'production' ? token : undefined
    });

  } catch (err) {
    console.error('Error en forgotPassword:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la recuperación de contraseña.'
    });
  }
}

/**
 * 6. Restablecer contraseña con token recibido por correo
 */
export async function resetPassword(req, res) {
  try {
    const { token, nueva_contrasena } = req.body;

    if (!token || !nueva_contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (token y nueva contraseña).'
      });
    }

    if (nueva_contrasena.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres.'
      });
    }

    // Buscar token válido
    const { rows } = await pool.query(`
      SELECT tr.id_token, tr.id_usuario, tr.expiracion, u.nombre_usuario
      FROM tokens_recuperacion tr
      JOIN usuarios u ON u.id_usuario = tr.id_usuario
      WHERE tr.token = $1
        AND (tr.usado = FALSE OR tr.usado IS NULL)
        AND tr.expiracion > NOW()
      LIMIT 1
    `, [token.trim()]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El enlace o token de recuperación no es válido o ya ha expirado.'
      });
    }

    const { id_token, id_usuario, nombre_usuario } = rows[0];

    // Cifrar nueva contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nueva_contrasena, salt);

    // Actualizar contraseña de usuario
    await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id_usuario = $2', [hashedPassword, id_usuario]);

    // Marcar token como usado
    await pool.query('UPDATE tokens_recuperacion SET usado = TRUE WHERE id_token = $1', [id_token]);

    // Registrar en bitácora
    await registrarBitacora(req, {
      id_usuario,
      nombre_usuario,
      accion: 'RESTABLECIMIENTO_CONTRASENA_EXITOSO',
      detalle: 'Contraseña restablecida exitosamente mediante token de correo'
    });

    return res.json({
      success: true,
      message: 'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión.'
    });

  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña.'
    });
  }
}

/**
 * 7. Cambiar contraseña (para usuario autenticado indicando contraseña actual)
 */
export async function changePassword(req, res) {
  try {
    const { contrasena_actual, nueva_contrasena } = req.body;
    const { id_usuario, nombre_usuario } = req.user;

    if (!contrasena_actual || !nueva_contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar la contraseña actual y la nueva contraseña.'
      });
    }

    if (nueva_contrasena.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe contener al menos 6 caracteres.'
      });
    }

    // Obtener contraseña cifrada actual del usuario
    const { rows } = await pool.query(
      'SELECT contrasena FROM usuarios WHERE id_usuario = $1',
      [id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const isMatch = await bcrypt.compare(contrasena_actual, rows[0].contrasena);
    if (!isMatch) {
      await registrarBitacora(req, {
        id_usuario,
        nombre_usuario,
        accion: 'CAMBIO_CONTRASENA_FALLIDO',
        detalle: 'La contraseña actual ingresada es incorrecta'
      });
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual no es correcta.'
      });
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nueva_contrasena, salt);

    await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id_usuario = $2', [hashedPassword, id_usuario]);

    await registrarBitacora(req, {
      id_usuario,
      nombre_usuario,
      accion: 'CAMBIO_CONTRASENA_EXITOSO',
      detalle: 'El usuario actualizó su propia contraseña con éxito'
    });

    return res.json({
      success: true,
      message: 'Tu contraseña se ha actualizado correctamente.'
    });

  } catch (err) {
    console.error('Error en changePassword:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al cambiar la contraseña.'
    });
  }
}

/**
 * 8. Obtener datos del usuario autenticado actual
 */
export async function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user
  });
}

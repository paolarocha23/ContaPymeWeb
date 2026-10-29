import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { registrarBitacora } from '../utils/bitacora.js';

/**
 * Consultar y buscar usuarios (sin mostrar contraseña)
 * Permite filtrar por nombre/texto, rol y estatus
 */
export async function getUsers(req, res) {
  try {
    const { search, id_rol, estatus } = req.query;

    let query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
        u.nombre_usuario,
        u.correo,
        u.id_rol,
        r.nombre AS rol_nombre,
        r.estatus AS rol_estatus,
        u.estatus,
        u.fecha_creacion
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE 1=1
    `;
    const params = [];
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    // Filtro por búsqueda de nombre, apellidos, nombre_usuario o correo
    if (search && search.trim() !== '') {
      const p = addParam(`%${search.trim()}%`);
      query += ` AND (
        u.nombre ILIKE ${p} OR 
        u.apellido_paterno ILIKE ${p} OR 
        u.apellido_materno ILIKE ${p} OR 
        u.nombre_usuario ILIKE ${p} OR 
        u.correo ILIKE ${p}
      )`;
    }

    // Filtro por rol
    if (id_rol !== undefined && id_rol !== '') {
      const rol = Number(id_rol);
      if (!Number.isNaN(rol)) {
        query += ` AND u.id_rol = ${addParam(rol)}`;
      }
    }

    // Filtro por estatus
    if (estatus !== undefined && estatus !== '') {
      const status = Number(estatus) === 1 ? 1 : 0;
      query += ` AND u.estatus = ${addParam(status)}`;
    }

    query += ` ORDER BY u.id_usuario DESC`;

    const { rows } = await pool.query(query, params);

    return res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error en getUsers:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar usuarios.' });
  }
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido_paterno,
        u.apellido_materno,
        CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
        u.nombre_usuario,
        u.correo,
        u.id_rol,
        r.nombre AS rol_nombre,
        r.estatus AS rol_estatus,
        u.estatus,
        u.fecha_creacion
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1
      LIMIT 1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error en getUserById:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener el usuario.' });
  }
}

/**
 * Agregar Usuario
 * Campos: nombre, apellidos, nombre_usuario (único), contrasena cifrada, correo, rol activo.
 * Estatus inicial: activo (1).
 */
export async function createUser(req, res) {
  try {
    const { nombre, apellido_paterno, apellido_materno, nombre_usuario, contrasena, correo, id_rol } = req.body;

    // Validar obligatorios
    if (!nombre || !apellido_paterno || !nombre_usuario || !contrasena || !correo || !id_rol) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser completados (nombre, apellido paterno, nombre de usuario, contraseña, correo y rol).'
      });
    }

    if (contrasena.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe contener al menos 6 caracteres.'
      });
    }

    // Validar nombre_usuario único
    const { rows: userExist } = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE nombre_usuario = $1',
      [nombre_usuario.trim()]
    );
    if (userExist.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El nombre de usuario "${nombre_usuario}" ya está registrado. Elige otro.`
      });
    }

    // Validar correo único
    const { rows: emailExist } = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1',
      [correo.trim()]
    );
    if (emailExist.length > 0) {
      return res.status(400).json({
        success: false,
        message: `El correo electrónico "${correo}" ya está registrado.`
      });
    }

    // Validar que el rol exista y esté activo
    const { rows: roleRows } = await pool.query(
      'SELECT id_rol, nombre, estatus FROM roles WHERE id_rol = $1',
      [id_rol]
    );
    if (roleRows.length === 0) {
      return res.status(400).json({ success: false, message: 'El rol seleccionado no existe.' });
    }
    if (Number(roleRows[0].estatus) !== 1) {
      return res.status(400).json({
        success: false,
        message: `El rol "${roleRows[0].nombre}" se encuentra inactivo. Debes asignar un rol activo.`
      });
    }

    // Cifrar contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Insertar usuario con estatus inicial activo = 1
    const { rows: inserted } = await pool.query(`
      INSERT INTO usuarios 
        (nombre, apellido_paterno, apellido_materno, nombre_usuario, contrasena, correo, id_rol, estatus)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
      RETURNING id_usuario
    `, [
      nombre.trim(),
      apellido_paterno.trim(),
      apellido_materno ? apellido_materno.trim() : null,
      nombre_usuario.trim(),
      hashedPassword,
      correo.trim(),
      id_rol
    ]);

    const nuevoId = inserted[0].id_usuario;

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'CREACION_USUARIO',
      detalle: `Se registró al usuario "${nombre_usuario}" con rol "${roleRows[0].nombre}" (ID: ${nuevoId})`
    });

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente con estatus activo.',
      data: {
        id_usuario: nuevoId,
        nombre: nombre.trim(),
        apellido_paterno: apellido_paterno.trim(),
        apellido_materno: apellido_materno ? apellido_materno.trim() : null,
        nombre_usuario: nombre_usuario.trim(),
        correo: correo.trim(),
        id_rol,
        rol_nombre: roleRows[0].nombre,
        estatus: 1
      }
    });

  } catch (err) {
    console.error('Error en createUser:', err);
    return res.status(500).json({ success: false, message: 'Error interno al registrar usuario.' });
  }
}

/**
 * Modificar Usuario
 * Permite modificar los datos del usuario y su rol, excepto su identificador.
 * La contraseña se almacena cifrada y nunca se muestra.
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      apellido_paterno, 
      apellido_materno, 
      correo, 
      id_rol, 
      estatus,
      nueva_contrasena 
    } = req.body;

    // Verificar si existe el usuario
    const { rows: existing } = await pool.query(
      'SELECT * FROM usuarios WHERE id_usuario = $1',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const current = existing[0];

    // Verificar unicidad de correo si cambió
    if (correo && correo.trim() !== current.correo) {
      const { rows: emailDup } = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE correo = $1 AND id_usuario != $2',
        [correo.trim(), id]
      );
      if (emailDup.length > 0) {
        return res.status(400).json({
          success: false,
          message: `El correo "${correo}" ya está en uso por otro usuario.`
        });
      }
    }

    // Verificar rol si cambió
    if (id_rol && Number(id_rol) !== Number(current.id_rol)) {
      const { rows: roleCheck } = await pool.query(
        'SELECT nombre, estatus FROM roles WHERE id_rol = $1',
        [id_rol]
      );
      if (roleCheck.length === 0) {
        return res.status(400).json({ success: false, message: 'El rol seleccionado no existe.' });
      }
      if (Number(roleCheck[0].estatus) !== 1) {
        return res.status(400).json({
          success: false,
          message: 'No puedes asignar un rol inactivo.'
        });
      }
    }

    // Preparar campos para actualizar
    const updates = [];
    const params = [];
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (nombre) updates.push(`nombre = ${addParam(nombre.trim())}`);
    if (apellido_paterno) updates.push(`apellido_paterno = ${addParam(apellido_paterno.trim())}`);
    if (apellido_materno !== undefined) updates.push(`apellido_materno = ${addParam(apellido_materno ? apellido_materno.trim() : null)}`);
    if (correo) updates.push(`correo = ${addParam(correo.trim())}`);
    if (id_rol) updates.push(`id_rol = ${addParam(id_rol)}`);
    if (estatus !== undefined) updates.push(`estatus = ${addParam(Number(estatus) === 1 ? 1 : 0)}`);

    // Si se especificó una nueva contraseña, hashearla con bcrypt
    if (nueva_contrasena && nueva_contrasena.trim() !== '') {
      if (nueva_contrasena.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres.'
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(nueva_contrasena, salt);
      updates.push(`contrasena = ${addParam(hash)}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron datos para modificar.' });
    }

    const idParam = addParam(id);
    await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ${idParam}`,
      params
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'MODIFICACION_USUARIO',
      detalle: `Se modificaron los datos del usuario "${current.nombre_usuario}" (ID: ${id})`
    });

    return res.json({
      success: true,
      message: 'Usuario actualizado correctamente.'
    });

  } catch (err) {
    console.error('Error en updateUser:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar el usuario.' });
  }
}

/**
 * Activar / Desactivar Usuario
 * Los usuarios inactivos no podrán iniciar sesión ni realizar operaciones en el sistema.
 */
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { estatus } = req.body; // 1 o 0

    const newStatus = Number(estatus) === 1 ? 1 : 0;

    // No permitir que el usuario administrador se desactive a sí mismo
    if (Number(id) === Number(req.user.id_usuario) && newStatus === 0) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta mientras estás en sesión activa.'
      });
    }

    const { rows } = await pool.query(
      'SELECT nombre_usuario FROM usuarios WHERE id_usuario = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    await pool.query(
      'UPDATE usuarios SET estatus = $1 WHERE id_usuario = $2',
      [newStatus, id]
    );

    const accion = newStatus === 1 ? 'ACTIVACION_USUARIO' : 'DESACTIVACION_USUARIO';
    const detalle = newStatus === 1
      ? `Se reactivó la cuenta del usuario "${rows[0].nombre_usuario}"`
      : `Se desactivó la cuenta del usuario "${rows[0].nombre_usuario}". Ya no podrá ingresar ni operar.`;

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion,
      detalle
    });

    return res.json({
      success: true,
      message: newStatus === 1 ? 'Usuario activado exitosamente.' : 'Usuario desactivado. El acceso ha sido bloqueado.',
      estatus: newStatus
    });
  } catch (err) {
    console.error('Error en toggleUserStatus:', err);
    return res.status(500).json({ success: false, message: 'Error al cambiar estatus del usuario.' });
  }
}

/**
 * Restablecimiento de contraseña por el Administrador
 */
export async function adminResetPassword(req, res) {
  try {
    const { id } = req.params;
    const { nueva_contrasena } = req.body;

    if (!nueva_contrasena || nueva_contrasena.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar una nueva contraseña de al menos 6 caracteres.'
      });
    }

    const { rows } = await pool.query(
      'SELECT nombre_usuario, correo FROM usuarios WHERE id_usuario = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const user = rows[0];

    // Cifrar con bcrypt
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(nueva_contrasena, salt);

    await pool.query(
      'UPDATE usuarios SET contrasena = $1 WHERE id_usuario = $2',
      [hash, id]
    );

    // Invalidar cualquier token de recuperación pendiente
    await pool.query(
      `UPDATE tokens_recuperacion
       SET usado = TRUE
       WHERE id_usuario = $1
         AND (usado = FALSE OR usado IS NULL)`,
      [id]
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'RESTABLECIMIENTO_CONTRASENA_ADMIN',
      detalle: `El Administrador restableció la contraseña del usuario "${user.nombre_usuario}" (ID: ${id})`
    });

    return res.json({
      success: true,
      message: `Contraseña de "${user.nombre_usuario}" restablecida exitosamente por el Administrador.`
    });
  } catch (err) {
    console.error('Error en adminResetPassword:', err);
    return res.status(500).json({ success: false, message: 'Error al restablecer la contraseña del usuario.' });
  }
}

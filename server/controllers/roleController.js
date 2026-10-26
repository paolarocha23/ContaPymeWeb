import pool from '../config/db.js';
import { registrarBitacora } from '../utils/bitacora.js';

/**
 * Consultar y buscar roles
 */
export async function getRoles(req, res) {
  try {
    const { nombre } = req.query;
    let query = `
      SELECT 
        r.id_rol, 
        r.nombre, 
        r.descripcion, 
        r.estatus, 
        r.permisos, 
        r.fecha_creacion,
        COUNT(u.id_usuario) AS total_usuarios,
        SUM(CASE WHEN u.estatus = 1 THEN 1 ELSE 0 END) AS usuarios_activos
      FROM roles r
      LEFT JOIN usuarios u ON u.id_rol = r.id_rol
    `;
    const params = [];

    if (nombre && nombre.trim() !== '') {
      query += ` WHERE r.nombre LIKE ?`;
      params.push(`%${nombre.trim()}%`);
    }

    query += ` GROUP BY r.id_rol ORDER BY r.id_rol ASC`;

    const [rows] = await pool.query(query, params);

    // Formatear permisos
    const roles = rows.map(r => {
      let permisos = [];
      if (r.permisos) {
        try {
          permisos = typeof r.permisos === 'string' ? JSON.parse(r.permisos) : r.permisos;
        } catch (e) {
          permisos = [];
        }
      }
      return {
        ...r,
        permisos,
        es_predefinido: [1, 2, 3].includes(r.id_rol)
      };
    });

    return res.json({
      success: true,
      data: roles
    });
  } catch (err) {
    console.error('Error en getRoles:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar los roles.' });
  }
}

/**
 * Obtener un rol por su ID
 */
export async function getRoleById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM roles WHERE id_rol = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }

    const rol = rows[0];
    let permisos = [];
    if (rol.permisos) {
      try {
        permisos = typeof rol.permisos === 'string' ? JSON.parse(rol.permisos) : rol.permisos;
      } catch (e) {
        permisos = [];
      }
    }

    return res.json({
      success: true,
      data: { ...rol, permisos }
    });
  } catch (err) {
    console.error('Error en getRoleById:', err);
    return res.status(500).json({ success: false, message: 'Error al obtener el rol.' });
  }
}

/**
 * Agregar un nuevo rol
 */
export async function createRole(req, res) {
  try {
    const { nombre, descripcion, permisos } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del rol es obligatorio.' });
    }

    // Verificar unicidad de nombre
    const [exist] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ?', [nombre.trim()]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: `Ya existe un rol con el nombre "${nombre}".` });
    }

    const jsonPermisos = JSON.stringify(Array.isArray(permisos) ? permisos : []);

    const [result] = await pool.query(
      'INSERT INTO roles (nombre, descripcion, permisos, estatus) VALUES (?, ?, ?, 1)',
      [nombre.trim(), descripcion ? descripcion.trim() : null, jsonPermisos]
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'CREACION_ROL',
      detalle: `Se creó el nuevo rol "${nombre}" (ID: ${result.insertId})`
    });

    return res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente.',
      data: {
        id_rol: result.insertId,
        nombre: nombre.trim(),
        descripcion,
        permisos: Array.isArray(permisos) ? permisos : [],
        estatus: 1
      }
    });
  } catch (err) {
    console.error('Error en createRole:', err);
    return res.status(500).json({ success: false, message: 'Error al registrar el rol.' });
  }
}

/**
 * Modificar rol existente (nombre, descripción, permisos; excepto identificador)
 */
export async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, permisos } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del rol no puede estar vacío.' });
    }

    // Verificar si existe el rol
    const [rows] = await pool.query('SELECT * FROM roles WHERE id_rol = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }

    // Verificar que el nombre no esté duplicado en otro rol
    const [dup] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ? AND id_rol != ?', [nombre.trim(), id]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: `El nombre "${nombre}" ya está en uso por otro rol.` });
    }

    const jsonPermisos = JSON.stringify(Array.isArray(permisos) ? permisos : []);

    await pool.query(
      'UPDATE roles SET nombre = ?, descripcion = ?, permisos = ? WHERE id_rol = ?',
      [nombre.trim(), descripcion ? descripcion.trim() : null, jsonPermisos, id]
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'MODIFICACION_ROL',
      detalle: `Se modificó el rol ID ${id} (${nombre})`
    });

    return res.json({
      success: true,
      message: 'Rol actualizado exitosamente.'
    });
  } catch (err) {
    console.error('Error en updateRole:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar el rol.' });
  }
}

/**
 * Desactivar o Activar rol
 * Los usuarios que pertenezcan a un rol desactivado no podrán acceder al sistema.
 */
export async function toggleRoleStatus(req, res) {
  try {
    const { id } = req.params;
    const { estatus } = req.body; // 1 o 0

    const newStatus = Number(estatus) === 1 ? 1 : 0;

    // Proteger el rol de Administrador principal de desactivación accidental
    if (Number(id) === 1 && newStatus === 0) {
      return res.status(400).json({
        success: false,
        message: 'No es posible desactivar el rol principal de Administrador por seguridad del sistema.'
      });
    }

    const [rows] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado.' });
    }

    const rol = rows[0];

    await pool.query('UPDATE roles SET estatus = ? WHERE id_rol = ?', [newStatus, id]);

    // Contar cuántos usuarios se verán afectados
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE id_rol = ?', [id]);
    const totalAfectados = countRows[0].total;

    const accionStr = newStatus === 1 ? 'ACTIVACION_ROL' : 'DESACTIVACION_ROL';
    const detalleStr = newStatus === 1
      ? `Se reactivó el rol "${rol.nombre}". Sus ${totalAfectados} usuario(s) ahora pueden acceder.`
      : `Se desactivó el rol "${rol.nombre}". Sus ${totalAfectados} usuario(s) ya NO podrán ingresar al sistema.`;

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: accionStr,
      detalle: detalleStr
    });

    return res.json({
      success: true,
      message: newStatus === 1 
        ? `Rol "${rol.nombre}" activado exitosamente.`
        : `Rol "${rol.nombre}" desactivado. Los usuarios asignados a este rol no podrán acceder hasta que se reactive o cambie su rol.`,
      usuariosAfectados: totalAfectados,
      estatus: newStatus
    });
  } catch (err) {
    console.error('Error en toggleRoleStatus:', err);
    return res.status(500).json({ success: false, message: 'Error al cambiar el estatus del rol.' });
  }
}

/**
 * Cambiar el rol actual a un usuario
 */
export async function assignUserRole(req, res) {
  try {
    const { id_usuario } = req.params;
    const { id_rol } = req.body;

    if (!id_rol) {
      return res.status(400).json({ success: false, message: 'Debes especificar el nuevo id_rol.' });
    }

    // Verificar que el rol destino exista y esté activo
    const [roles] = await pool.query('SELECT nombre, estatus FROM roles WHERE id_rol = ?', [id_rol]);
    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: 'El rol especificado no existe.' });
    }

    if (roles[0].estatus !== 1) {
      return res.status(400).json({
        success: false,
        message: 'No puedes asignar un rol desactivado a un usuario.'
      });
    }

    // Obtener datos del usuario
    const [users] = await pool.query('SELECT nombre_usuario, id_rol FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    await pool.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [id_rol, id_usuario]);

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'CAMBIO_ROL_USUARIO',
      detalle: `Se cambió el rol de "${users[0].nombre_usuario}" al rol "${roles[0].nombre}" (ID: ${id_rol})`
    });

    return res.json({
      success: true,
      message: `Rol asignado correctamente a ${users[0].nombre_usuario}.`
    });
  } catch (err) {
    console.error('Error en assignUserRole:', err);
    return res.status(500).json({ success: false, message: 'Error al asignar el rol al usuario.' });
  }
}

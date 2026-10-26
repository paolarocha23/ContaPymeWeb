import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

/**
 * Middleware para validar el JWT de sesión activa
 */
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autorización'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'contapyme_super_secret_jwt_key_2026_xyz987654321');

    // Verificar en la base de datos si el usuario y su rol siguen activos
    const [rows] = await pool.query(`
      SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellido_paterno, 
        u.apellido_materno, 
        u.nombre_usuario, 
        u.correo, 
        u.id_rol, 
        u.estatus AS usuario_estatus,
        r.nombre AS rol_nombre,
        r.estatus AS rol_estatus,
        r.permisos
      FROM usuarios u
      JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ?
      LIMIT 1
    `, [decoded.id_usuario]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o sesión inválida'
      });
    }

    const user = rows[0];

    // Verificar estatus del usuario
    if (user.usuario_estatus !== 1) {
      return res.status(403).json({
        success: false,
        code: 'USER_INACTIVE',
        message: 'Tu cuenta ha sido desactivada por el Administrador. No puedes realizar operaciones.'
      });
    }

    // Verificar estatus del rol
    if (user.rol_estatus !== 1) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_INACTIVE',
        message: 'El rol asignado a tu cuenta está inactivo. Tu acceso ha sido revocado.'
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

    req.user = {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno,
      nombre_completo: `${user.nombre} ${user.apellido_paterno} ${user.apellido_materno || ''}`.trim(),
      nombre_usuario: user.nombre_usuario,
      correo: user.correo,
      id_rol: user.id_rol,
      rol_nombre: user.rol_nombre,
      permisos
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token inválido o manipulado'
    });
  }
}

/**
 * Middleware para exigir rol Administrador
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol_nombre !== 'Administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: se requieren privilegios de Administrador'
    });
  }
  next();
}

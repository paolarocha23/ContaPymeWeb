import pool from '../config/db.js';

/**
 * Registra un evento en la tabla bitacora_accesos
 * @param {object} req - Objeto de petición Express
 * @param {object} param1 - { id_usuario, nombre_usuario, accion, detalle }
 */
export async function registrarBitacora(req, { id_usuario = null, nombre_usuario = null, accion, detalle = null }) {
  try {
    let ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || '127.0.0.1';
    if (typeof ip === 'string' && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    // Normalizar IPv6 localhost ::1 a 127.0.0.1 para legibilidad
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }

    await pool.query(
      `INSERT INTO bitacora_accesos (id_usuario, nombre_usuario, accion, ip_origen, detalle)
       VALUES (?, ?, ?, ?, ?)`,
      [id_usuario, nombre_usuario, accion, ip, detalle]
    );
  } catch (err) {
    console.error('⚠️ Error al registrar en bitacora_accesos:', err.message);
  }
}

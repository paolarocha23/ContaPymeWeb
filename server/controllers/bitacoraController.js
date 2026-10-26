import pool from '../config/db.js';

/**
 * Consultar registros de la bitácora de accesos
 */
export async function getBitacora(req, res) {
  try {
    const { accion, nombre_usuario, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        id_bitacora,
        id_usuario,
        nombre_usuario,
        accion,
        ip_origen,
        fecha,
        detalle
      FROM bitacora_accesos
      WHERE 1=1
    `;
    const params = [];

    if (accion && accion.trim() !== '') {
      query += ` AND accion LIKE ?`;
      params.push(`%${accion.trim()}%`);
    }

    if (nombre_usuario && nombre_usuario.trim() !== '') {
      query += ` AND nombre_usuario LIKE ?`;
      params.push(`%${nombre_usuario.trim()}%`);
    }

    query += ` ORDER BY id_bitacora DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);

    const [totalRows] = await pool.query('SELECT COUNT(*) AS total FROM bitacora_accesos');

    return res.json({
      success: true,
      total: totalRows[0].total,
      data: rows
    });
  } catch (err) {
    console.error('Error en getBitacora:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar la bitácora de accesos.' });
  }
}

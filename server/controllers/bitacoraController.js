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
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (accion && accion.trim() !== '') {
      query += ` AND accion ILIKE ${addParam(`%${accion.trim()}%`)}`;
    }

    if (nombre_usuario && nombre_usuario.trim() !== '') {
      query += ` AND nombre_usuario ILIKE ${addParam(`%${nombre_usuario.trim()}%`)}`;
    }

    const limite = Math.max(1, Number(limit) || 50);
    const desplazamiento = Math.max(0, Number(offset) || 0);

    query += ` ORDER BY id_bitacora DESC LIMIT ${addParam(limite)} OFFSET ${addParam(desplazamiento)}`;

    const { rows } = await pool.query(query, params);

    const { rows: totalRows } = await pool.query(
      'SELECT COUNT(*) AS total FROM bitacora_accesos'
    );

    return res.json({
      success: true,
      total: Number(totalRows[0].total),
      data: rows
    });
  } catch (err) {
    console.error('Error en getBitacora:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar la bitácora de accesos.' });
  }
}

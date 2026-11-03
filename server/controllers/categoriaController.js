import pool from '../config/db.js';
import { registrarBitacora } from '../utils/bitacora.js';

const MAX_NOMBRE = 80;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getCategorias(req, res) {
  try {
    const { search, estatus } = req.query;

    let query = `
      SELECT id_categoria, nombre, descripcion, estatus
      FROM categorias
      WHERE 1=1
    `;
    const params = [];
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (search && search.trim() !== '') {
      const p = addParam(`%${search.trim()}%`);
      query += ` AND (nombre ILIKE ${p} OR descripcion ILIKE ${p})`;
    }

    if (estatus !== undefined && estatus !== '') {
      query += ` AND estatus = ${addParam(Number(estatus) === 1 ? 1 : 0)}`;
    }

    query += ' ORDER BY id_categoria ASC';

    const { rows } = await pool.query(query, params);

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error en getCategorias:', err);
    return res.status(500).json({ success: false, message: 'Error al consultar las categorías.' });
  }
}

export async function createCategoria(req, res) {
  try {
    const nombre = (req.body.nombre || '').trim();
    const descripcion = (req.body.descripcion || '').trim();

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio.' });
    }
    if (nombre.length > MAX_NOMBRE) {
      return res.status(400).json({
        success: false,
        message: `El nombre no puede tener más de ${MAX_NOMBRE} caracteres.`
      });
    }

    const { rows: duplicadas } = await pool.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)',
      [nombre]
    );
    if (duplicadas.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una categoría llamada "${nombre}".`
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO categorias (nombre, descripcion, estatus)
       VALUES ($1, $2, 1)
       RETURNING id_categoria, nombre, descripcion, estatus`,
      [nombre, descripcion || null]
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'CREACION_CATEGORIA',
      detalle: `Se registró la categoría "${nombre}" (ID: ${rows[0].id_categoria})`
    });

    return res.status(201).json({
      success: true,
      message: 'Categoría registrada exitosamente con estatus activo.',
      data: rows[0]
    });
  } catch (err) {
    console.error('Error en createCategoria:', err);
    return res.status(500).json({ success: false, message: 'Error interno al registrar la categoría.' });
  }
}

export async function updateCategoria(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Identificador de categoría no válido.' });
    }

    const nombre = (req.body.nombre || '').trim();
    const descripcion = (req.body.descripcion || '').trim();

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio.' });
    }
    if (nombre.length > MAX_NOMBRE) {
      return res.status(400).json({
        success: false,
        message: `El nombre no puede tener más de ${MAX_NOMBRE} caracteres.`
      });
    }

    const { rows: existing } = await pool.query(
      'SELECT id_categoria, nombre FROM categorias WHERE id_categoria = $1',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    }

    const { rows: duplicadas } = await pool.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1) AND id_categoria != $2',
      [nombre, id]
    );
    if (duplicadas.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Ya existe otra categoría llamada "${nombre}".`
      });
    }

    await pool.query(
      'UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id_categoria = $3',
      [nombre, descripcion || null, id]
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: 'MODIFICACION_CATEGORIA',
      detalle: `Se modificó la categoría "${existing[0].nombre}" (ID: ${id})`
    });

    return res.json({ success: true, message: 'Categoría actualizada correctamente.' });
  } catch (err) {
    console.error('Error en updateCategoria:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar la categoría.' });
  }
}

export async function toggleCategoriaStatus(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Identificador de categoría no válido.' });
    }

    const newStatus = Number(req.body.estatus) === 1 ? 1 : 0;

    const { rows } = await pool.query(
      'SELECT nombre FROM categorias WHERE id_categoria = $1',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    }

    if (newStatus === 0) {
      const { rows: uso } = await pool.query(
        'SELECT COUNT(*)::int AS total FROM productos WHERE id_categoria = $1',
        [id]
      );
      if (uso[0].total > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede desactivar la categoría "${rows[0].nombre}" porque tiene ${uso[0].total} producto(s) o servicio(s) asociado(s).`
        });
      }
    }

    await pool.query(
      'UPDATE categorias SET estatus = $1 WHERE id_categoria = $2',
      [newStatus, id]
    );

    await registrarBitacora(req, {
      id_usuario: req.user.id_usuario,
      nombre_usuario: req.user.nombre_usuario,
      accion: newStatus === 1 ? 'ACTIVACION_CATEGORIA' : 'DESACTIVACION_CATEGORIA',
      detalle: newStatus === 1
        ? `Se activó la categoría "${rows[0].nombre}" (ID: ${id})`
        : `Se desactivó la categoría "${rows[0].nombre}" (ID: ${id})`
    });

    return res.json({
      success: true,
      message: newStatus === 1 ? 'Categoría activada exitosamente.' : 'Categoría desactivada exitosamente.',
      estatus: newStatus
    });
  } catch (err) {
    console.error('Error en toggleCategoriaStatus:', err);
    return res.status(500).json({ success: false, message: 'Error al cambiar el estatus de la categoría.' });
  }
}
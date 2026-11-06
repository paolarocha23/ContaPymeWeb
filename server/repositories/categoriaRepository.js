import pool from '../config/db.js';

const COLUMNAS = 'c.id_categoria, c.nombre, c.descripcion, c.estatus';

/** Lista con búsqueda por nombre/descripción y filtro de estatus. Incluye conteo de productos asociados. */
export async function list({ q, estatus } = {}) {
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  let where = 'WHERE 1=1';

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND (c.nombre ILIKE ${p} OR c.descripcion ILIKE ${p})`;
  }
  if (estatus !== undefined) where += ` AND c.estatus = ${add(estatus)}`;

  const { rows } = await pool.query(
    `SELECT ${COLUMNAS},
       COALESCE((SELECT COUNT(*)::int FROM productos pr WHERE pr.id_categoria = c.id_categoria), 0) AS asociados
     FROM categorias c ${where} ORDER BY c.id_categoria ASC`,
    params
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM categorias c WHERE c.id_categoria = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/** Busca una categoría por nombre (sin distinguir mayúsculas), excluyendo opcionalmente un id. */
export async function findByNombre(nombre, excluirId = null) {
  const { rows } = await pool.query(
    `SELECT id_categoria FROM categorias
     WHERE LOWER(nombre) = LOWER($1) AND ($2::int IS NULL OR id_categoria <> $2)
     LIMIT 1`,
    [nombre, excluirId]
  );
  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO categorias (nombre, descripcion, estatus)
     VALUES ($1, $2, 1)
     RETURNING id_categoria`,
    [d.nombre, d.descripcion]
  );
  return findById(rows[0].id_categoria);
}

/** Actualiza los datos editables. El identificador nunca se toca. */
export async function update(id, d) {
  await pool.query(
    'UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id_categoria = $3',
    [d.nombre, d.descripcion, id]
  );
  return findById(id);
}

export async function updateStatus(id, estatus) {
  await pool.query('UPDATE categorias SET estatus = $1 WHERE id_categoria = $2', [estatus, id]);
}

/** Tarjetas de resumen del catálogo (independientes de los filtros). */
export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estatus = 1)::int AS activos,
      COUNT(*) FILTER (WHERE estatus = 0)::int AS inactivos
    FROM categorias
  `);
  return rows[0];
}

/** Número de productos/servicios asociados. Si la tabla aún no existe, devuelve 0. */
export async function contarProductos(id) {
  const { rows: t } = await pool.query(`SELECT to_regclass('public.productos') IS NOT NULL AS existe`);
  if (!t[0].existe) return 0;
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM productos WHERE id_categoria = $1',
    [id]
  );
  return rows[0].total;
}

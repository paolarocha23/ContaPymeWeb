import pool from '../config/db.js';

const COLUMNAS = `
  p.id_proveedor, p.nombre_empresa, p.nombre_contacto, p.telefono, p.correo,
  p.calle, p.colonia, p.ciudad, p.estado, p.estatus
`;

/** Lista con búsqueda por empresa/contacto y filtro de estatus. */
export async function list({ q, estatus } = {}) {
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  let where = 'WHERE 1=1';

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND (p.nombre_empresa ILIKE ${p} OR p.nombre_contacto ILIKE ${p})`;
  }
  if (estatus !== undefined) where += ` AND p.estatus = ${add(estatus)}`;

  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM proveedores p ${where} ORDER BY p.id_proveedor DESC`,
    params
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM proveedores p WHERE p.id_proveedor = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO proveedores
       (nombre_empresa, nombre_contacto, telefono, correo, calle, colonia, ciudad, estado, estatus)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, 1)
     RETURNING id_proveedor`,
    [d.nombre_empresa, d.nombre_contacto, d.telefono, d.correo,
     d.calle, d.colonia, d.ciudad, d.estado]
  );
  return findById(rows[0].id_proveedor);
}

/** Actualiza los datos editables. El identificador nunca se toca. */
export async function update(id, d) {
  await pool.query(
    `UPDATE proveedores SET
       nombre_empresa = $1, nombre_contacto = $2, telefono = $3, correo = $4,
       calle = $5, colonia = $6, ciudad = $7, estado = $8
     WHERE id_proveedor = $9`,
    [d.nombre_empresa, d.nombre_contacto, d.telefono, d.correo,
     d.calle, d.colonia, d.ciudad, d.estado, id]
  );
  return findById(id);
}

export async function updateStatus(id, estatus) {
  await pool.query('UPDATE proveedores SET estatus = $1 WHERE id_proveedor = $2', [estatus, id]);
}

/** Tarjetas de resumen del catálogo. */
export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estatus = 1)::int AS activos,
      COUNT(*) FILTER (WHERE estatus = 0)::int AS inactivos
    FROM proveedores
  `);
  return rows[0];
}

/**
 * Número de compras asociadas al proveedor. 
 * Si la tabla "compras" aún no existe (módulo de Compras pendiente), devuelve 0.
 */
export async function contarCompras(id) {
  const { rows: t } = await pool.query(`SELECT to_regclass('public.compras') IS NOT NULL AS existe`);
  if (!t[0].existe) return 0;
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM compras WHERE id_proveedor = $1',
    [id]
  );
  return rows[0].total;
}

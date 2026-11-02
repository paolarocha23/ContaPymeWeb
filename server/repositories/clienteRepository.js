import pool from '../config/db.js';

/**
 * Capa de acceso a datos de clientes: aquí vive TODO el SQL.
 *
 * Tablas que usa (las mismas que ya tienes): clientes, ventas, detalle_ventas,
 * productos, cuentas_por_cobrar, cxc_cobros.
 *
 * Saldo pendiente = suma de cuentas_por_cobrar.saldo_pendiente del cliente
 * (las cuentas canceladas no cuentan).
 */

const SALDO_SQL = `
  COALESCE((
    SELECT SUM(cx.saldo_pendiente)
      FROM cuentas_por_cobrar cx
     WHERE cx.id_cliente = c.id_cliente
       AND LOWER(COALESCE(cx.estatus, '')) NOT LIKE 'cancelad%'
  ), 0)`;

const COLUMNAS = `
  c.id_cliente, c.nombre_cliente, c.apellido_paterno, c.apellido_materno,
  CONCAT_WS(' ', c.nombre_cliente, c.apellido_paterno, c.apellido_materno) AS nombre_completo,
  c.calle, c.num_exterior, c.colonia, c.codigo_postal, c.ciudad, c.estado,
  c.telefono, c.correo, c.fecha_registro, c.estatus,
  ${SALDO_SQL} AS saldo_pendiente
`;

/** Lista con búsqueda por nombre y filtros. */
export async function list({ q, estatus, ciudad, estado, colonia, adeudo } = {}) {
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  let where = 'WHERE 1=1';

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND CONCAT_WS(' ', c.nombre_cliente, c.apellido_paterno, c.apellido_materno) ILIKE ${p}`;
  }
  if (estatus !== undefined) where += ` AND c.estatus = ${add(estatus)}`;
  if (ciudad) where += ` AND c.ciudad = ${add(ciudad)}`;
  if (estado) where += ` AND c.estado = ${add(estado)}`;
  if (colonia) where += ` AND c.colonia = ${add(colonia)}`;
  if (adeudo === 'con') where += ` AND ${SALDO_SQL} > 0`;
  if (adeudo === 'sin') where += ` AND ${SALDO_SQL} <= 0`;

  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM clientes c ${where} ORDER BY c.id_cliente DESC`,
    params
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM clientes c WHERE c.id_cliente = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(
    `INSERT INTO clientes
       (nombre_cliente, apellido_paterno, apellido_materno, calle, num_exterior,
        colonia, codigo_postal, ciudad, estado, telefono, correo, estatus)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, 1)
     RETURNING id_cliente`,
    [d.nombre_cliente, d.apellido_paterno, d.apellido_materno, d.calle, d.num_exterior,
     d.colonia, d.codigo_postal, d.ciudad, d.estado, d.telefono, d.correo]
  );
  return findById(rows[0].id_cliente);
}

/** Actualiza los datos editables. El identificador nunca se toca. */
export async function update(id, d) {
  await pool.query(
    `UPDATE clientes SET
       nombre_cliente = $1, apellido_paterno = $2, apellido_materno = $3, calle = $4,
       num_exterior = $5, colonia = $6, codigo_postal = $7, ciudad = $8, estado = $9,
       telefono = $10, correo = $11
     WHERE id_cliente = $12`,
    [d.nombre_cliente, d.apellido_paterno, d.apellido_materno, d.calle, d.num_exterior,
     d.colonia, d.codigo_postal, d.ciudad, d.estado, d.telefono, d.correo, id]
  );
  return findById(id);
}

/** Activa o Desactiva al cliente, nunca se elimina */
export async function updateStatus(id, estatus) {
  await pool.query('UPDATE clientes SET estatus = $1 WHERE id_cliente = $2', [estatus, id]);
}

/** Tarjetas de resumen del catálogo. */
export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE c.estatus = 1)::int AS activos,
      COUNT(*) FILTER (WHERE c.estatus = 0)::int AS inactivos,
      COUNT(*) FILTER (WHERE ${SALDO_SQL} > 0)::int AS con_adeudo
    FROM clientes c
  `);
  return rows[0];
}

/** Valores para llenar los selectores de filtro (ciudad, estado, colonia). */
export async function opciones() {
  const distinct = async (col) => {
    const { rows } = await pool.query(
      `SELECT DISTINCT ${col} AS v FROM clientes WHERE ${col} IS NOT NULL ORDER BY ${col}`
    );
    return rows.map((r) => r.v);
  };
  const [ciudades, estados, colonias] = await Promise.all([
    distinct('ciudad'), distinct('estado'), distinct('colonia')
  ]);
  return { ciudades, estados, colonias };
}

/** Ventas y cobros del cliente. */
export async function historial(id) {
  const { rows: ventas } = await pool.query(
    `SELECT v.id_venta, v.codigo, v.fecha, v.total, v.monto_pagado, v.estatus,
            (SELECT STRING_AGG(DISTINCT p.nombre, ', ')
               FROM detalle_ventas dv
               JOIN productos p ON p.id_producto = dv.id_producto
              WHERE dv.id_venta = v.id_venta) AS productos
       FROM ventas v
      WHERE v.id_cliente = $1
      ORDER BY v.fecha DESC, v.id_venta DESC`,
    [id]
  );

  const { rows: cobros } = await pool.query(
    `SELECT cb.id_cobro, cb.fecha, cb.monto, cb.forma_pago,
            v.id_venta, v.codigo AS venta_codigo
       FROM cxc_cobros cb
       JOIN cuentas_por_cobrar cx ON cx.id_cxc = cb.id_cxc
       LEFT JOIN ventas v ON v.id_venta = cx.id_venta
      WHERE cx.id_cliente = $1
      ORDER BY cb.fecha DESC, cb.id_cobro DESC`,
    [id]
  );

  return { ventas, cobros };
}
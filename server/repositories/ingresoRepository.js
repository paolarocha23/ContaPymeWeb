import pool from '../config/db.js';

const COLUMNAS = `
  i.id_ingreso,
  i.fecha,
  i.concepto,
  i.id_categoria,
  c.nombre AS nombre_categoria,
  i.monto,
  i.forma_pago,
  i.origen,
  i.id_venta,
  i.id_cobro,
  COALESCE(v.codigo, vc.codigo) AS folio_venta,
  i.id_usuario,
  u.nombre_usuario,
  TRIM(CONCAT_WS(' ', u.nombre, u.apellido_paterno)) AS nombre_completo,
  i.estatus
`;

// El folio de venta sale directo (origen venta) o a través del cobro → cuenta por cobrar → venta.
const DESDE = `
  FROM ingresos i
  INNER JOIN categorias c ON c.id_categoria = i.id_categoria
  INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
  LEFT JOIN ventas v ON v.id_venta = i.id_venta
  LEFT JOIN cxc_cobros co ON co.id_cobro = i.id_cobro
  LEFT JOIN cuentas_por_cobrar cx ON cx.id_cxc = co.id_cxc
  LEFT JOIN ventas vc ON vc.id_venta = cx.id_venta
`;

// pg devuelve numeric como string.
const num = (v) => (v === null || v === undefined ? v : Number(v));

const normalizar = (r) => r && ({ ...r, monto: num(r.monto) });

/**
 * Ejecuta fn dentro de una transacción (todo o nada, NF05).
 */
export async function conTransaccion(fn) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* sin acción */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function list({ q, desde, hasta, id_categoria, origen, forma_pago, estatus } = {}) {
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  let where = 'WHERE 1=1';

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND (i.concepto ILIKE ${p}
      OR COALESCE(v.codigo, vc.codigo, '') ILIKE ${p}
      OR ('ING-' || LPAD(i.id_ingreso::text, 4, '0')) ILIKE ${p})`;
  }

  if (desde) where += ` AND i.fecha >= ${add(desde)}::date`;
  if (hasta) where += ` AND i.fecha < (${add(hasta)}::date + 1)`;
  if (id_categoria !== undefined) where += ` AND i.id_categoria = ${add(id_categoria)}`;
  if (origen) where += ` AND i.origen = ${add(origen)}`;
  if (forma_pago) where += ` AND i.forma_pago = ${add(forma_pago)}`;
  if (estatus) where += ` AND i.estatus = ${add(estatus)}`;

  const { rows } = await pool.query(`
    SELECT ${COLUMNAS}
    ${DESDE}
    ${where}
    ORDER BY i.fecha DESC, i.id_ingreso DESC
  `, params);

  return rows.map(normalizar);
}

export async function findById(id, db = pool) {
  const { rows } = await db.query(`
    SELECT ${COLUMNAS}
    ${DESDE}
    WHERE i.id_ingreso = $1
    LIMIT 1
  `, [id]);

  return normalizar(rows[0]) || null;
}

/**
 * Bloquea la fila del ingreso durante la transacción para evitar
 * que dos cancelaciones/modificaciones simultáneas dupliquen movimientos de caja.
 */
export async function bloquear(client, id) {
  const { rows } = await client.query(`
    SELECT id_ingreso, fecha, concepto, id_categoria, monto, forma_pago,
           origen, id_venta, id_cobro, id_usuario, estatus
    FROM ingresos
    WHERE id_ingreso = $1
    FOR UPDATE
  `, [id]);

  return normalizar(rows[0]) || null;
}

// fecha = 'AAAA-MM-DD' (se le agrega la hora actual) o null (= ahora)
export async function insert(client, d) {
  const { rows } = await client.query(`
    INSERT INTO ingresos (
      fecha, concepto, id_categoria, monto, forma_pago,
      origen, id_venta, id_cobro, id_usuario, estatus
    )
    VALUES (
      COALESCE($1::date + LOCALTIME, CURRENT_TIMESTAMP),
      $2, $3, $4, $5, $6, $7, $8, $9, 'activo'
    )
    RETURNING id_ingreso, fecha
  `, [
    d.fecha ?? null,
    d.concepto,
    d.id_categoria,
    d.monto,
    d.forma_pago,
    d.origen,
    d.id_venta ?? null,
    d.id_cobro ?? null,
    d.id_usuario
  ]);

  return rows[0];
}

// Si la fecha no cambia de día se conserva la hora original.
export async function update(client, id, d) {
  await client.query(`
    UPDATE ingresos
    SET fecha = CASE
          WHEN $1::date IS NULL OR fecha::date = $1::date THEN fecha
          ELSE $1::date + LOCALTIME
        END,
        concepto = $2,
        id_categoria = $3,
        monto = $4,
        forma_pago = $5
    WHERE id_ingreso = $6
  `, [d.fecha ?? null, d.concepto, d.id_categoria, d.monto, d.forma_pago, id]);
}

// RDF1105 – se conserva el registro, solo cambia el estatus
export async function marcarCancelado(client, id) {
  await client.query(
    `UPDATE ingresos SET estatus = 'cancelado' WHERE id_ingreso = $1`,
    [id]
  );
}

// RDF1304 / RDF1105 – movimientos de caja ligados al ingreso (origen "ingreso")
export async function insertarMovimientoCaja(client, d) {
  await client.query(`
    INSERT INTO movimientos_caja (fecha, tipo, concepto, monto, origen, id_referencia, id_usuario)
    VALUES (COALESCE($1, CURRENT_TIMESTAMP), $2, $3, $4, 'ingreso', $5, $6)
  `, [d.fecha ?? null, d.tipo, d.concepto, d.monto, d.id_referencia, d.id_usuario]);
}

/**
 * Ingresos activos generados por una venta o por sus cobros (para cancelarlos
 * junto con la operación de origen). Bloquea las filas encontradas.
 */
export async function activosPorOrigen(client, id_venta, ids_cobro = []) {
  const { rows } = await client.query(`
    SELECT id_ingreso, concepto, monto, forma_pago
    FROM ingresos
    WHERE estatus = 'activo'
      AND (
        (origen = 'venta' AND id_venta = $1::int)
        OR (origen = 'cobro' AND id_cobro = ANY($2::int[]))
      )
    FOR UPDATE
  `, [id_venta ?? null, ids_cobro]);

  return rows.map(normalizar);
}

export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(monto) FILTER (WHERE estatus = 'activo'), 0) AS total,
      COALESCE(SUM(monto) FILTER (
        WHERE estatus = 'activo'
          AND date_trunc('month', fecha) = date_trunc('month', LOCALTIMESTAMP)
      ), 0) AS total_mes,
      COALESCE(SUM(monto) FILTER (WHERE estatus = 'activo' AND forma_pago = 'efectivo'), 0) AS efectivo,
      COALESCE(SUM(monto) FILTER (WHERE estatus = 'activo' AND forma_pago = 'tarjeta'), 0) AS tarjeta,
      COALESCE(SUM(monto) FILTER (
        WHERE estatus = 'activo' AND forma_pago = 'efectivo'
          AND date_trunc('month', fecha) = date_trunc('month', LOCALTIMESTAMP)
      ), 0) AS efectivo_mes,
      COALESCE(SUM(monto) FILTER (
        WHERE estatus = 'activo' AND forma_pago = 'tarjeta'
          AND date_trunc('month', fecha) = date_trunc('month', LOCALTIMESTAMP)
      ), 0) AS tarjeta_mes,
      COUNT(*) FILTER (WHERE estatus = 'activo')::int AS activos,
      COUNT(*) FILTER (WHERE estatus = 'cancelado')::int AS cancelados,
      COUNT(*) FILTER (WHERE estatus = 'activo' AND origen = 'otro')::int AS manuales
    FROM ingresos
  `);

  const r = rows[0];

  return {
    ...r,
    total: num(r.total),
    total_mes: num(r.total_mes),
    efectivo: num(r.efectivo),
    tarjeta: num(r.tarjeta),
    efectivo_mes: num(r.efectivo_mes),
    tarjeta_mes: num(r.tarjeta_mes)
  };
}

// Incluye inactivas: un ingreso histórico puede tener una categoría que ya se desactivó.
export async function categorias() {
  const { rows } = await pool.query(`
    SELECT id_categoria, nombre, estatus
    FROM categorias
    ORDER BY nombre ASC
  `);

  return rows;
}

// RDF1104 – venta relacionada (directa o a través del cobro)
export async function ventaRelacionada(ingreso) {
  if (!ingreso.id_venta && !ingreso.id_cobro) return null;

  const { rows } = await pool.query(`
    SELECT
      v.id_venta, v.codigo, v.fecha, v.total, v.monto_pagado, v.estatus,
      TRIM(CONCAT_WS(' ', c.nombre_cliente, c.apellido_paterno, c.apellido_materno)) AS nombre_cliente,
      TRIM(CONCAT_WS(' ', uv.nombre, uv.apellido_paterno)) AS nombre_vendedor
    FROM ventas v
    LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
    LEFT JOIN usuarios uv ON uv.id_usuario = v.id_usuario
    WHERE v.id_venta = COALESCE(
      $1::int,
      (SELECT cx.id_venta
         FROM cxc_cobros co
         JOIN cuentas_por_cobrar cx ON cx.id_cxc = co.id_cxc
        WHERE co.id_cobro = $2::int)
    )
    LIMIT 1
  `, [ingreso.id_venta ?? null, ingreso.id_cobro ?? null]);

  const v = rows[0];
  return v ? { ...v, total: num(v.total), monto_pagado: num(v.monto_pagado) } : null;
}

// Historial de caja del ingreso (incluye reversas por cancelación o corrección)
export async function movimientosCaja(id_ingreso) {
  const { rows } = await pool.query(`
    SELECT id_movimiento, fecha, tipo, concepto, monto, origen
    FROM movimientos_caja
    WHERE origen = 'ingreso' AND id_referencia = $1
    ORDER BY fecha ASC, id_movimiento ASC
  `, [id_ingreso]);

  return rows.map((m) => ({ ...m, monto: num(m.monto) }));
}

// "Ingresos de esta venta": el de la venta y los de sus cobros
export async function ingresosDeVenta(id_venta) {
  const { rows } = await pool.query(`
    SELECT i.id_ingreso, i.fecha, i.forma_pago, i.monto, i.origen, i.estatus
    FROM ingresos i
    WHERE i.id_venta = $1
       OR i.id_cobro IN (
         SELECT co.id_cobro
         FROM cxc_cobros co
         JOIN cuentas_por_cobrar cx ON cx.id_cxc = co.id_cxc
         WHERE cx.id_venta = $1
       )
    ORDER BY i.fecha ASC, i.id_ingreso ASC
  `, [id_venta]);

  return rows.map((r) => ({ ...r, monto: num(r.monto) }));
}
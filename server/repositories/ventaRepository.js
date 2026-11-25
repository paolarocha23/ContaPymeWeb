import pool from '../config/db.js';
import { ESTATUS } from '../validators/ventaValidator.js';

const TZ = 'America/Mexico_City';

const num = (v) => (v === null || v === undefined ? v : Number(v));

const normalizarVenta = (r) => r && ({
  ...r,
  subtotal: num(r.subtotal),
  total: num(r.total),
  monto_pagado: num(r.monto_pagado),
  total_devuelto: num(r.total_devuelto),
  saldo_pendiente: num(r.saldo_pendiente),
  cxc_saldo_pendiente: num(r.cxc_saldo_pendiente),
  cxc_monto_original: num(r.cxc_monto_original)
});

// Importe devuelto de una venta (alias "v" = ventas)
const DEVUELTO_SQL = `COALESCE((
  SELECT SUM(ddv.cantidad * ddv.precio_unitario)
  FROM devoluciones_venta dvv
  JOIN detalle_devoluciones_venta ddv ON ddv.id_devolucion = dvv.id_devolucion
  WHERE dvv.id_venta = v.id_venta
), 0)`;

const SALDO_SQL = `CASE WHEN LOWER(v.estatus) = '${ESTATUS.CANCELADA}' THEN 0
  ELSE GREATEST(0, v.total - ${DEVUELTO_SQL} - v.monto_pagado) END`;

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

/** Listado con filtros (RDF0903: cliente, fecha, vendedor, código, producto, estatus). */
export async function list(filtros = {}, empresaId = null) {
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  let where = 'WHERE 1=1';
  if (empresaId) where += ` AND v.empresa_id = ${add(empresaId)}`;

  if (filtros.q) {
    const p = add(`%${filtros.q}%`);
    where += ` AND (
      v.codigo ILIKE ${p}
      OR CONCAT_WS(' ', cl.nombre_cliente, cl.apellido_paterno, cl.apellido_materno) ILIKE ${p}
      OR u.nombre_usuario ILIKE ${p}
      OR CONCAT_WS(' ', u.nombre, u.apellido_paterno) ILIKE ${p}
      OR v.observaciones ILIKE ${p}
      OR EXISTS (
        SELECT 1 FROM detalle_ventas dvq
        JOIN productos pq ON pq.id_producto = dvq.id_producto
        WHERE dvq.id_venta = v.id_venta AND (pq.nombre ILIKE ${p} OR pq.codigo ILIKE ${p})
      )
    )`;
  }
  if (filtros.estatus) where += ` AND LOWER(v.estatus) = ${add(filtros.estatus)}`;
  if (filtros.condiciones_pago) where += ` AND LOWER(v.condiciones_pago) = ${add(filtros.condiciones_pago)}`;
  if (filtros.forma_pago) where += ` AND LOWER(v.forma_pago) = ${add(filtros.forma_pago)}`;
  if (filtros.desde) where += ` AND (v.fecha - INTERVAL '6 hours')::date >= ${add(filtros.desde)}::date`;
  if (filtros.hasta) where += ` AND (v.fecha - INTERVAL '6 hours')::date <= ${add(filtros.hasta)}::date`;
  if (filtros.id_cliente) where += ` AND v.id_cliente = ${add(filtros.id_cliente)}`;
  if (filtros.id_usuario) where += ` AND v.id_usuario = ${add(filtros.id_usuario)}`;

  const limite = filtros.limite || 50;
  const lim = add(limite);
  const off = add(((filtros.pagina || 1) - 1) * limite);

  const { rows } = await pool.query(`
    SELECT
      v.id_venta, v.codigo, TO_CHAR(v.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha, v.id_cliente, v.id_usuario,
      v.forma_pago, v.condiciones_pago,
      TO_CHAR(v.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
      v.subtotal, v.total, v.monto_pagado,
      ${DEVUELTO_SQL} AS total_devuelto,
      ${SALDO_SQL} AS saldo_pendiente,
      v.estatus, v.observaciones, v.empresa_id,
      COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cl.nombre_cliente, cl.apellido_paterno, cl.apellido_materno)), ''),
        'Público en general') AS nombre_cliente,
      u.nombre_usuario AS vendedor,
      cxc.id_cxc, cxc.estatus AS cxc_estatus,
      (SELECT COUNT(*)::int FROM detalle_ventas dv WHERE dv.id_venta = v.id_venta) AS total_articulos,
      COUNT(*) OVER()::int AS total_filas
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
    INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.id_venta = v.id_venta
    ${where}
    ORDER BY v.fecha DESC, v.id_venta DESC
    LIMIT ${lim} OFFSET ${off}
  `, params);

  return {
    total: rows[0]?.total_filas ?? 0,
    items: rows.map(({ total_filas, ...fila }) => normalizarVenta(fila))
  };
}

export async function stats(empresaId = null) {
  const C = `LOWER(estatus) <> '${ESTATUS.CANCELADA}'`;
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_ventas,
      COALESCE(SUM(total - devuelto) FILTER (WHERE ${C}), 0) AS total_vendido,
      COALESCE(SUM(monto_pagado) FILTER (WHERE ${C}), 0) AS total_cobrado,
      COALESCE(SUM(GREATEST(0, total - devuelto - monto_pagado)) FILTER (WHERE ${C}), 0) AS total_por_cobrar,
      COUNT(*) FILTER (WHERE LOWER(estatus) = '${ESTATUS.PAGADA}')::int AS ventas_pagadas,
      COUNT(*) FILTER (WHERE LOWER(estatus) IN ('${ESTATUS.PENDIENTE}', '${ESTATUS.PARCIAL}'))::int AS ventas_pendientes,
      COUNT(*) FILTER (WHERE LOWER(estatus) = '${ESTATUS.CANCELADA}')::int AS ventas_canceladas,
      COUNT(*) FILTER (WHERE LOWER(condiciones_pago) = 'credito' AND ${C})::int AS ventas_credito,
      COUNT(*) FILTER (WHERE LOWER(condiciones_pago) = 'contado' AND ${C})::int AS ventas_contado
    FROM (
      SELECT v.total, v.monto_pagado, v.estatus, v.condiciones_pago, ${DEVUELTO_SQL} AS devuelto
      FROM ventas v
      WHERE ($1::int IS NULL OR v.empresa_id = $1)
    ) x
  `, [empresaId]);

  const r = rows[0] || {};
  const totalVendido = num(r.total_vendido);
  const activas = (r.total_ventas || 0) - (r.ventas_canceladas || 0);

  return {
    total_ventas: r.total_ventas || 0,
    total_vendido: totalVendido,
    total_cobrado: num(r.total_cobrado),
    total_por_cobrar: num(r.total_por_cobrar),
    ventas_pagadas: r.ventas_pagadas || 0,
    ventas_pendientes: r.ventas_pendientes || 0,
    ventas_canceladas: r.ventas_canceladas || 0,
    ventas_credito: r.ventas_credito || 0,
    ventas_contado: r.ventas_contado || 0,
    ticket_promedio: activas > 0 ? Math.round((totalVendido / activas) * 100) / 100 : 0
  };
}

export async function findById(id, empresaId = null, db = pool) {
  const { rows } = await db.query(`
    SELECT
      v.id_venta, v.codigo, TO_CHAR(v.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha, v.id_cliente, v.id_usuario,
      v.forma_pago, v.condiciones_pago,
      TO_CHAR(v.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
      v.subtotal, v.total, v.monto_pagado,
      ${DEVUELTO_SQL} AS total_devuelto,
      ${SALDO_SQL} AS saldo_pendiente,
      v.estatus, v.observaciones, v.empresa_id,
      COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cl.nombre_cliente, cl.apellido_paterno, cl.apellido_materno)), ''),
        'Público en general') AS nombre_cliente,
      cl.correo AS correo_cliente,
      cl.telefono AS telefono_cliente,
      u.nombre_usuario AS vendedor,
      COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellido_paterno)), ''), u.nombre_usuario) AS nombre_vendedor,
      cxc.id_cxc,
      cxc.monto_original AS cxc_monto_original,
      cxc.saldo_pendiente AS cxc_saldo_pendiente,
      TO_CHAR(cxc.fecha_vencimiento, 'YYYY-MM-DD') AS cxc_fecha_vencimiento,
      cxc.estatus AS cxc_estatus
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
    INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.id_venta = v.id_venta
    WHERE v.id_venta = $1 AND ($2::int IS NULL OR v.empresa_id = $2)
    LIMIT 1
  `, [id, empresaId]);
  return normalizarVenta(rows[0]) || null;
}

export async function findItemsByVentaId(idVenta, db = pool) {
  const { rows } = await db.query(`
    SELECT
      dv.id_detalle_venta, dv.id_venta, dv.id_producto,
      p.codigo AS codigo_producto, p.nombre AS nombre_producto,
      p.tipo, p.tipo AS tipo_producto, p.unidad_medida,
      dv.cantidad, dv.precio_unitario, dv.subtotal,
      COALESCE((
        SELECT SUM(dd.cantidad)
        FROM detalle_devoluciones_venta dd
        JOIN devoluciones_venta d ON d.id_devolucion = dd.id_devolucion
        WHERE d.id_venta = dv.id_venta AND dd.id_producto = dv.id_producto
      ), 0) AS cantidad_devuelta
    FROM detalle_ventas dv
    INNER JOIN productos p ON p.id_producto = dv.id_producto
    WHERE dv.id_venta = $1
    ORDER BY dv.id_detalle_venta ASC
  `, [idVenta]);

  return rows.map((r) => ({
    ...r,
    cantidad: num(r.cantidad),
    precio_unitario: num(r.precio_unitario),
    subtotal: num(r.subtotal),
    cantidad_devuelta: num(r.cantidad_devuelta),
    cantidad_disponible: Math.max(0, num(r.cantidad) - num(r.cantidad_devuelta))
  }));
}

const formatearFolio = (consecutivo, empresaId) =>
  empresaId > 1
    ? `V-E${empresaId}-${String(consecutivo).padStart(4, '0')}`
    : `V-${String(consecutivo).padStart(4, '0')}`;

export async function generarSiguienteFolio(client, empresaId = 1) {
  await client.query('SELECT pg_advisory_xact_lock(1001, $1::int)', [empresaId]);

  const { rows } = await client.query(
    `SELECT codigo FROM ventas WHERE empresa_id = $1 ORDER BY id_venta DESC LIMIT 1`,
    [empresaId]
  );

  let consecutivo = 1;
  if (rows.length > 0 && rows[0].codigo) {
    const match = String(rows[0].codigo).match(/\d+$/);
    if (match) consecutivo = parseInt(match[0], 10) + 1;
  }

  let folio = formatearFolio(consecutivo, empresaId);
  for (let i = 0; i < 50; i++) {
    const check = await client.query('SELECT 1 FROM ventas WHERE codigo = $1 LIMIT 1', [folio]);
    if (check.rows.length === 0) break;
    consecutivo++;
    folio = formatearFolio(consecutivo, empresaId);
  }
  return folio;
}

export async function insertVenta(client, d) {
  const { rows } = await client.query(`
    INSERT INTO ventas (
      codigo, fecha, id_cliente, id_usuario, forma_pago,
      condiciones_pago, fecha_vencimiento, subtotal, total,
      monto_pagado, estatus, observaciones, empresa_id
    )
    VALUES ($1, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id_venta, codigo, fecha, total, monto_pagado, estatus
  `, [
    d.codigo, d.id_cliente ?? null, d.id_usuario, d.forma_pago,
    d.condiciones_pago, d.fecha_vencimiento ?? null, d.subtotal, d.total,
    d.monto_pagado, d.estatus, d.observaciones ?? null, d.empresa_id
  ]);
  return rows[0];
}

export async function insertDetalle(client, d) {
  const { rows } = await client.query(`
    INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal, empresa_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_detalle_venta
  `, [d.id_venta, d.id_producto, d.cantidad, d.precio_unitario, d.subtotal, d.empresa_id]);
  return rows[0];
}

/** Precio de venta oficial del catálogo (null si no existe o es inválido). */
export async function obtenerPrecioVenta(client, idProducto) {
  const { rows } = await client.query(
    `SELECT precio_venta FROM productos WHERE id_producto = $1`, [idProducto]
  );
  const precio = rows[0] ? Number(rows[0].precio_venta) : null;
  return Number.isFinite(precio) ? precio : null;
}

export async function bloquearVenta(client, idVenta, empresaId = null) {
  const { rows } = await client.query(`
    SELECT * FROM ventas
    WHERE id_venta = $1 AND ($2::int IS NULL OR empresa_id = $2)
    FOR UPDATE
  `, [idVenta, empresaId]);
  return rows[0] || null;
}

export async function cancelarVenta(client, idVenta) {
  const { rows } = await client.query(
    `UPDATE ventas SET estatus = '${ESTATUS.CANCELADA}' WHERE id_venta = $1 RETURNING *`,
    [idVenta]
  );
  return rows[0];
}

export async function actualizarPagoVenta(client, idVenta, { monto_pagado, estatus }) {
  await client.query(
    `UPDATE ventas SET monto_pagado = $2, estatus = $3 WHERE id_venta = $1`,
    [idVenta, monto_pagado, estatus]
  );
}

export async function crearCuentaPorCobrar(client, d) {
  const { rows } = await client.query(`
    INSERT INTO cuentas_por_cobrar (
      id_cliente, id_venta, fecha_emision, fecha_vencimiento,
      monto_original, saldo_pendiente, estatus, empresa_id
    )
    VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)
    RETURNING id_cxc, saldo_pendiente, estatus
  `, [d.id_cliente, d.id_venta, d.fecha_vencimiento, d.monto_original, d.saldo_pendiente, d.estatus, d.empresa_id]);
  return rows[0];
}

export async function cancelarCuentaPorCobrar(client, idVenta) {
  await client.query(
    `UPDATE cuentas_por_cobrar SET estatus = 'cancelada', saldo_pendiente = 0 WHERE id_venta = $1`,
    [idVenta]
  );
}

/** Ajusta la CxC tras una devolución (RDF0907). */
export async function ajustarCuentaPorCobrar(client, idVenta, { monto_original, saldo_pendiente, estatus }) {
  await client.query(`
    UPDATE cuentas_por_cobrar
    SET monto_original = $2, saldo_pendiente = $3, estatus = $4
    WHERE id_venta = $1 AND LOWER(estatus) <> 'cancelada'
  `, [idVenta, monto_original, saldo_pendiente, estatus]);
}

export async function obtenerCobrosDeVenta(client, idVenta) {
  const { rows } = await client.query(`
    SELECT cb.id_cobro, cb.monto
    FROM cxc_cobros cb
    JOIN cuentas_por_cobrar cx ON cx.id_cxc = cb.id_cxc
    WHERE cx.id_venta = $1
  `, [idVenta]);
  return rows;
}

export async function obtenerCategoriaVentas(client, opciones = {}) {
  const empresaId = typeof opciones === 'object' && opciones !== null ? opciones.empresaId : opciones;
  const esServicio = Boolean(opciones?.esServicio);
  const idCatProducto = opciones?.idCategoriaProducto;

  // 1. Si se conoce la categoría del producto o servicio vendido y está activa, usarla
  if (idCatProducto) {
    const { rows } = await client.query(
      `SELECT id_categoria FROM categorias WHERE id_categoria = $1 AND estatus = 1`,
      [idCatProducto]
    );
    if (rows.length > 0) return rows[0].id_categoria;
  }

  // 2. Si es un servicio, buscar la categoría de Servicios / Instalaciones / Mantenimiento
  if (esServicio) {
    const { rows } = await client.query(`
      SELECT id_categoria FROM categorias
      WHERE estatus = 1 AND ($1::int IS NULL OR empresa_id = $1)
      ORDER BY CASE
        WHEN LOWER(TRIM(nombre)) LIKE '%servicio%' THEN 0
        WHEN LOWER(TRIM(nombre)) LIKE '%instalac%' THEN 1
        WHEN LOWER(TRIM(nombre)) LIKE '%mantenimiento%' THEN 2
        ELSE 3
      END, id_categoria ASC
      LIMIT 1
    `, [empresaId]);
    if (rows.length > 0) return rows[0].id_categoria;
  }

  // 3. Para productos o ventas generales
  const { rows } = await client.query(`
    SELECT id_categoria FROM categorias
    WHERE estatus = 1 AND ($1::int IS NULL OR empresa_id = $1)
    ORDER BY CASE
      WHEN LOWER(TRIM(nombre)) = 'ventas' THEN 0
      WHEN LOWER(TRIM(nombre)) LIKE '%venta%' THEN 1
      WHEN LOWER(TRIM(nombre)) LIKE '%ingreso%' THEN 2
      ELSE 3
    END, id_categoria ASC
    LIMIT 1
  `, [empresaId]);
  return rows[0]?.id_categoria || 1;
}

/* ---------------- Devoluciones (RDF0907) ---------------- */

/** Productos de la venta con lo ya devuelto y lo que aún se puede devolver. */
export async function itemsDevolubles(client, idVenta) {
  const { rows } = await client.query(`
    SELECT dv.id_producto, p.nombre, p.tipo, dv.precio_unitario,
           SUM(dv.cantidad) AS cantidad_vendida,
           COALESCE((
             SELECT SUM(dd.cantidad)
             FROM detalle_devoluciones_venta dd
             JOIN devoluciones_venta d ON d.id_devolucion = dd.id_devolucion
             WHERE d.id_venta = dv.id_venta AND dd.id_producto = dv.id_producto
           ), 0) AS cantidad_devuelta
    FROM detalle_ventas dv
    JOIN productos p ON p.id_producto = dv.id_producto
    WHERE dv.id_venta = $1
    GROUP BY dv.id_venta, dv.id_producto, p.nombre, p.tipo, dv.precio_unitario
  `, [idVenta]);

  return rows.map((r) => ({
    id_producto: r.id_producto,
    nombre: r.nombre,
    tipo: r.tipo,
    precio_unitario: num(r.precio_unitario),
    vendida: num(r.cantidad_vendida),
    devuelta: num(r.cantidad_devuelta),
    disponible: Math.max(0, num(r.cantidad_vendida) - num(r.cantidad_devuelta))
  }));
}

export async function insertDevolucion(client, d) {
  const { rows } = await client.query(`
    INSERT INTO devoluciones_venta (id_venta, fecha, tipo, id_usuario, observaciones)
    VALUES ($1, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), $2, $3, $4)
    RETURNING id_devolucion
  `, [d.id_venta, d.tipo, d.id_usuario, d.observaciones ?? null]);
  return rows[0];
}

export async function insertDetalleDevolucion(client, d) {
  await client.query(`
    INSERT INTO detalle_devoluciones_venta (id_devolucion, id_producto, cantidad, precio_unitario)
    VALUES ($1, $2, $3, $4)
  `, [d.id_devolucion, d.id_producto, d.cantidad, d.precio_unitario]);
}

export async function totalDevuelto(client, idVenta) {
  const { rows } = await client.query(`
    SELECT COALESCE(SUM(dd.cantidad * dd.precio_unitario), 0) AS total
    FROM devoluciones_venta d
    JOIN detalle_devoluciones_venta dd ON dd.id_devolucion = d.id_devolucion
    WHERE d.id_venta = $1
  `, [idVenta]);
  return num(rows[0].total);
}

export async function contarDevoluciones(client, idVenta) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM devoluciones_venta WHERE id_venta = $1`, [idVenta]
  );
  return rows[0].n;
}

export async function listarDevoluciones(idVenta, db = pool) {
  const { rows } = await db.query(`
    SELECT d.id_devolucion, TO_CHAR(d.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha, d.tipo, d.observaciones,
           u.nombre_usuario AS usuario,
           COALESCE(SUM(dd.cantidad * dd.precio_unitario), 0) AS monto
    FROM devoluciones_venta d
    LEFT JOIN usuarios u ON u.id_usuario = d.id_usuario
    LEFT JOIN detalle_devoluciones_venta dd ON dd.id_devolucion = d.id_devolucion
    WHERE d.id_venta = $1
    GROUP BY d.id_devolucion, u.nombre_usuario
    ORDER BY d.fecha DESC, d.id_devolucion DESC
  `, [idVenta]);
  return rows.map((r) => ({ ...r, monto: num(r.monto) }));
}

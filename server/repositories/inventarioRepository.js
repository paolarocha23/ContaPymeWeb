import pool from '../config/db.js';

const ESTADO_STOCK = `
  CASE
    WHEN COALESCE(p.stock, 0) <= 0 THEN 'sin_stock'
    WHEN p.stock_minimo IS NOT NULL AND p.stock <= p.stock_minimo THEN 'bajo'
    ELSE 'disponible'
  END
`;

const COLUMNAS = `
  p.id_producto,
  p.codigo,
  p.nombre,
  p.tipo,
  p.id_categoria,
  c.nombre AS nombre_categoria,
  p.unidad_medida,
  p.precio_compra,
  p.precio_venta,
  p.stock,
  p.stock_minimo,
  p.estatus,
  COALESCE(p.stock, 0) * p.precio_compra AS valor_inventario,
  ${ESTADO_STOCK} AS estado_stock
`;

// pg devuelve numeric como string; se convierten a número para el front.
const num = (v) => (v === null || v === undefined ? v : Number(v));

const normalizarExistencia = (r) => r && ({
  ...r,
  precio_compra: num(r.precio_compra),
  precio_venta: num(r.precio_venta),
  stock: num(r.stock),
  stock_minimo: num(r.stock_minimo),
  valor_inventario: num(r.valor_inventario)
});

const normalizarMovimiento = (r) => ({
  ...r,
  cantidad: num(r.cantidad),
  existencia_antes: num(r.existencia_antes),
  existencia_despues: num(r.existencia_despues)
});

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

export async function listarExistencias({ q, estatus, id_categoria, estado } = {}) {
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  let where = `WHERE LOWER(p.tipo) = 'producto'`;

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND (p.nombre ILIKE ${p} OR p.codigo ILIKE ${p})`;
  }

  if (estatus !== undefined) where += ` AND p.estatus = ${add(estatus)}`;
  if (id_categoria !== undefined) where += ` AND p.id_categoria = ${add(id_categoria)}`;
  if (estado) where += ` AND ${ESTADO_STOCK} = ${add(estado)}`;

  const { rows } = await pool.query(`
    SELECT ${COLUMNAS}
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    ${where}
    ORDER BY p.nombre ASC
  `, params);

  return rows.map(normalizarExistencia);
}

export async function findExistencia(id, db = pool) {
  const { rows } = await db.query(`
    SELECT ${COLUMNAS}
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE p.id_producto = $1
    LIMIT 1
  `, [id]);

  return normalizarExistencia(rows[0]) || null;
}

export async function stockBajo() {
  const { rows } = await pool.query(`
    SELECT ${COLUMNAS}
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE LOWER(p.tipo) = 'producto'
      AND p.estatus = 1
      AND p.stock_minimo IS NOT NULL
      AND COALESCE(p.stock, 0) <= p.stock_minimo
    ORDER BY (COALESCE(p.stock, 0) - p.stock_minimo) ASC, p.nombre ASC
  `);

  return rows.map(normalizarExistencia);
}

export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_productos,
      COALESCE(SUM(p.stock), 0) AS unidades,
      COALESCE(SUM(COALESCE(p.stock, 0) * p.precio_compra), 0) AS valor_inventario,
      COUNT(*) FILTER (WHERE ${ESTADO_STOCK} = 'bajo')::int AS stock_bajo,
      COUNT(*) FILTER (WHERE ${ESTADO_STOCK} = 'sin_stock')::int AS sin_stock
    FROM productos p
    WHERE LOWER(p.tipo) = 'producto' AND p.estatus = 1
  `);

  const r = rows[0];

  return { ...r, unidades: num(r.unidades), valor_inventario: num(r.valor_inventario) };
}

export async function listarMovimientos({
  q, id_producto, tipo_movimiento, origen, desde, hasta, limite, pagina
} = {}) {
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  let where = 'WHERE 1=1';

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND (p.nombre ILIKE ${p} OR p.codigo ILIKE ${p} OR m.motivo ILIKE ${p})`;
  }

  if (id_producto !== undefined) where += ` AND m.id_producto = ${add(id_producto)}`;
  if (tipo_movimiento) where += ` AND m.tipo_movimiento = ${add(tipo_movimiento)}`;
  if (origen) where += ` AND LOWER(m.origen) = ${add(origen)}`;
  if (desde) where += ` AND m.fecha >= ${add(desde)}::date`;
  if (hasta) where += ` AND m.fecha < (${add(hasta)}::date + 1)`;

  const lim = add(limite);
  const off = add((pagina - 1) * limite);

  const { rows } = await pool.query(`
    SELECT
      m.id_movimiento,
      m.id_producto,
      p.codigo,
      p.nombre AS nombre_producto,
      p.unidad_medida,
      m.tipo_movimiento,
      m.cantidad,
      m.existencia_antes,
      m.existencia_despues,
      m.motivo,
      m.origen,
      m.id_referencia,
      m.id_usuario,
      u.nombre_usuario,
      m.fecha,
      COUNT(*) OVER()::int AS total_filas
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
    ${where}
    ORDER BY m.fecha DESC, m.id_movimiento DESC
    LIMIT ${lim} OFFSET ${off}
  `, params);

  return {
    total: rows[0]?.total_filas ?? 0,
    items: rows.map(({ total_filas, ...fila }) => normalizarMovimiento(fila))
  };
}

/**
 * Bloquea la fila del producto durante la transacción para que dos
 * movimientos simultáneos no pisen la existencia.
 */
export async function bloquearProducto(client, id) {
  const { rows } = await client.query(`
    SELECT id_producto, codigo, nombre, tipo, unidad_medida, stock, stock_minimo, estatus
    FROM productos
    WHERE id_producto = $1
    FOR UPDATE
  `, [id]);

  const r = rows[0];
  return r ? { ...r, stock: num(r.stock), stock_minimo: num(r.stock_minimo) } : null;
}

export async function actualizarStock(client, id, nuevoStock) {
  await client.query(
    'UPDATE productos SET stock = $1 WHERE id_producto = $2',
    [nuevoStock, id]
  );
}

export async function insertarMovimiento(client, d) {
  const { rows } = await client.query(`
    INSERT INTO movimientos_inventario (
      id_producto, tipo_movimiento, cantidad,
      existencia_antes, existencia_despues,
      motivo, origen, id_referencia, id_usuario
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id_movimiento, fecha
  `, [
    d.id_producto,
    d.tipo_movimiento,
    d.cantidad,
    d.existencia_antes,
    d.existencia_despues,
    d.motivo,
    d.origen,
    d.id_referencia ?? null,
    d.id_usuario
  ]);

  return rows[0];
}
import pool from '../config/db.js';

const COLUMNAS = `
  p.id_producto,
  p.codigo,
  p.nombre,
  p.descripcion,
  p.tipo,
  p.id_categoria,
  c.nombre AS nombre_categoria,
  p.unidad_medida,
  p.precio_compra,
  p.precio_venta,
  p.stock,
  p.stock_minimo,
  p.estatus
`;

export async function list({ q, estatus, id_categoria, tipo } = {}) {
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  let where = 'WHERE 1=1';

  if (q) {
    const p = add(`%${q}%`);
    where += ` AND (p.nombre ILIKE ${p} OR p.codigo ILIKE ${p})`;
  }

  if (estatus !== undefined) {
    where += ` AND p.estatus = ${add(estatus)}`;
  }

  if (id_categoria !== undefined) {
    where += ` AND p.id_categoria = ${add(id_categoria)}`;
  }

  if (tipo !== undefined) {
    where += ` AND LOWER(p.tipo) = ${add(tipo)}`;
  }

  const { rows } = await pool.query(`
    SELECT ${COLUMNAS}
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    ${where}
    ORDER BY p.id_producto DESC
  `, params);

  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(`
    SELECT ${COLUMNAS}
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE p.id_producto = $1
    LIMIT 1
  `, [id]);

  return rows[0] || null;
}

export async function findByCodigo(codigo, excluirId = null) {
  const { rows } = await pool.query(`
    SELECT id_producto
    FROM productos
    WHERE LOWER(codigo) = LOWER($1)
      AND ($2::int IS NULL OR id_producto <> $2)
    LIMIT 1
  `, [codigo, excluirId]);

  return rows[0] || null;
}

export async function insert(d) {
  const { rows } = await pool.query(`
    INSERT INTO productos (
      codigo, nombre, descripcion, tipo, id_categoria,
      unidad_medida, precio_compra, precio_venta,
      stock, stock_minimo, estatus
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)
    RETURNING id_producto
  `, [
    d.codigo,
    d.nombre,
    d.descripcion,
    d.tipo,
    d.id_categoria,
    d.unidad_medida,
    d.precio_compra,
    d.precio_venta,
    d.stock,
    d.stock_minimo
  ]);

  return findById(rows[0].id_producto);
}

export async function update(id, d) {
  await pool.query(`
    UPDATE productos
    SET codigo = $1,
        nombre = $2,
        descripcion = $3,
        tipo = $4,
        id_categoria = $5,
        unidad_medida = $6,
        precio_compra = $7,
        precio_venta = $8,
        stock = $9,
        stock_minimo = $10
    WHERE id_producto = $11
  `, [
    d.codigo,
    d.nombre,
    d.descripcion,
    d.tipo,
    d.id_categoria,
    d.unidad_medida,
    d.precio_compra,
    d.precio_venta,
    d.stock,
    d.stock_minimo,
    id
  ]);

  return findById(id);
}

export async function updateStatus(id, estatus) {
  await pool.query(
    'UPDATE productos SET estatus = $1 WHERE id_producto = $2',
    [estatus, id]
  );

  return findById(id);
}

/**
 * Comprueba las relaciones mediante claves foráneas
 * que apuntan a productos.id_producto.
 */
export async function tieneOperaciones(id) {
  const { rows: referencias } = await pool.query(`
    SELECT
      ns.nspname AS esquema,
      nt.relname AS tabla,
      na.attname AS columna
    FROM pg_constraint con
    JOIN pg_class nt ON nt.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = nt.relnamespace
    JOIN pg_attribute na
      ON na.attrelid = con.conrelid
      AND na.attnum = con.conkey[1]
    JOIN pg_attribute pa
      ON pa.attrelid = con.confrelid
      AND pa.attnum = con.confkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'public.productos'::regclass
      AND pa.attname = 'id_producto'
      AND cardinality(con.conkey) = 1
      AND cardinality(con.confkey) = 1
  `);

  for (const referencia of referencias) {
    const esquema = referencia.esquema.replace(/"/g, '""');
    const tabla = referencia.tabla.replace(/"/g, '""');
    const columna = referencia.columna.replace(/"/g, '""');

    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM "${esquema}"."${tabla}"
        WHERE "${columna}" = $1
      ) AS existe
    `, [id]);

    if (rows[0].existe) return true;
  }

  return false;
}

export async function remove(id) {
  await pool.query(
    'DELETE FROM productos WHERE id_producto = $1',
    [id]
  );
}

export async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estatus = 1)::int AS activos,
      COUNT(*) FILTER (WHERE estatus = 0)::int AS inactivos,
      COUNT(*) FILTER (WHERE LOWER(tipo) = 'producto')::int AS productos,
      COUNT(*) FILTER (WHERE LOWER(tipo) = 'servicio')::int AS servicios,
      COUNT(*) FILTER (
        WHERE LOWER(tipo) = 'producto'
          AND stock IS NOT NULL AND stock_minimo IS NOT NULL
          AND stock <= stock_minimo
      )::int AS stock_bajo
    FROM productos
  `);

  return rows[0];
}

/**
 * Cuántos registros apuntan a este producto, tabla por tabla
 * (se descubren por claves foráneas, igual que tieneOperaciones).
 * Devuelve solo las tablas con al menos un registro.
 */
export async function contarOperaciones(id) {
  const { rows: referencias } = await pool.query(`
    SELECT ns.nspname AS esquema, nt.relname AS tabla, na.attname AS columna
    FROM pg_constraint con
    JOIN pg_class nt ON nt.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = nt.relnamespace
    JOIN pg_attribute na ON na.attrelid = con.conrelid AND na.attnum = con.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = con.confkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'public.productos'::regclass
      AND pa.attname = 'id_producto'
      AND cardinality(con.conkey) = 1
      AND cardinality(con.confkey) = 1
  `);

  const relaciones = [];

  for (const r of referencias) {
    const q = (x) => x.replace(/"/g, '""');
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM "${q(r.esquema)}"."${q(r.tabla)}" WHERE "${q(r.columna)}" = $1`,
      [id]
    );
    if (rows[0].total > 0) relaciones.push({ tabla: r.tabla, total: rows[0].total });
  }

  return relaciones;
}

// Últimas ventas del producto (para la pantalla de detalle).
export async function ventasDeProducto(id, limite = 20) {
  const { rows: existe } = await pool.query(
    "SELECT to_regclass('public.detalle_ventas') IS NOT NULL AND to_regclass('public.ventas') IS NOT NULL AS ok"
  );
  if (!existe[0].ok) return [];

  const { rows } = await pool.query(`
    SELECT v.codigo AS folio, v.fecha, dv.cantidad, dv.subtotal AS importe
    FROM detalle_ventas dv
    JOIN ventas v ON v.id_venta = dv.id_venta
    WHERE dv.id_producto = $1
    ORDER BY v.fecha DESC
    LIMIT $2
  `, [id, limite]);

  return rows;
}

export async function categoriasActivas() {
  const { rows } = await pool.query(`
    SELECT id_categoria, nombre
    FROM categorias
    WHERE estatus = 1
    ORDER BY nombre ASC
  `);

  return rows;
}

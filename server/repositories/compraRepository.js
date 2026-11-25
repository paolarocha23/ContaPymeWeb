import pool from '../config/db.js';

// pg devuelve las columnas numeric/decimal como texto. El frontend espera números.
const num = (v) => (v === null || v === undefined ? v : Number(v));

const normalizarCompra = (r) => r && ({
  ...r,
  subtotal: num(r.subtotal),
  total: num(r.total),
  saldo_pendiente: num(r.saldo_pendiente),
  monto_pagado: num(r.monto_pagado)
});

const normalizarDetalle = (r) => ({
  ...r,
  cantidad: num(r.cantidad),
  costo_unitario: num(r.costo_unitario),
  subtotal: num(r.subtotal)
});

export async function conTransaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignorar error de rollback
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function list(filtros = {}, empresaId = null) {
  const params = [];
  const condiciones = [];

  if (empresaId) {
    params.push(empresaId);
    condiciones.push(`c.empresa_id = $${params.length}`);
  }

  if (filtros.q) {
    params.push(`%${filtros.q}%`);
    const pIndex = params.length;
    condiciones.push(`(
      c.codigo ILIKE $${pIndex} OR
      p.nombre_empresa ILIKE $${pIndex} OR
      p.nombre_contacto ILIKE $${pIndex} OR
      p.telefono ILIKE $${pIndex} OR
      p.correo ILIKE $${pIndex} OR
      EXISTS (
        SELECT 1 FROM detalle_compras dc_q
        JOIN productos prod_q ON prod_q.id_producto = dc_q.id_producto
        WHERE dc_q.id_compra = c.id_compra
          AND (prod_q.nombre ILIKE $${pIndex} OR prod_q.codigo ILIKE $${pIndex})
      )
    )`);
  }

  if (filtros.id_producto) {
    params.push(filtros.id_producto);
    condiciones.push(`EXISTS (
      SELECT 1 FROM detalle_compras dc_p
      WHERE dc_p.id_compra = c.id_compra AND dc_p.id_producto = $${params.length}
    )`);
  }

  if (filtros.estatus) {
    params.push(filtros.estatus);
    condiciones.push(`c.estatus = $${params.length}`);
  }

  if (filtros.condiciones_pago) {
    params.push(filtros.condiciones_pago);
    condiciones.push(`c.condiciones_pago = $${params.length}`);
  }

  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(`(c.fecha - INTERVAL '6 hours')::date >= $${params.length}::date`);
  }

  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(`(c.fecha - INTERVAL '6 hours')::date <= $${params.length}::date`);
  }

  if (filtros.id_proveedor) {
    params.push(filtros.id_proveedor);
    condiciones.push(`c.id_proveedor = $${params.length}`);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  // Conteo total
  const countSql = `
    SELECT COUNT(*) AS total
    FROM compras c
    LEFT JOIN proveedores p ON p.id_proveedor = c.id_proveedor
    ${whereClause}
  `;
  const countRes = await pool.query(countSql, params);
  const totalRegistros = Number(countRes.rows[0]?.total || 0);

  // Consulta paginada con datos de CxP
  const limit = filtros.limite || 50;
  const offset = ((filtros.pagina || 1) - 1) * limit;

  const dataSql = `
    SELECT
      c.id_compra,
      c.codigo,
      TO_CHAR(c.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha,
      c.id_proveedor,
      p.nombre_empresa AS proveedor_nombre,
      p.telefono AS proveedor_telefono,
      p.correo AS proveedor_correo,
      p.nombre_contacto AS proveedor_contacto,
      c.id_usuario,
      TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellido_paterno, ''))) AS usuario_nombre,
      c.condiciones_pago,
      c.fecha_vencimiento,
      c.subtotal,
      c.total,
      CASE
        WHEN c.estatus = 'cancelada' THEN 0
        ELSE COALESCE(cxp.saldo_pendiente, 0)
      END AS saldo_pendiente,
      CASE
        WHEN c.estatus = 'cancelada' THEN 0
        WHEN cxp.id_cxp IS NULL THEN c.total
        ELSE GREATEST(0, c.total - COALESCE(cxp.saldo_pendiente, 0))
      END AS monto_pagado,
      c.estatus,
      c.empresa_id,
      cxp.id_cxp,
      cxp.estatus AS cxp_estatus
    FROM compras c
    LEFT JOIN proveedores p ON p.id_proveedor = c.id_proveedor
    LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
    LEFT JOIN LATERAL (
      SELECT id_cxp, saldo_pendiente, estatus
      FROM cuentas_por_pagar
      WHERE id_compra = c.id_compra
      ORDER BY id_cxp DESC
      LIMIT 1
    ) cxp ON TRUE
    ${whereClause}
    ORDER BY c.fecha DESC, c.id_compra DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const dataRes = await pool.query(dataSql, [...params, limit, offset]);

  return {
    items: dataRes.rows.map(normalizarCompra),
    paginacion: {
      total: totalRegistros,
      pagina: filtros.pagina || 1,
      limite: limit,
      total_paginas: Math.ceil(totalRegistros / limit) || 1
    }
  };
}

export async function stats(empresaId = null) {
  const empresaParam = empresaId || null;

  const sql = `
    SELECT
      COALESCE(SUM(total) FILTER (WHERE estatus != 'cancelada'), 0) AS monto_total_comprado,
      COUNT(*) FILTER (WHERE estatus != 'cancelada') AS total_compras,
      COUNT(*) FILTER (WHERE condiciones_pago = 'credito' AND estatus != 'cancelada') AS compras_credito,
      COUNT(*) FILTER (WHERE estatus = 'cancelada') AS compras_canceladas,
      COALESCE(
        (SELECT SUM(saldo_pendiente)
         FROM cuentas_por_pagar
         WHERE estatus != 'cancelada'
           AND ($1::int IS NULL OR empresa_id = $1::int)),
        0
      ) AS saldo_por_pagar,
      COALESCE(
        ROUND(AVG(total) FILTER (WHERE estatus != 'cancelada'), 2),
        0
      ) AS ticket_promedio
    FROM compras
    WHERE ($1::int IS NULL OR empresa_id = $1::int)
  `;

  const res = await pool.query(sql, [empresaParam]);
  const r = res.rows[0] || {};

  return {
    monto_total_comprado: num(r.monto_total_comprado) ?? 0,
    total_compras: Number(r.total_compras) || 0,
    compras_credito: Number(r.compras_credito) || 0,
    compras_canceladas: Number(r.compras_canceladas) || 0,
    saldo_por_pagar: num(r.saldo_por_pagar) ?? 0,
    ticket_promedio: num(r.ticket_promedio) ?? 0
  };
}

export async function findById(idCompra, empresaId = null, db = pool) {
  const sql = `
    SELECT
      c.id_compra,
      c.codigo,
      TO_CHAR(c.fecha - INTERVAL '6 hours', 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha,
      c.id_proveedor,
      p.nombre_empresa AS proveedor_nombre,
      p.telefono AS proveedor_telefono,
      p.correo AS proveedor_correo,
      p.nombre_contacto AS proveedor_contacto,
      c.id_usuario,
      TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellido_paterno, ''))) AS usuario_nombre,
      c.condiciones_pago,
      c.fecha_vencimiento,
      c.subtotal,
      c.total,
      CASE
        WHEN c.estatus = 'cancelada' THEN 0
        ELSE COALESCE(cxp.saldo_pendiente, 0)
      END AS saldo_pendiente,
      CASE
        WHEN c.estatus = 'cancelada' THEN 0
        WHEN cxp.id_cxp IS NULL THEN c.total
        ELSE GREATEST(0, c.total - COALESCE(cxp.saldo_pendiente, 0))
      END AS monto_pagado,
      c.estatus,
      c.empresa_id,
      e.nombre AS empresa_nombre,
      CASE
        WHEN cxp.id_cxp IS NOT NULL THEN
          json_build_object(
            'id_cxp', cxp.id_cxp,
            'fecha_emision', cxp.fecha_emision,
            'fecha_vencimiento', cxp.fecha_vencimiento,
            'monto_original', cxp.monto_original,
            'saldo_pendiente', cxp.saldo_pendiente,
            'estatus', cxp.estatus
          )
        ELSE NULL
      END AS cuenta_por_pagar
    FROM compras c
    LEFT JOIN proveedores p ON p.id_proveedor = c.id_proveedor
    LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
    LEFT JOIN empresas e ON e.id_empresa = c.empresa_id
    LEFT JOIN LATERAL (
      SELECT id_cxp, fecha_emision, fecha_vencimiento, monto_original, saldo_pendiente, estatus
      FROM cuentas_por_pagar
      WHERE id_compra = c.id_compra
      ORDER BY id_cxp DESC
      LIMIT 1
    ) cxp ON TRUE
    WHERE c.id_compra = $1
      AND ($2::int IS NULL OR c.empresa_id = $2::int)
    LIMIT 1
  `;

  const res = await db.query(sql, [idCompra, empresaId]);
  return normalizarCompra(res.rows[0]) || null;
}

export async function findItemsByCompraId(idCompra, empresaId = null, db = pool) {
  const sql = `
    SELECT
      dc.id_detalle_compra,
      dc.id_compra,
      dc.id_producto,
      dc.cantidad,
      dc.costo_unitario,
      dc.subtotal,
      p.codigo AS codigo_producto,
      p.nombre AS producto_nombre,
      p.tipo AS tipo_producto,
      p.unidad_medida AS unidad_medida
    FROM detalle_compras dc
    INNER JOIN productos p ON p.id_producto = dc.id_producto
    WHERE dc.id_compra = $1
      AND ($2::int IS NULL OR dc.empresa_id = $2::int)
    ORDER BY dc.id_detalle_compra ASC
  `;

  const res = await db.query(sql, [idCompra, empresaId]);
  return res.rows.map(normalizarDetalle);
}

export async function generarSiguienteFolio(client = pool, empresaId = 1) {
  const dentroDeTransaccion = client !== pool;

  // Serializa la generación de folios por empresa dentro de la transacción.
  if (dentroDeTransaccion) {
    await client.query('SELECT pg_advisory_xact_lock(45001, $1::int)', [empresaId]);
  }

  const sql = `
    SELECT
      COALESCE(
        MAX(CAST(SUBSTRING(codigo FROM '^COM-([0-9]+)$') AS INTEGER)),
        0
      ) AS ultimo_numero
    FROM compras
    WHERE empresa_id = $1
      AND codigo ~ '^COM-[0-9]+$'
  `;

  const res = await client.query(sql, [empresaId]);
  const siguienteNumero = Number(res.rows[0]?.ultimo_numero || 0) + 1;

  return `COM-${String(siguienteNumero).padStart(6, '0')}`;
}

export async function insertCompra(client, datos) {
  const sql = `
    INSERT INTO compras (
      codigo,
      fecha,
      id_proveedor,
      id_usuario,
      condiciones_pago,
      fecha_vencimiento,
      subtotal,
      total,
      estatus,
      empresa_id
    ) VALUES (
      $1,
      CURRENT_TIMESTAMP,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9
    )
    RETURNING *
  `;

  const res = await client.query(sql, [
    datos.codigo,
    datos.id_proveedor,
    datos.id_usuario,
    datos.condiciones_pago,
    datos.fecha_vencimiento || null,
    datos.subtotal ?? datos.total,
    datos.total,
    datos.estatus || 'pendiente_pago',
    datos.empresa_id || 1
  ]);

  return res.rows[0];
}

export async function insertDetalle(client, datos) {
  const sql = `
    INSERT INTO detalle_compras (
      id_compra,
      id_producto,
      cantidad,
      costo_unitario,
      subtotal,
      empresa_id
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const res = await client.query(sql, [
    datos.id_compra,
    datos.id_producto,
    datos.cantidad,
    datos.costo_unitario,
    datos.subtotal,
    datos.empresa_id || 1
  ]);

  return res.rows[0];
}

export async function crearCuentaPorPagar(client, datos) {
  const sql = `
    INSERT INTO cuentas_por_pagar (
      id_proveedor,
      id_compra,
      fecha_emision,
      fecha_vencimiento,
      monto_original,
      saldo_pendiente,
      estatus,
      empresa_id
    ) VALUES (
      $1,
      $2,
      CURRENT_DATE,
      $3,
      $4,
      $5,
      $6,
      $7
    )
    RETURNING *
  `;

  const res = await client.query(sql, [
    datos.id_proveedor,
    datos.id_compra,
    datos.fecha_vencimiento,
    datos.monto_original,
    datos.saldo_pendiente,
    datos.estatus || 'pendiente',
    datos.empresa_id || 1
  ]);

  return res.rows[0];
}

export async function bloquearCompra(client, idCompra, empresaId = null) {
  const sql = `
    SELECT *
    FROM compras
    WHERE id_compra = $1
      AND ($2::int IS NULL OR empresa_id = $2::int)
    FOR UPDATE
  `;
  const res = await client.query(sql, [idCompra, empresaId]);
  return res.rows[0] || null;
}

export async function findProveedorParaCompra(client, idProveedor, empresaId = null) {
  const sql = `
    SELECT id_proveedor, nombre_empresa, estatus, empresa_id
    FROM proveedores
    WHERE id_proveedor = $1
      AND ($2::int IS NULL OR empresa_id = $2::int)
    LIMIT 1
  `;
  const res = await client.query(sql, [idProveedor, empresaId]);
  return res.rows[0] || null;
}

export async function cancelarCompra(client, idCompra) {
  const sql = `
    UPDATE compras
    SET estatus = 'cancelada'
    WHERE id_compra = $1
    RETURNING *
  `;
  const res = await client.query(sql, [idCompra]);
  return res.rows[0] || null;
}

export async function cancelarCuentaPorPagar(client, idCompra) {
  const sql = `
    UPDATE cuentas_por_pagar
    SET estatus = 'cancelada', saldo_pendiente = 0
    WHERE id_compra = $1
    RETURNING *
  `;
  const res = await client.query(sql, [idCompra]);
  return res.rows[0] || null;
}

export async function obtenerPagosDeCxp(client, idCompra) {
  const sql = `
    SELECT p.*
    FROM cxp_pagos p
    INNER JOIN cuentas_por_pagar cxp ON cxp.id_cxp = p.id_cxp
    WHERE cxp.id_compra = $1
  `;
  const res = await client.query(sql, [idCompra]);
  return res.rows;
}

export async function obtenerCategoriaCompras(client, empresaId = null) {
  const sql = `
    SELECT id_categoria
    FROM categorias
    WHERE estatus = 1
      AND ($1::int IS NULL OR empresa_id = $1::int)
    ORDER BY
      CASE
        WHEN LOWER(nombre) LIKE '%compra%' THEN 0
        WHEN LOWER(nombre) LIKE '%mercanc%' THEN 1
        WHEN LOWER(nombre) LIKE '%operativ%' THEN 2
        WHEN LOWER(nombre) LIKE '%general%' THEN 3
        ELSE 4
      END,
      id_categoria ASC
    LIMIT 1
  `;
  const res = await client.query(sql, [empresaId]);
  return res.rows[0]?.id_categoria ?? null;
}

export async function actualizarCostoProducto(client, idProducto, nuevoCosto, empresaId = null) {
  const sql = `
    UPDATE productos
    SET precio_compra = $1
    WHERE id_producto = $2
      AND ($3::int IS NULL OR empresa_id = $3::int)
    RETURNING id_producto, precio_compra
  `;
  const res = await client.query(sql, [nuevoCosto, idProducto, empresaId]);
  return res.rows[0] || null;
}

export async function contarDevoluciones(client, idCompra) {
  const sql = `
    SELECT COUNT(*)::int AS total
    FROM devoluciones_compra
    WHERE id_compra = $1
  `;
  const res = await client.query(sql, [idCompra]);
  return Number(res.rows[0]?.total || 0);
}

export async function itemsDevolubles(client, idCompra) {
  const sql = `
    SELECT
      dc.id_producto,
      p.nombre,
      p.tipo,
      p.stock,
      dc.costo_unitario,
      SUM(dc.cantidad) AS cantidad_comprada,
      COALESCE((
        SELECT SUM(ddc.cantidad)
        FROM detalle_devoluciones_compra ddc
        JOIN devoluciones_compra dev ON dev.id_devolucion = ddc.id_devolucion
        WHERE dev.id_compra = dc.id_compra AND ddc.id_producto = dc.id_producto
      ), 0) AS cantidad_devuelta
    FROM detalle_compras dc
    INNER JOIN productos p ON p.id_producto = dc.id_producto
    WHERE dc.id_compra = $1
    GROUP BY dc.id_compra, dc.id_producto, p.nombre, p.tipo, p.stock, dc.costo_unitario
  `;
  const { rows } = await client.query(sql, [idCompra]);
  return rows.map((r) => {
    const comprada = Number(r.cantidad_comprada);
    const devuelta = Number(r.cantidad_devuelta);
    const disponible = Math.max(0, Number((comprada - devuelta).toFixed(4)));
    return {
      id_producto: r.id_producto,
      nombre: r.nombre,
      tipo: r.tipo,
      stock: Number(r.stock ?? 0),
      costo_unitario: Number(r.costo_unitario),
      comprada,
      devuelta,
      disponible
    };
  });
}

export async function insertDevolucion(client, datos) {
  const sql = `
    INSERT INTO devoluciones_compra (
      id_compra,
      fecha,
      tipo,
      id_usuario,
      observaciones,
      empresa_id
    ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5)
    RETURNING id_devolucion, fecha, tipo
  `;
  const res = await client.query(sql, [
    datos.id_compra,
    datos.tipo || 'parcial',
    datos.id_usuario,
    datos.observaciones || null,
    datos.empresa_id || 1
  ]);
  return res.rows[0];
}

export async function insertDetalleDevolucion(client, datos) {
  const sql = `
    INSERT INTO detalle_devoluciones_compra (
      id_devolucion,
      id_producto,
      cantidad,
      costo_unitario,
      empresa_id
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const res = await client.query(sql, [
    datos.id_devolucion,
    datos.id_producto,
    datos.cantidad,
    datos.costo_unitario,
    datos.empresa_id || 1
  ]);
  return res.rows[0];
}

export async function listarDevoluciones(idCompra, db = pool) {
  const sql = `
    SELECT
      dev.id_devolucion,
      dev.id_compra,
      dev.fecha,
      dev.tipo,
      dev.observaciones,
      TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellido_paterno, ''))) AS usuario_nombre,
      COALESCE(SUM(ddc.cantidad * ddc.costo_unitario), 0) AS monto_total,
      json_agg(
        json_build_object(
          'id_det_dev_compra', ddc.id_det_dev_compra,
          'id_producto', ddc.id_producto,
          'cantidad', ddc.cantidad,
          'costo_unitario', ddc.costo_unitario,
          'producto_nombre', p.nombre,
          'codigo_producto', p.codigo
        )
      ) FILTER (WHERE ddc.id_det_dev_compra IS NOT NULL) AS items
    FROM devoluciones_compra dev
    LEFT JOIN usuarios u ON u.id_usuario = dev.id_usuario
    LEFT JOIN detalle_devoluciones_compra ddc ON ddc.id_devolucion = dev.id_devolucion
    LEFT JOIN productos p ON p.id_producto = ddc.id_producto
    WHERE dev.id_compra = $1
    GROUP BY dev.id_devolucion, dev.id_compra, dev.fecha, dev.tipo, dev.observaciones, u.nombre, u.apellido_paterno
    ORDER BY dev.fecha DESC, dev.id_devolucion DESC
  `;
  const res = await db.query(sql, [idCompra]);
  return res.rows.map(r => ({
    ...r,
    monto_total: Number(r.monto_total || 0),
    items: r.items || []
  }));
}

export async function obtenerCategoriaReembolso(client, empresaId = null) {
  const sql = `
    SELECT id_categoria
    FROM categorias
    WHERE estatus = 1
      AND ($1::int IS NULL OR empresa_id = $1::int)
    ORDER BY
      CASE
        WHEN LOWER(nombre) LIKE '%devol%' THEN 0
        WHEN LOWER(nombre) LIKE '%reembolso%' THEN 1
        WHEN LOWER(nombre) LIKE '%cobro%' THEN 2
        WHEN LOWER(nombre) LIKE '%compra%' THEN 3
        WHEN LOWER(nombre) LIKE '%general%' THEN 4
        ELSE 5
      END,
      id_categoria ASC
    LIMIT 1
  `;
  const res = await client.query(sql, [empresaId]);
  return res.rows[0]?.id_categoria || 1;
}

import pool from '../config/db.js';

export async function obtenerCuentas(filtros = {}, empresaId = null) {
  const params = [];

  let query = `
    SELECT
      cxc.id_cxc,
      cxc.id_cliente,
      cxc.id_venta,
      cxc.fecha_emision,
      cxc.fecha_vencimiento,
      cxc.monto_original,
      cxc.saldo_pendiente,
      cxc.estatus,
      c.nombre_cliente,
      CONCAT_WS(' ', c.apellido_paterno, c.apellido_materno) AS apellidos,
      v.codigo AS codigo_venta,
      v.fecha AS fecha_venta,
      CASE
        WHEN LOWER(TRIM(cxc.estatus)) = 'cancelada' THEN 'Cancelada'
        WHEN COALESCE(cxc.saldo_pendiente, 0) <= 0
          OR LOWER(TRIM(cxc.estatus)) IN ('saldada', 'pagada') THEN 'Saldada'
        WHEN cxc.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
        WHEN LOWER(TRIM(cxc.estatus)) = 'parcial' THEN 'Parcial'
        ELSE 'Pendiente'
      END AS estado_calculado
    FROM cuentas_por_cobrar cxc
    INNER JOIN clientes c ON c.id_cliente = cxc.id_cliente
    INNER JOIN ventas v ON v.id_venta = cxc.id_venta
    WHERE 1 = 1
  `;

  if (empresaId) {
    params.push(empresaId);
    query += ` AND cxc.empresa_id = $${params.length}`;
  }

  if (filtros.estatus && filtros.estatus !== 'todas') {
    if (filtros.estatus === 'vencida') {
      query += `
        AND cxc.saldo_pendiente > 0
        AND cxc.fecha_vencimiento < CURRENT_DATE
        AND LOWER(TRIM(cxc.estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
      `;
    } else if (filtros.estatus === 'pendiente') {
      query += `
        AND LOWER(TRIM(cxc.estatus)) = 'pendiente'
        AND cxc.fecha_vencimiento >= CURRENT_DATE
        AND cxc.saldo_pendiente > 0
      `;
    } else if (filtros.estatus === 'parcial') {
      query += `
        AND LOWER(TRIM(cxc.estatus)) = 'parcial'
        AND cxc.saldo_pendiente > 0
      `;
    } else if (filtros.estatus === 'saldada') {
      query += `
        AND (
          LOWER(TRIM(cxc.estatus)) IN ('saldada', 'pagada')
          OR cxc.saldo_pendiente <= 0
        )
      `;
    }
  }

  if (filtros.busqueda?.trim()) {
    params.push(`%${filtros.busqueda.trim()}%`);
    const p = `$${params.length}`;

    query += `
      AND (
        c.nombre_cliente ILIKE ${p}
        OR c.apellido_paterno ILIKE ${p}
        OR c.apellido_materno ILIKE ${p}
        OR v.codigo ILIKE ${p}
        OR CAST(cxc.id_cxc AS TEXT) ILIKE ${p}
      )
    `;
  }

  query += `
    ORDER BY
      CASE
        WHEN cxc.saldo_pendiente > 0
          AND cxc.fecha_vencimiento < CURRENT_DATE THEN 0
        ELSE 1
      END,
      cxc.fecha_vencimiento ASC,
      cxc.id_cxc DESC
  `;

  const { rows } = await pool.query(query, params);

  return rows;
}

export async function obtenerCuentaPorId(id) {
  const { rows } = await pool.query(`
    SELECT
      cxc.*,
      c.nombre_cliente,
      CONCAT_WS(' ', c.apellido_paterno, c.apellido_materno) AS apellidos,
      v.codigo AS codigo_venta
    FROM cuentas_por_cobrar cxc
    INNER JOIN clientes c ON c.id_cliente = cxc.id_cliente
    INNER JOIN ventas v ON v.id_venta = cxc.id_venta
    WHERE cxc.id_cxc = $1
    LIMIT 1
  `, [id]);

  return rows[0] || null;
}

export async function obtenerPagos(id) {
  const { rows } = await pool.query(`
    SELECT
      p.id_cobro,
      p.id_cxc,
      p.fecha,
      p.monto,
      p.forma_pago,
      p.observaciones,
      u.nombre AS nombre_usuario,
      CONCAT_WS(' ', u.apellido_paterno, u.apellido_materno) AS apellidos_usuario
    FROM cxc_cobros p
    LEFT JOIN usuarios u ON u.id_usuario = p.id_usuario
    WHERE p.id_cxc = $1
    ORDER BY p.fecha DESC, p.id_cobro DESC
  `, [id]);

  return rows;
}

export async function obtenerResumen(empresaId = null) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE LOWER(TRIM(estatus)) <> 'cancelada'
      )::INTEGER AS total_cuentas,

      COUNT(*) FILTER (
        WHERE LOWER(TRIM(estatus)) = 'pendiente'
          AND saldo_pendiente > 0
          AND fecha_vencimiento >= CURRENT_DATE
      )::INTEGER AS cuentas_pendientes,

      COUNT(*) FILTER (
        WHERE saldo_pendiente > 0
          AND fecha_vencimiento < CURRENT_DATE
          AND LOWER(TRIM(estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
      )::INTEGER AS cuentas_vencidas,

      COUNT(*) FILTER (
        WHERE LOWER(TRIM(estatus)) = 'parcial'
          AND saldo_pendiente > 0
      )::INTEGER AS cuentas_parciales,

      COALESCE(SUM(saldo_pendiente) FILTER (
        WHERE saldo_pendiente > 0
          AND LOWER(TRIM(estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
      ), 0) AS saldo_pendiente,

      COALESCE(SUM(saldo_pendiente) FILTER (
        WHERE saldo_pendiente > 0
          AND fecha_vencimiento < CURRENT_DATE
          AND LOWER(TRIM(estatus)) NOT IN ('cancelada', 'saldada', 'pagada')
      ), 0) AS saldo_vencido
    FROM cuentas_por_cobrar
    WHERE ($1::int IS NULL OR empresa_id = $1)
  `, [empresaId]);

  return rows[0];
}

export async function bloquearCuenta(client, id) {
  const { rows } = await client.query(`
    SELECT
      cxc.*,
      v.codigo AS codigo_venta
    FROM cuentas_por_cobrar cxc
    INNER JOIN ventas v ON v.id_venta = cxc.id_venta
    WHERE cxc.id_cxc = $1
    FOR UPDATE OF cxc
  `, [id]);

  return rows[0] || null;
}

export async function insertarCobro(client, datos) {
  const { rows } = await client.query(`
    INSERT INTO cxc_cobros (
      id_cxc,
      fecha,
      monto,
      forma_pago,
      id_usuario,
      observaciones,
      empresa_id
    )
    VALUES ($1, NOW(), $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    datos.id_cxc,
    datos.monto,
    datos.forma_pago,
    datos.id_usuario,
    datos.observaciones || null,
    datos.empresa_id ?? 1
  ]);

  return rows[0];
}

export async function actualizarSaldo(client, id, saldo, estatus) {
  const { rows } = await client.query(`
    UPDATE cuentas_por_cobrar
    SET
      saldo_pendiente = $2,
      estatus = $3
    WHERE id_cxc = $1
    RETURNING *
  `, [id, saldo, estatus]);

  return rows[0];
}

export async function actualizarVenta(client, idVenta, monto) {
  const { rows } = await client.query(`
    UPDATE ventas
    SET
      monto_pagado = COALESCE(monto_pagado, 0) + $2,
      estatus = CASE
        WHEN COALESCE(monto_pagado, 0) + $2 >= total THEN 'Pagada'
        ELSE 'Parcial'
      END
    WHERE id_venta = $1
    RETURNING id_venta, monto_pagado, total, estatus
  `, [idVenta, monto]);

  return rows[0] || null;
}

export async function obtenerCategoriaCobros(client, empresaId = null) {
  const { rows } = await client.query(`
    SELECT id_categoria
    FROM categorias
    WHERE estatus = 1
      AND ($1::int IS NULL OR empresa_id = $1)
    ORDER BY
      CASE
        WHEN LOWER(TRIM(nombre)) = LOWER('Cobros de clientes') THEN 0
        WHEN LOWER(TRIM(nombre)) LIKE '%cobro%' THEN 1
        WHEN LOWER(TRIM(nombre)) LIKE '%venta%' THEN 2
        WHEN LOWER(TRIM(nombre)) LIKE '%servicio%' THEN 3
        WHEN LOWER(TRIM(nombre)) LIKE '%general%' THEN 4
        ELSE 5
      END,
      id_categoria ASC
    LIMIT 1
  `, [empresaId]);

  return rows[0]?.id_categoria || 1;
}

import pool from '../config/db.js';

// Construye filtros de fecha con parámetros seguros.
// Se utiliza el límite superior exclusivo para incluir todo el día final.
const filtroFechas = (campo, fechaInicio, fechaFin, empresaId = null, alias = '') => {
  const condiciones = [];
  const valores = [];

  if (empresaId) {
    valores.push(empresaId);
    const prefix = alias ? `${alias}.` : '';
    condiciones.push(`${prefix}empresa_id = $${valores.length}`);
  }

  if (fechaInicio) {
    valores.push(fechaInicio);
    condiciones.push(`${campo} >= $${valores.length}::date`);
  }

  if (fechaFin) {
    valores.push(fechaFin);
    condiciones.push(
      `${campo} < ($${valores.length}::date + INTERVAL '1 day')`
    );
  }

  return {
    where: condiciones.length
      ? `WHERE ${condiciones.join(' AND ')}`
      : '',
    valores
  };
};

// RESUMEN DE VENTAS
export const obtenerReporteVentas = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId
  );

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_ventas,
      COALESCE(SUM(total), 0) AS monto_total,
      COALESCE(SUM(monto_pagado), 0) AS monto_pagado,
      COUNT(*) FILTER (
        WHERE LOWER(estatus) = 'pagada'
      )::int AS ventas_pagadas,
      COUNT(*) FILTER (
        WHERE LOWER(estatus) = 'parcial'
      )::int AS ventas_parciales,
      COUNT(*) FILTER (
        WHERE LOWER(estatus) = 'pendiente'
      )::int AS ventas_pendientes
    FROM ventas
    ${where}
  `, valores);

  return rows[0];
};

// RESUMEN DE COMPRAS
export const obtenerReporteCompras = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId
  );

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_compras,
      COALESCE(SUM(total), 0) AS monto_total,
      COUNT(*) FILTER (
        WHERE LOWER(estatus) = 'pendiente_pago'
      )::int AS compras_pendientes_pago
    FROM compras
    ${where}
  `, valores);

  return rows[0];
};

// RESUMEN DE INGRESOS
export const obtenerReporteIngresos = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId
  );

  const condicion = where
    ? `${where} AND LOWER(estatus) = 'activo'`
    : `WHERE LOWER(estatus) = 'activo'`;

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_ingresos,
      COALESCE(SUM(monto), 0) AS monto_total
    FROM ingresos
    ${condicion}
  `, valores);

  return rows[0];
};

// RESUMEN DE GASTOS
export const obtenerReporteGastos = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId
  );

  const condicion = where
    ? `${where} AND LOWER(estatus) = 'activo'`
    : `WHERE LOWER(estatus) = 'activo'`;

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_gastos,
      COALESCE(SUM(monto), 0) AS monto_total
    FROM gastos
    ${condicion}
  `, valores);

  return rows[0];
};

// CUENTAS POR COBRAR: SALDOS ACTUALES
export const obtenerReporteCuentasPorCobrar = async (empresaId = null) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_cuentas,
      COUNT(*) FILTER (
        WHERE saldo_pendiente > 0
      )::int AS cuentas_pendientes,
      COUNT(*) FILTER (
        WHERE saldo_pendiente > 0
          AND fecha_vencimiento < CURRENT_DATE
      )::int AS cuentas_vencidas,
      COALESCE(SUM(
        CASE WHEN saldo_pendiente > 0
          THEN saldo_pendiente ELSE 0 END
      ), 0) AS saldo_pendiente,
      COALESCE(SUM(
        CASE WHEN saldo_pendiente > 0
          AND fecha_vencimiento < CURRENT_DATE
          THEN saldo_pendiente ELSE 0 END
      ), 0) AS saldo_vencido
    FROM cuentas_por_cobrar
    WHERE ($1::int IS NULL OR empresa_id = $1)
  `, [empresaId]);

  return rows[0];
};

// CUENTAS POR PAGAR: SALDOS ACTUALES
export const obtenerReporteCuentasPorPagar = async (empresaId = null) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_cuentas,
      COUNT(*) FILTER (
        WHERE saldo_pendiente > 0
      )::int AS cuentas_pendientes,
      COUNT(*) FILTER (
        WHERE saldo_pendiente > 0
          AND fecha_vencimiento < CURRENT_DATE
      )::int AS cuentas_vencidas,
      COALESCE(SUM(
        CASE WHEN saldo_pendiente > 0
          THEN saldo_pendiente ELSE 0 END
      ), 0) AS saldo_pendiente,
      COALESCE(SUM(
        CASE WHEN saldo_pendiente > 0
          AND fecha_vencimiento < CURRENT_DATE
          THEN saldo_pendiente ELSE 0 END
      ), 0) AS saldo_vencido
    FROM cuentas_por_pagar
    WHERE ($1::int IS NULL OR empresa_id = $1)
  `, [empresaId]);

  return rows[0];
};

// INVENTARIO: EXISTENCIAS ACTUALES
export const obtenerReporteInventario = async (empresaId = null) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE tipo = 'producto'
          AND estatus = 1
      )::int AS total_productos,
      COUNT(*) FILTER (
        WHERE tipo = 'producto'
          AND estatus = 1
          AND stock <= stock_minimo
      )::int AS productos_stock_bajo,
      COALESCE(SUM(
        CASE
          WHEN tipo = 'producto' AND estatus = 1
          THEN stock * precio_compra
          ELSE 0
        END
      ), 0) AS valor_inventario
    FROM productos
    WHERE ($1::int IS NULL OR empresa_id = $1)
  `, [empresaId]);

  return rows[0];
};

// DETALLE DE VENTAS
export const obtenerDetalleVentas = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'v.fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId,
    'v'
  );

  const { rows } = await pool.query(
    `
    SELECT
      v.id_venta,
      v.codigo,
      v.fecha,
      v.id_cliente,
      NULLIF(
        TRIM(
          CONCAT_WS(
            ' ',
            NULLIF(TRIM(cl.nombre_cliente), ''),
            NULLIF(TRIM(cl.apellido_paterno), ''),
            NULLIF(TRIM(cl.apellido_materno), '')
          )
        ),
        ''
      ) AS nombre_cliente,
      v.total,
      v.monto_pagado,
      v.condiciones_pago,
      v.forma_pago,
      v.estatus
    FROM ventas v
    LEFT JOIN clientes cl
      ON cl.id_cliente = v.id_cliente
    ${where}
    ORDER BY v.fecha DESC, v.id_venta DESC
    `,
    valores
  );

  return rows;
};

// DETALLE DE COMPRAS
export const obtenerDetalleCompras = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'c.fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId,
    'c'
  );

  const { rows } = await pool.query(
    `
    SELECT
      c.id_compra,
      c.codigo,
      c.fecha,
      c.id_proveedor,
      p.nombre_empresa AS nombre_proveedor,
      c.total,
      c.condiciones_pago,
      c.fecha_vencimiento,
      c.estatus,
      cxp.id_cxp,
      cxp.saldo_pendiente,
      cxp.estatus AS estado_cuenta_por_pagar
    FROM compras c
    LEFT JOIN proveedores p
      ON p.id_proveedor = c.id_proveedor
    LEFT JOIN LATERAL (
      SELECT
        cp.id_cxp,
        cp.saldo_pendiente,
        cp.estatus
      FROM cuentas_por_pagar cp
      WHERE cp.id_compra = c.id_compra
      ORDER BY cp.id_cxp DESC
      LIMIT 1
    ) cxp ON TRUE
    ${where}
    ORDER BY c.fecha DESC, c.id_compra DESC
    `,
    valores
  );

  return rows;
};

export const obtenerDetalleIngresos = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'i.fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId,
    'i'
  );

  const { rows } = await pool.query(
    `
    SELECT
      i.id_ingreso,
      i.fecha,
      i.concepto,
      i.id_categoria,
      cat.nombre AS nombre_categoria,
      i.monto,
      i.forma_pago,
      i.origen,
      i.id_venta,
      i.id_cobro,
      i.estatus
    FROM ingresos i
    LEFT JOIN categorias cat
      ON cat.id_categoria = i.id_categoria
    ${where}
      ${where ? 'AND' : 'WHERE'} LOWER(i.estatus) = 'activo'
    ORDER BY i.fecha DESC, i.id_ingreso DESC
    `,
    valores
  );

  return rows;
};

export const obtenerDetalleGastos = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'g.fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId,
    'g'
  );

  const { rows } = await pool.query(
    `
    SELECT
      g.id_gasto,
      g.fecha,
      g.concepto,
      g.id_categoria,
      cat.nombre AS nombre_categoria,
      g.monto,
      g.forma_pago,
      g.observaciones,
      g.estatus
    FROM gastos g
    LEFT JOIN categorias cat
      ON cat.id_categoria = g.id_categoria
    ${where}
      ${where ? 'AND' : 'WHERE'} LOWER(g.estatus) = 'activo'
    ORDER BY g.fecha DESC, g.id_gasto DESC
    `,
    valores
  );

  return rows;
};

// DETALLE DE INVENTARIO: EXISTENCIAS ACTUALES
export const obtenerDetalleInventario = async (empresaId = null) => {
  const { rows } = await pool.query(`
        SELECT
            p.id_producto,
            p.nombre,
            p.tipo,
            p.stock,
            p.stock_minimo,
            p.precio_compra,
            p.stock * p.precio_compra AS valor_inventario,
            p.estatus,
            CASE
                WHEN p.stock <= p.stock_minimo
                    THEN 'Stock bajo'
                ELSE 'Normal'
            END AS estado_stock
        FROM productos p
        WHERE p.tipo = 'producto'
          AND p.estatus = 1
          AND ($1::int IS NULL OR p.empresa_id = $1)
        ORDER BY
            CASE
                WHEN p.stock <= p.stock_minimo THEN 0
                ELSE 1
            END,
            p.nombre ASC
    `, [empresaId]);

  return rows;
};

// DETALLE DE CUENTAS POR COBRAR: SALDOS ACTUALES
export const obtenerDetalleCuentasPorCobrar = async (empresaId = null) => {
  const { rows } = await pool.query(`
        SELECT
            cxc.id_cxc,
            cxc.id_cliente,
            cxc.id_venta,
            NULLIF(
                TRIM(
                    CONCAT_WS(
                        ' ',
                        NULLIF(TRIM(cl.nombre_cliente), ''),
                        NULLIF(TRIM(cl.apellido_paterno), ''),
                        NULLIF(TRIM(cl.apellido_materno), '')
                    )
                ),
                ''
            ) AS nombre_cliente,
            v.codigo AS codigo_venta,
            cxc.fecha_emision,
            cxc.fecha_vencimiento,
            cxc.monto_original,
            cxc.saldo_pendiente,
            cxc.estatus,
            CASE
                WHEN cxc.saldo_pendiente <= 0 THEN 'Pagada'
                WHEN cxc.fecha_vencimiento < CURRENT_DATE
                    THEN 'Vencida'
                ELSE 'Pendiente'
            END AS estado_cobro
        FROM cuentas_por_cobrar cxc
        LEFT JOIN clientes cl
            ON cl.id_cliente = cxc.id_cliente
        LEFT JOIN ventas v
            ON v.id_venta = cxc.id_venta
        WHERE ($1::int IS NULL OR cxc.empresa_id = $1)
        ORDER BY
            CASE
                WHEN cxc.saldo_pendiente > 0
                 AND cxc.fecha_vencimiento < CURRENT_DATE
                    THEN 0
                WHEN cxc.saldo_pendiente > 0
                    THEN 1
                ELSE 2
            END,
            cxc.fecha_vencimiento ASC NULLS LAST,
            cxc.id_cxc DESC
    `, [empresaId]);

  return rows;
};

// DETALLE DE CUENTAS POR PAGAR: SALDOS ACTUALES
export const obtenerDetalleCuentasPorPagar = async (empresaId = null) => {
  const { rows } = await pool.query(`
        SELECT
            cxp.id_cxp,
            cxp.id_proveedor,
            cxp.id_compra,
            COALESCE(
                NULLIF(TRIM(p.nombre_empresa), ''),
                NULLIF(TRIM(p.nombre_contacto), ''),
                'Sin proveedor'
            ) AS nombre_proveedor,
            c.codigo AS codigo_compra,
            cxp.fecha_emision,
            cxp.fecha_vencimiento,
            cxp.monto_original,
            cxp.saldo_pendiente,
            cxp.estatus,
            CASE
                WHEN cxp.saldo_pendiente <= 0 THEN 'Pagada'
                WHEN cxp.fecha_vencimiento < CURRENT_DATE
                    THEN 'Vencida'
                ELSE 'Pendiente'
            END AS estado_pago
        FROM cuentas_por_pagar cxp
        LEFT JOIN proveedores p
            ON p.id_proveedor = cxp.id_proveedor
        LEFT JOIN compras c
            ON c.id_compra = cxp.id_compra
        WHERE ($1::int IS NULL OR cxp.empresa_id = $1)
        ORDER BY
            CASE
                WHEN cxp.saldo_pendiente > 0
                 AND cxp.fecha_vencimiento < CURRENT_DATE
                    THEN 0
                WHEN cxp.saldo_pendiente > 0
                    THEN 1
                ELSE 2
            END,
            cxp.fecha_vencimiento ASC NULLS LAST,
            cxp.id_cxp DESC
    `, [empresaId]);

  return rows;
};

// DETALLE DE MOVIMIENTOS DE INVENTARIO
export const obtenerDetalleMovimientosInventario = async (filtros = {}, empresaId = null) => {
  const { where, valores } = filtroFechas(
    'm.fecha',
    filtros.fecha_inicio,
    filtros.fecha_fin,
    empresaId,
    'm'
  );

  const { rows } = await pool.query(`
    SELECT
      m.id_movimiento,
      m.fecha,
      p.id_producto,
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
      u.nombre_usuario
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
    ${where}
    ORDER BY m.fecha DESC, m.id_movimiento DESC
  `, valores);

  return rows;
};


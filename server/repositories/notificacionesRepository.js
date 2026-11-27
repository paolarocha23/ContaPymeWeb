import pool from '../config/db.js';

/**
 * Obtiene cuentas por cobrar vencidas, por vencer y preventivas.
 * Solo incluye cuentas con saldo pendiente mayor a cero.
 */
export async function obtenerAlertasCxc(diasAnticipacion = 30, empresaId = null) {
  const dias = diasAnticipacion ? parseInt(diasAnticipacion, 10) : 30;
  const { rows } = await pool.query(`
    SELECT
      cxc.id_cxc,
      cxc.id_cliente,
      cxc.id_venta,
      COALESCE(
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
        ),
        'Cliente sin nombre'
      ) AS nombre_cliente,
      cl.telefono AS telefono_cliente,
      v.codigo AS codigo_venta,
      cxc.fecha_vencimiento,
      cxc.saldo_pendiente,
      DATE_PART('day', cxc.fecha_vencimiento::timestamp - CURRENT_DATE::timestamp)::int AS dias_restantes,
      CASE
        WHEN cxc.fecha_vencimiento < CURRENT_DATE THEN 'vencida'
        WHEN cxc.fecha_vencimiento = CURRENT_DATE THEN 'vence_hoy'
        WHEN cxc.fecha_vencimiento <= CURRENT_DATE + 7 THEN 'preventiva'
        ELSE 'proxima'
      END AS tipo_alerta
    FROM cuentas_por_cobrar cxc
    LEFT JOIN clientes cl
      ON cl.id_cliente = cxc.id_cliente
    LEFT JOIN ventas v
      ON v.id_venta = cxc.id_venta
    WHERE cxc.saldo_pendiente > 0
      AND cxc.fecha_vencimiento IS NOT NULL
      AND cxc.fecha_vencimiento <= CURRENT_DATE + $1::integer
      AND ($2::int IS NULL OR cxc.empresa_id = $2 OR cxc.empresa_id IS NULL)
    ORDER BY
      cxc.fecha_vencimiento ASC,
      cxc.id_cxc DESC
  `, [dias, empresaId]);

  return rows;
}

/**
 * Obtiene cuentas por pagar vencidas, por vencer y preventivas.
 * Solo incluye cuentas con saldo pendiente mayor a cero.
 */
export async function obtenerAlertasCxp(diasAnticipacion = 30, empresaId = null) {
  const dias = diasAnticipacion ? parseInt(diasAnticipacion, 10) : 30;
  const { rows } = await pool.query(`
    SELECT
      cxp.id_cxp,
      cxp.id_proveedor,
      cxp.id_compra,
      COALESCE(
        NULLIF(TRIM(p.nombre_empresa), ''),
        NULLIF(TRIM(p.nombre_contacto), ''),
        'Proveedor sin nombre'
      ) AS nombre_proveedor,
      p.telefono AS telefono_proveedor,
      c.codigo AS codigo_compra,
      cxp.fecha_vencimiento,
      cxp.saldo_pendiente,
      DATE_PART('day', cxp.fecha_vencimiento::timestamp - CURRENT_DATE::timestamp)::int AS dias_restantes,
      CASE
        WHEN cxp.fecha_vencimiento < CURRENT_DATE THEN 'vencida'
        WHEN cxp.fecha_vencimiento = CURRENT_DATE THEN 'vence_hoy'
        WHEN cxp.fecha_vencimiento <= CURRENT_DATE + 7 THEN 'preventiva'
        ELSE 'proxima'
      END AS tipo_alerta
    FROM cuentas_por_pagar cxp
    LEFT JOIN proveedores p
      ON p.id_proveedor = cxp.id_proveedor
    LEFT JOIN compras c
      ON c.id_compra = cxp.id_compra
    WHERE cxp.saldo_pendiente > 0
      AND cxp.fecha_vencimiento IS NOT NULL
      AND cxp.fecha_vencimiento <= CURRENT_DATE + $1::integer
      AND ($2::int IS NULL OR cxp.empresa_id = $2 OR cxp.empresa_id IS NULL)
    ORDER BY
      cxp.fecha_vencimiento ASC,
      cxp.id_cxp DESC
  `, [dias, empresaId]);

  return rows;
}

/**
 * Obtiene productos en riesgo preventivo de desabasto.
 * Aquellos con stock por encima del mínimo pero dentro del margen de seguridad (próximos a agotarse).
 */
export async function obtenerRiesgoInventarioPreventivo(empresaId = null) {
  const { rows } = await pool.query(`
    SELECT
      p.id_producto,
      p.codigo,
      p.nombre,
      p.stock,
      p.stock_minimo,
      p.precio_compra,
      c.nombre AS nombre_categoria,
      (p.stock - p.stock_minimo) AS margen_unidades
    FROM productos p
    LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE LOWER(p.tipo) = 'producto'
      AND p.estatus = 1
      AND p.stock_minimo IS NOT NULL
      AND p.stock_minimo > 0
      AND p.stock > p.stock_minimo
      AND p.stock <= (p.stock_minimo * 1.35 + 2)
      AND ($1::int IS NULL OR p.empresa_id = $1 OR p.empresa_id IS NULL)
    ORDER BY (p.stock - p.stock_minimo) ASC, p.nombre ASC
    LIMIT 10
  `, [empresaId]);

  return rows;
}

/**
 * Evalúa el balance de liquidez preventivo (Caja vs compromisos de cuentas por pagar a 7 días).
 */
export async function obtenerAlertasLiquidezPreventiva(empresaId = null) {
  try {
    const { rows: saldoCajaRows } = await pool.query(`
      SELECT COALESCE(
        SUM(CASE WHEN LOWER(tipo) IN ('ingreso', 'entrada') THEN monto ELSE -monto END),
        0
      )::numeric AS saldo_caja
      FROM movimientos_caja
      WHERE ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
    `, [empresaId]);

    const { rows: cxpProximasRows } = await pool.query(`
      SELECT
        COALESCE(SUM(saldo_pendiente), 0)::numeric AS total_cxp_7d,
        COUNT(*)::int AS facturas_pendientes
      FROM cuentas_por_pagar
      WHERE saldo_pendiente > 0
        AND fecha_vencimiento IS NOT NULL
        AND fecha_vencimiento <= CURRENT_DATE + 7
        AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
    `, [empresaId]);

    const saldoCaja = Number(saldoCajaRows[0]?.saldo_caja || 0);
    const totalCxp7d = Number(cxpProximasRows[0]?.total_cxp_7d || 0);
    const facturasPendientes = Number(cxpProximasRows[0]?.facturas_pendientes || 0);

    if (totalCxp7d > 0 && totalCxp7d > saldoCaja) {
      return [{
        id: 'liquidez-preventiva',
        id_notificacion: 'liquidez-preventiva',
        categoria: 'caja',
        tipo: 'preventiva',
        subtipo: 'riesgo_liquidez',
        prioridad: 'media',
        es_preventiva: true,
        titulo: 'Aviso preventivo de liquidez en caja',
        mensaje: `Los compromisos de pago a proveedores para los próximos 7 días ($${totalCxp7d.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) superan el saldo en caja disponible ($${saldoCaja.toLocaleString('es-MX', { minimumFractionDigits: 2 })}). Se recomienda acelerar la cobranza a clientes o planificar tesorería.`,
        fecha: new Date().toISOString().slice(0, 10),
        referencia: `${facturasPendientes} pagos por vencer`,
        saldo_pendiente: totalCxp7d - saldoCaja
      }];
    }

    return [];
  } catch (err) {
    console.warn('Advertencia en verificación preventiva de liquidez:', err.message);
    return [];
  }
}

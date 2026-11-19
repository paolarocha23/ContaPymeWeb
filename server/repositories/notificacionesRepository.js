import pool from '../config/db.js';

/**
 * Obtiene cuentas por cobrar vencidas o próximas a vencer.
 * Solo incluye cuentas con saldo pendiente mayor a cero.
 */
export async function obtenerAlertasCxc(diasAnticipacion = 7, empresaId = null) {
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
      v.codigo AS codigo_venta,
      cxc.fecha_vencimiento,
      cxc.saldo_pendiente,
      CASE
        WHEN cxc.fecha_vencimiento < CURRENT_DATE
          THEN 'vencida'
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
      AND ($2::int IS NULL OR cxc.empresa_id = $2)
    ORDER BY
      cxc.fecha_vencimiento ASC,
      cxc.id_cxc DESC
  `, [diasAnticipacion, empresaId]);

    return rows;
}

/**
 * Obtiene cuentas por pagar vencidas o próximas a vencer.
 * Solo incluye cuentas con saldo pendiente mayor a cero.
 */
export async function obtenerAlertasCxp(diasAnticipacion = 7, empresaId = null) {
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
      c.codigo AS codigo_compra,
      cxp.fecha_vencimiento,
      cxp.saldo_pendiente,
      CASE
        WHEN cxp.fecha_vencimiento < CURRENT_DATE
          THEN 'vencida'
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
      AND ($2::int IS NULL OR cxp.empresa_id = $2)
    ORDER BY
      cxp.fecha_vencimiento ASC,
      cxp.id_cxp DESC
  `, [diasAnticipacion, empresaId]);

    return rows;
}

import pool from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { generarAnalisisFinancieroIA } from '../services/asistenteFinancieroService.js';

const MESES_ES = {
  'January': 'Enero',
  'February': 'Febrero',
  'March': 'Marzo',
  'April': 'Abril',
  'May': 'Mayo',
  'June': 'Junio',
  'July': 'Julio',
  'August': 'Agosto',
  'September': 'Septiembre',
  'October': 'Octubre',
  'November': 'Noviembre',
  'December': 'Diciembre'
};

const calcCambio = (actual, previo) => {
  const cur = Number(actual || 0);
  const prev = Number(previo || 0);
  if (prev === 0) {
    return cur > 0 ? '+ 100%' : '0%';
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  return pct >= 0 ? `+ ${pct}%` : `- ${Math.abs(pct)}%`;
};

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const empresaId = req.user?.empresa_id || 1;

  // 1. Métricas del mes actual y mes anterior
  const metricsSql = `
    WITH current_month AS (
      SELECT 
        date_trunc('month', CURRENT_DATE) AS start_cur,
        date_trunc('month', CURRENT_DATE) + interval '1 month' AS end_cur,
        date_trunc('month', CURRENT_DATE) - interval '1 month' AS start_prev,
        date_trunc('month', CURRENT_DATE) AS end_prev
    )
    SELECT
      -- Ventas
      COALESCE((SELECT SUM(total) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS ventas_monto,
      COALESCE((SELECT COUNT(*) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS ventas_cantidad,
      COALESCE((SELECT SUM(total) FROM ventas WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS ventas_monto_prev,
      
      -- Compras
      COALESCE((SELECT SUM(total) FROM compras WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS compras_monto,
      COALESCE((SELECT COUNT(*) FROM compras WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS compras_cantidad,
      COALESCE((SELECT SUM(total) FROM compras WHERE LOWER(estatus) != 'cancelada' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS compras_monto_prev,

      -- Gastos
      COALESCE((SELECT SUM(monto) FROM gastos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS gastos_monto,
      COALESCE((SELECT COUNT(*) FROM gastos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS gastos_cantidad,
      COALESCE((SELECT SUM(monto) FROM gastos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS gastos_monto_prev,

      -- Ingresos
      COALESCE((SELECT SUM(monto) FROM ingresos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS ingresos_monto,
      COALESCE((SELECT COUNT(*) FROM ingresos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_cur AND fecha < cm.end_cur AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS ingresos_cantidad,
      COALESCE((SELECT SUM(monto) FROM ingresos WHERE LOWER(estatus) = 'activo' AND fecha >= cm.start_prev AND fecha < cm.end_prev AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)), 0) AS ingresos_monto_prev
    FROM current_month cm
  `;

  // 2. Gráfica anual (últimos 12 meses)
  const chart6mSql = `
    WITH meses AS (
      SELECT 
        generate_series(
          date_trunc('month', CURRENT_DATE) - interval '11 months',
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) AS mes_inicio
    )
    SELECT
      TRIM(TO_CHAR(m.mes_inicio, 'Month')) AS nombre_mes_en,
      TO_CHAR(m.mes_inicio, 'YYYY-MM') AS periodo,
      COALESCE((
        SELECT SUM(total) FROM ventas 
        WHERE LOWER(estatus) != 'cancelada' 
          AND fecha >= m.mes_inicio 
          AND fecha < m.mes_inicio + interval '1 month'
          AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
      ), 0) AS ventas,
      COALESCE((
        SELECT SUM(monto) FROM ingresos 
        WHERE LOWER(estatus) = 'activo' 
          AND fecha >= m.mes_inicio 
          AND fecha < m.mes_inicio + interval '1 month'
          AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
      ), 0) AS ingresos,
      COALESCE((
        SELECT SUM(monto) FROM gastos 
        WHERE LOWER(estatus) = 'activo' 
          AND fecha >= m.mes_inicio 
          AND fecha < m.mes_inicio + interval '1 month'
          AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
      ), 0) AS gastos
    FROM meses m
    ORDER BY m.mes_inicio ASC
  `;

  // 3. Inventario
  const invSql = `
    SELECT
      COUNT(*)::int AS total_productos,
      COUNT(*) FILTER (WHERE stock > COALESCE(stock_minimo, 0) AND stock > 0)::int AS normal,
      COUNT(*) FILTER (WHERE stock <= stock_minimo AND stock > 0)::int AS bajo,
      COUNT(*) FILTER (WHERE stock <= 0)::int AS agotado
    FROM productos
    WHERE estatus = 1 AND tipo = 'producto' AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  // 4. Ventas hoy y últimos 7 días
  const todaySql = `
    SELECT
      COALESCE(SUM(total), 0) AS monto_hoy,
      COUNT(*)::int AS cantidad_hoy
    FROM ventas
    WHERE LOWER(estatus) != 'cancelada' AND fecha::date = CURRENT_DATE AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  const daysSql = `
    WITH dias AS (
      SELECT 
        generate_series(
          CURRENT_DATE - interval '6 days',
          CURRENT_DATE,
          interval '1 day'
        )::date AS dia
    )
    SELECT
      d.dia,
      CASE EXTRACT(DOW FROM d.dia)
        WHEN 0 THEN 'Dom'
        WHEN 1 THEN 'Lun'
        WHEN 2 THEN 'Mar'
        WHEN 3 THEN 'Mié'
        WHEN 4 THEN 'Jue'
        WHEN 5 THEN 'Vie'
        WHEN 6 THEN 'Sáb'
      END AS nombre_dia,
      (d.dia = CURRENT_DATE) AS es_hoy,
      COALESCE((
        SELECT SUM(total) FROM ventas
        WHERE LOWER(estatus) != 'cancelada'
          AND fecha::date = d.dia
          AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
      ), 0) AS total_dia,
      COALESCE((
        SELECT COUNT(*) FROM ventas
        WHERE LOWER(estatus) != 'cancelada'
          AND fecha::date = d.dia
          AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
      ), 0)::int AS count_dia
    FROM dias d
    ORDER BY d.dia ASC
  `;

  // 5. Cuentas por cobrar
  const cxcResumenSql = `
    SELECT
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0) AS saldo_total,
      COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada'))::int AS vencidas_count
    FROM cuentas_por_cobrar
    WHERE ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  const cxcTopSql = `
    SELECT
      cxc.id_cxc,
      TRIM(CONCAT(c.nombre_cliente, ' ', COALESCE(c.apellido_paterno, ''))) AS cliente,
      cxc.saldo_pendiente,
      cxc.fecha_vencimiento,
      CASE
        WHEN cxc.fecha_vencimiento < CURRENT_DATE THEN 'Vencido'
        WHEN cxc.estatus = 'parcial' THEN 'Parcial'
        ELSE 'Pendiente'
      END AS estado
    FROM cuentas_por_cobrar cxc
    JOIN clientes c ON c.id_cliente = cxc.id_cliente
    WHERE cxc.saldo_pendiente > 0 AND LOWER(cxc.estatus) NOT IN ('cancelada', 'saldada', 'pagada')
      AND ($1::int IS NULL OR cxc.empresa_id = $1 OR cxc.empresa_id IS NULL)
    ORDER BY cxc.fecha_vencimiento ASC, cxc.id_cxc DESC
    LIMIT 5
  `;

  // 6. Cuentas por pagar
  const cxpResumenSql = `
    SELECT
      COALESCE(SUM(saldo_pendiente) FILTER (WHERE saldo_pendiente > 0 AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada')), 0) AS saldo_total,
      COUNT(*) FILTER (WHERE saldo_pendiente > 0 AND fecha_vencimiento < CURRENT_DATE AND LOWER(estatus) NOT IN ('cancelada', 'saldada', 'pagada'))::int AS vencidas_count
    FROM cuentas_por_pagar
    WHERE ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
  `;

  const cxpTopSql = `
    SELECT
      cxp.id_cxp,
      p.nombre_empresa AS proveedor,
      cxp.saldo_pendiente,
      cxp.fecha_vencimiento,
      CASE
        WHEN cxp.fecha_vencimiento < CURRENT_DATE THEN 'Vencido'
        WHEN cxp.estatus = 'parcial' THEN 'Parcial'
        ELSE 'Pendiente'
      END AS estado
    FROM cuentas_por_pagar cxp
    JOIN proveedores p ON p.id_proveedor = cxp.id_proveedor
    WHERE cxp.saldo_pendiente > 0 AND LOWER(cxp.estatus) NOT IN ('cancelada', 'saldada', 'pagada')
      AND ($1::int IS NULL OR cxp.empresa_id = $1 OR cxp.empresa_id IS NULL)
    ORDER BY cxp.fecha_vencimiento ASC, cxp.id_cxp DESC
    LIMIT 5
  `;

  // 7. Alertas de inventario
  const alertasBajasSql = `
    SELECT id_producto, nombre, stock, stock_minimo, unidad_medida
    FROM productos
    WHERE estatus = 1 AND tipo = 'producto' AND stock <= stock_minimo AND stock > 0
      AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
    ORDER BY stock ASC
    LIMIT 6
  `;

  const alertasAgotadasSql = `
    SELECT id_producto, nombre, stock, unidad_medida
    FROM productos
    WHERE estatus = 1 AND tipo = 'producto' AND stock <= 0
      AND ($1::int IS NULL OR empresa_id = $1 OR empresa_id IS NULL)
    ORDER BY nombre ASC
    LIMIT 6
  `;

  // Ejecución en paralelo
  const [
    mRes,
    chartRes,
    invRes,
    todayRes,
    daysRes,
    cxcSumRes,
    cxcTopRes,
    cxpSumRes,
    cxpTopRes,
    alertasBajasRes,
    alertasAgotadasRes
  ] = await Promise.all([
    pool.query(metricsSql, [empresaId]),
    pool.query(chart6mSql, [empresaId]),
    pool.query(invSql, [empresaId]),
    pool.query(todaySql, [empresaId]),
    pool.query(daysSql, [empresaId]),
    pool.query(cxcResumenSql, [empresaId]),
    pool.query(cxcTopSql, [empresaId]),
    pool.query(cxpResumenSql, [empresaId]),
    pool.query(cxpTopSql, [empresaId]),
    pool.query(alertasBajasSql, [empresaId]),
    pool.query(alertasAgotadasSql, [empresaId])
  ]);

  const m = mRes.rows[0];
  const inv = invRes.rows[0];
  const today = todayRes.rows[0];
  const cxcSum = cxcSumRes.rows[0];
  const cxpSum = cxpSumRes.rows[0];

  // Formatear meses de la gráfica
  const grafica_semestral = chartRes.rows.map((row) => ({
    mes: MESES_ES[row.nombre_mes_en] || row.nombre_mes_en,
    periodo: row.periodo,
    ventas: Number(row.ventas || 0),
    ingresos: Number(row.ingresos || 0),
    gastos: Number(row.gastos || 0)
  }));

  // Formatear fecha de hoy en español
  const hoyFecha = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  res.json({
    success: true,
    data: {
      metricas: {
        ventas: {
          monto: Number(m.ventas_monto || 0),
          cantidad: Number(m.ventas_cantidad || 0),
          cambio: calcCambio(m.ventas_monto, m.ventas_monto_prev),
          down: Number(m.ventas_monto) < Number(m.ventas_monto_prev)
        },
        compras: {
          monto: Number(m.compras_monto || 0),
          cantidad: Number(m.compras_cantidad || 0),
          cambio: calcCambio(m.compras_monto, m.compras_monto_prev),
          down: Number(m.compras_monto) < Number(m.compras_monto_prev)
        },
        gastos: {
          monto: Number(m.gastos_monto || 0),
          cantidad: Number(m.gastos_cantidad || 0),
          cambio: calcCambio(m.gastos_monto, m.gastos_monto_prev),
          down: Number(m.gastos_monto) < Number(m.gastos_monto_prev)
        },
        ingresos: {
          monto: Number(m.ingresos_monto || 0),
          cantidad: Number(m.ingresos_cantidad || 0),
          cambio: calcCambio(m.ingresos_monto, m.ingresos_monto_prev),
          down: Number(m.ingresos_monto) < Number(m.ingresos_monto_prev)
        }
      },
      grafica_semestral,
      inventario: {
        total_productos: Number(inv?.total_productos || 0),
        normal: Number(inv?.normal || 0),
        bajo: Number(inv?.bajo || 0),
        agotado: Number(inv?.agotado || 0)
      },
      ventas_hoy: {
        fecha_texto: `— ${hoyFecha}`,
        monto: Number(today?.monto_hoy || 0),
        cantidad: Number(today?.cantidad_hoy || 0),
        dias: daysRes.rows.map((d) => ({
          dia: d.nombre_dia,
          monto: Number(d.total_dia || 0),
          cantidad: d.count_dia,
          es_hoy: Boolean(d.es_hoy)
        }))
      },
      cuentas_por_cobrar: {
        saldo_total: Number(cxcSum?.saldo_total || 0),
        vencidas_count: Number(cxcSum?.vencidas_count || 0),
        items: cxcTopRes.rows.map((r) => ({
          id_cxc: r.id_cxc,
          nombre: r.cliente,
          monto: Number(r.saldo_pendiente || 0),
          fecha_vencimiento: r.fecha_vencimiento,
          estado: r.estado
        }))
      },
      cuentas_por_pagar: {
        saldo_total: Number(cxpSum?.saldo_total || 0),
        vencidas_count: Number(cxpSum?.vencidas_count || 0),
        items: cxpTopRes.rows.map((r) => ({
          id_cxp: r.id_cxp,
          nombre: r.proveedor,
          monto: Number(r.saldo_pendiente || 0),
          fecha_vencimiento: r.fecha_vencimiento,
          estado: r.estado
        }))
      },
      alertas_inventario: {
        bajas: alertasBajasRes.rows.map((r) => ({
          id_producto: r.id_producto,
          nombre: r.nombre,
          stock: Number(r.stock),
          stock_minimo: Number(r.stock_minimo),
          unidad_medida: r.unidad_medida
        })),
        agotadas: alertasAgotadasRes.rows.map((r) => ({
          id_producto: r.id_producto,
          nombre: r.nombre,
          stock: Number(r.stock),
          unidad_medida: r.unidad_medida
        }))
      }
    }
  });
});

export const getAsistenteFinanciero = asyncHandler(async (req, res) => {
  const empresaId = req.user?.empresa_id || 1;
  const analisis = await generarAnalisisFinancieroIA(empresaId);
  return res.status(200).json({
    success: true,
    message: 'Análisis financiero inteligente obtenido correctamente',
    data: analisis
  });
});

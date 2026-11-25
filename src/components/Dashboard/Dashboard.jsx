import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import './Dashboard.css';

const DEFAULT_SPARKS = {
  ventas: 'M2 28 C18 26 22 18 34 16 S52 22 62 10 82 16 98 4',
  compras: 'M2 26 C16 24 24 18 36 20 S58 10 72 14 98 6',
  gastos: 'M2 10 C18 14 28 22 42 18 S68 28 82 24 98 30',
  ingresos: 'M2 30 C14 26 22 16 34 18 S56 8 70 12 98 3',
};

const formatMoney = (val) => {
  const n = Number(val || 0);
  return '$' + Math.floor(n).toLocaleString('es-MX');
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

const generateSparkline = (dataList = [], key, defaultPath) => {
  if (!dataList || dataList.length < 2) return defaultPath;
  const values = dataList.map((item) => Number(item[key] || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max && max === 0) return defaultPath;

  const range = max - min || 1;
  const stepX = (98 - 2) / (values.length - 1);
  const points = values.map((val, i) => {
    const x = Math.round(2 + i * stepX);
    const y = Math.round(30 - ((val - min) / range) * 24);
    return { x, y };
  });

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
};

function Sparkline({ path, featured }) {
  return (
    <svg className="cpy-trend-line" viewBox="0 0 100 36" role="img" aria-hidden="true">
      <path d={path} fill="none" stroke={featured ? '#fff' : '#8091ff'} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SalesChart({ months = [] }) {
  const displayMonths = months.length > 0 ? months : [
    { mes: 'Ene', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Feb', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Mar', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Abr', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'May', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Jun', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Jul', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Ago', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Sep', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Oct', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Nov', ventas: 0, ingresos: 0, gastos: 0 },
    { mes: 'Dic', ventas: 0, ingresos: 0, gastos: 0 }
  ];

  const maxDataVal = Math.max(
    ...displayMonths.flatMap((m) => [Number(m.ventas || 0), Number(m.ingresos || 0), Number(m.gastos || 0)]),
    1000
  );
  const maxVal = Math.max(Math.ceil(maxDataVal / 10000) * 10000, 20000);

  const formatK = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${Math.round(val / 1000)}k`;
    return `$${Math.round(val)}`;
  };

  const colWidth = 92;
  const leftPad = 58;
  const rightPad = 48;
  const svgWidth = Math.max(760, leftPad + rightPad + (displayMonths.length - 1) * colWidth);
  const svgHeight = 200;

  const xCoords = displayMonths.map((_, i) => leftPad + i * colWidth);
  const calcY = (val) => Math.round(155 - (Math.min(val, maxVal) / maxVal) * 135);

  const pointsSales = displayMonths.map((m, i) => `${xCoords[i]},${calcY(Number(m.ventas || 0))}`).join(' ');
  const pointsIncome = displayMonths.map((m, i) => `${xCoords[i]},${calcY(Number(m.ingresos || 0))}`).join(' ');
  const pointsExpense = displayMonths.map((m, i) => `${xCoords[i]},${calcY(Number(m.gastos || 0))}`).join(' ');

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 6
      }}
    >
      <svg
        className="cpy-sales-chart"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ minWidth: svgWidth, height: 200 }}
        role="img"
        aria-label="Gráfica de ventas, ingresos y gastos por mes"
      >
        <g className="cpy-chart-grid">
          <path d={`M${leftPad - 15} 20H${svgWidth - 10} M${leftPad - 15} 65H${svgWidth - 10} M${leftPad - 15} 110H${svgWidth - 10} M${leftPad - 15} 155H${svgWidth - 10}`} />
        </g>
        <g className="cpy-chart-y-labels">
          <text x="0" y="24">{formatK(maxVal)}</text>
          <text x="0" y="69">{formatK(maxVal * 0.75)}</text>
          <text x="0" y="114">{formatK(maxVal * 0.5)}</text>
          <text x="0" y="159">{formatK(maxVal * 0.25)}</text>
        </g>
        <polyline className="cpy-chart-line cpy-chart-line-sales" points={pointsSales} strokeWidth="3" />
        <polyline className="cpy-chart-line cpy-chart-line-income" points={pointsIncome} strokeWidth="3" />
        <polyline className="cpy-chart-line cpy-chart-line-expense" points={pointsExpense} strokeWidth="3" />
        
        {displayMonths.map((m, i) => {
          const x = xCoords[i];
          const yS = calcY(Number(m.ventas || 0));
          const yI = calcY(Number(m.ingresos || 0));
          const yE = calcY(Number(m.gastos || 0));
          return (
            <g key={m.periodo || m.mes + i}>
              <circle cx={x} cy={yS} r="4.5" fill="#142a95" stroke="#fff" strokeWidth="2">
                <title>{`${m.mes} ${m.periodo || ''}\nVentas: ${formatMoney(m.ventas)}`}</title>
              </circle>
              <circle cx={x} cy={yI} r="4.5" fill="#12805c" stroke="#fff" strokeWidth="2">
                <title>{`${m.mes} ${m.periodo || ''}\nIngresos: ${formatMoney(m.ingresos)}`}</title>
              </circle>
              <circle cx={x} cy={yE} r="4.5" fill="#c2362f" stroke="#fff" strokeWidth="2">
                <title>{`${m.mes} ${m.periodo || ''}\nGastos: ${formatMoney(m.gastos)}`}</title>
              </circle>
            </g>
          );
        })}
        <g className="cpy-chart-x-labels">
          {displayMonths.map((m, i) => (
            <text key={(m.periodo || m.mes) + i} x={xCoords[i] - 14} y="185">
              {m.mes.slice(0, 3)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

function StockDonutChart({ normal = 0, bajo = 0, agotado = 0, total = 0 }) {
  const tot = total > 0 ? total : (normal + bajo + agotado);
  const size = 150;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const pNormal = tot > 0 ? normal / tot : 0;
  const pBajo = tot > 0 ? bajo / tot : 0;
  const pAgotado = tot > 0 ? agotado / tot : 0;

  const strokeNormal = pNormal * circumference;
  const strokeBajo = pBajo * circumference;
  const strokeAgotado = pAgotado * circumference;

  const offsetNormal = 0;
  const offsetBajo = -strokeNormal;
  const offsetAgotado = -(strokeNormal + strokeBajo);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '8px auto 14px auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e8ecfb"
          strokeWidth={strokeWidth}
        />
        {normal > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#142a95"
            strokeWidth={strokeWidth}
            strokeDasharray={`${strokeNormal} ${circumference}`}
            strokeDashoffset={offsetNormal}
          />
        )}
        {bajo > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f0ad3d"
            strokeWidth={strokeWidth}
            strokeDasharray={`${strokeBajo} ${circumference}`}
            strokeDashoffset={offsetBajo}
          />
        )}
        {agotado > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#c2362f"
            strokeWidth={strokeWidth}
            strokeDasharray={`${strokeAgotado} ${circumference}`}
            strokeDashoffset={offsetAgotado}
          />
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        <strong style={{ fontSize: '32px', fontWeight: 800, color: '#0f1b4d', lineHeight: 1 }}>
          {tot}
        </strong>
        <span style={{ fontSize: '11px', color: '#7d8499', fontWeight: 600, marginTop: 4 }}>
          Productos
        </span>
      </div>
    </div>
  );
}

function MiniLedger({ rows, heading }) {
  return (
    <div className="cpy-ledger">
      <div className="cpy-ledger-heading">
        <span>{heading}</span>
        <span>SALDO</span>
        <span>VENCE</span>
        <span>ESTADO</span>
      </div>
      {rows.length === 0 ? (
        <div className="cpy-ledger-row">
          <strong>Sin registros pendientes</strong>
          <b>$0.00</b>
          <span>-</span>
          <span className="cpy-status">Al corriente</span>
        </div>
      ) : (
        rows.map(([name, amount, date, status], idx) => (
          <div className="cpy-ledger-row" key={`${name}-${idx}`}>
            <strong>{name}</strong>
            <b>{amount}</b>
            <span>{date}</span>
            <span className={`cpy-status cpy-status-${status.toLowerCase()}`}>{status}</span>
          </div>
        ))
      )}
    </div>
  );
}

function MetricCard({ metric }) {
  return (
    <article className={`cpy-card cpy-metric-card${metric.featured ? ' cpy-metric-featured' : ''}`}>
      <div className="cpy-metric-heading">
        <h2>{metric.title}</h2>
        <span className={`cpy-change${metric.down ? ' is-down' : ''}`}>{metric.change}</span>
      </div>
      <div className="cpy-metric-amount">{metric.amount}<small>.00</small></div>
      <div className="cpy-metric-footer">
        <span>
          {metric.detail}
          {metric.extra && <small>{metric.extra}</small>}
        </span>
        <Sparkline path={metric.spark} featured={metric.featured} />
      </div>
    </article>
  );
}

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        const res = await api.getDashboardData();
        if (isMounted && res?.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboard();

    // Auto-actualizar cuando la ventana recupera foco o cada 20 segundos
    const handleFocus = () => fetchDashboard();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('contapyme_operacion_registrada', handleFocus);
    const interval = setInterval(fetchDashboard, 20000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('contapyme_operacion_registrada', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const metricas = data?.metricas || {};
  const graficaSemestral = data?.grafica_semestral || [];
  const inventario = data?.inventario || { total_productos: 0, normal: 0, bajo: 0, agotado: 0 };
  const ventasHoy = data?.ventas_hoy || { fecha_texto: '', monto: 0, cantidad: 0, dias: [] };
  const cxc = data?.cuentas_por_cobrar || { saldo_total: 0, vencidas_count: 0, items: [] };
  const cxp = data?.cuentas_por_pagar || { saldo_total: 0, vencidas_count: 0, items: [] };
  const alertas = data?.alertas_inventario || { bajas: [], agotadas: [] };

  const metrics = [
    {
      title: 'Ventas del mes',
      amount: formatMoney(metricas?.ventas?.monto || 0),
      change: metricas?.ventas?.cambio || '+ 0%',
      detail: 'Importe de productos vendidos',
      featured: true,
      down: metricas?.ventas?.down || false,
      spark: generateSparkline(graficaSemestral, 'ventas', DEFAULT_SPARKS.ventas),
    },
    {
      title: 'Compras del mes',
      amount: formatMoney(metricas?.compras?.monto || 0),
      change: metricas?.compras?.cambio || '+ 0%',
      detail: `${metricas?.compras?.cantidad || 0} compras registradas`,
      extra: 'Importe de productos adquiridos',
      down: metricas?.compras?.down || false,
      spark: generateSparkline(graficaSemestral, 'compras', DEFAULT_SPARKS.compras),
    },
    {
      title: 'Gastos del mes',
      amount: formatMoney(metricas?.gastos?.monto || 0),
      change: metricas?.gastos?.cambio || '- 0%',
      down: metricas?.gastos?.down ?? true,
      detail: `${metricas?.gastos?.cantidad || 0} gastos registrados`,
      extra: 'Pago por gastos de operación',
      spark: generateSparkline(graficaSemestral, 'gastos', DEFAULT_SPARKS.gastos),
    },
    {
      title: 'Ingresos recibidos',
      amount: formatMoney(metricas?.ingresos?.monto || 0),
      change: metricas?.ingresos?.cambio || '+ 0%',
      down: metricas?.ingresos?.down || false,
      detail: 'Dinero recibido en el mes',
      extra: 'Dinero recibido en el periodo',
      spark: generateSparkline(graficaSemestral, 'ingresos', DEFAULT_SPARKS.ingresos),
    },
  ];

  const receivablesRows = (cxc.items || []).map((item) => [
    item.nombre,
    `$${Number(item.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatShortDate(item.fecha_vencimiento),
    item.estado || 'Pendiente'
  ]);

  const payablesRows = (cxp.items || []).map((item) => [
    item.nombre,
    `$${Number(item.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatShortDate(item.fecha_vencimiento),
    item.estado || 'Pendiente'
  ]);

  // Subtítulo de rango de meses para la gráfica
  const periodoGrafica = graficaSemestral.length >= 2
    ? `Importes de ${graficaSemestral[0].mes.toLowerCase()} a ${graficaSemestral[graficaSemestral.length - 1].mes.toLowerCase()} (Desplaza para ver todos los meses)`
    : 'Importes mensuales (Desplaza para ver todos los meses)';

  // Barras de los últimos 7 días
  const weekDays = ventasHoy.dias && ventasHoy.dias.length === 7 ? ventasHoy.dias : [
    { dia: 'Vie', monto: 0, cantidad: 0, es_hoy: false },
    { dia: 'Sáb', monto: 0, cantidad: 0, es_hoy: false },
    { dia: 'Dom', monto: 0, cantidad: 0, es_hoy: false },
    { dia: 'Lun', monto: 0, cantidad: 0, es_hoy: false },
    { dia: 'Mar', monto: 0, cantidad: 0, es_hoy: false },
    { dia: 'Mié', monto: 0, cantidad: 0, es_hoy: false },
    { dia: 'Jue', monto: 0, cantidad: 0, es_hoy: true }
  ];
  const maxWeekMonto = Math.max(...weekDays.map((d) => Number(d.monto || 0)), 1);

  return (
    <div className="cpy-dashboard">
      <section className="cpy-metrics-grid" aria-label="Resumen financiero">
        {metrics.map((metric) => <MetricCard key={metric.title} metric={metric} />)}
      </section>

      <section className="cpy-overview-grid">
        <article className="cpy-card cpy-sales-card">
          <div className="cpy-card-heading">
            <div>
              <h2>Ventas, ingresos y gastos</h2>
              <p>{periodoGrafica}</p>
            </div>
            <div className="cpy-chart-legend">
              <span><i className="legend-sales" />Ventas</span>
              <span><i className="legend-income" />Ingresos recibidos</span>
              <span><i className="legend-expense" />Gastos</span>
            </div>
          </div>
          <SalesChart months={graficaSemestral} />
        </article>

        <article className="cpy-card cpy-stock-card">
          <div className="cpy-card-heading">
            <div><h2>Estado del inventario</h2></div>
          </div>
          <StockDonutChart
            normal={inventario.normal}
            bajo={inventario.bajo}
            agotado={inventario.agotado}
            total={inventario.total_productos}
          />
          <div className="cpy-stock-summary">
            <span><i className="stock-normal" style={{ background: '#142a95' }} />Normal <b>{inventario.normal}</b></span>
            <span><i className="stock-low" style={{ background: '#f0ad3d' }} />Bajo <b>{inventario.bajo}</b></span>
            <span><i className="stock-out" style={{ background: '#c2362f' }} />Agotado <b>{inventario.agotado}</b></span>
          </div>
        </article>

        <article className="cpy-card cpy-today-card">
          <div className="cpy-card-heading">
            <div>
              <h2>Ventas de hoy <span>{ventasHoy.fecha_texto}</span></h2>
            </div>
          </div>
          <div className="cpy-today-stats">
            <div>
              <small>Importe vendido</small>
              <strong>{formatMoney(ventasHoy.monto)}</strong>
            </div>
            <div>
              <small>N° de ventas</small>
              <strong>{ventasHoy.cantidad}</strong>
            </div>
          </div>
          <div className="cpy-week-bars" aria-label="Ventas de los últimos siete días">
            {weekDays.map((d, index) => {
              const height = maxWeekMonto > 0 ? Math.max(14, Math.round((Number(d.monto || 0) / maxWeekMonto) * 100)) : 14;
              return (
                <div className={d.es_hoy ? 'is-today' : ''} key={d.dia + index} title={`${d.dia}: $${Number(d.monto || 0).toLocaleString('es-MX')}`}>
                  <span style={{ height: `${height}%` }} />
                  <small>{d.dia}</small>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="cpy-finance-grid">
        <article className="cpy-card cpy-finance-card">
          <div className="cpy-finance-head">
            <h2>Cuentas por cobrar</h2>
            <button type="button" onClick={() => onNavigate('cxc')}>Ver todas <ArrowRight size={13} /></button>
          </div>
          <div className="cpy-finance-body">
            <div className="cpy-finance-total">
              <p>Saldo total pendiente de cobro</p>
              <strong>${Number(cxc.saldo_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="cpy-overdue">{cxc.vencidas_count} {cxc.vencidas_count === 1 ? 'vencida' : 'vencidas'}</span>
            </div>
            <MiniLedger rows={receivablesRows} heading="CLIENTES CON PAGOS PENDIENTES" />
          </div>
        </article>
        <article className="cpy-card cpy-finance-card">
          <div className="cpy-finance-head">
            <h2>Cuentas por pagar</h2>
            <button type="button" onClick={() => onNavigate('cxp')}>
              Ver todas <ArrowRight size={13} />
            </button>
          </div>
          <div className="cpy-finance-body">
            <div className="cpy-finance-total">
              <p>Saldo total pendiente de pago</p>
              <strong>${Number(cxp.saldo_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="cpy-overdue">{cxp.vencidas_count} {cxp.vencidas_count === 1 ? 'vencida' : 'vencidas'}</span>
            </div>
            <MiniLedger rows={payablesRows} heading="PROVEEDORES CON PAGOS PENDIENTES" />
          </div>
        </article>
      </section>

      <section className="cpy-card cpy-alerts-card">
        <div className="cpy-alerts-heading">
          <div>
            <h2>Alertas de inventario</h2>
            <p>Productos que necesitan atención inmediata</p>
          </div>
          <button type="button" onClick={() => onNavigate('inventario')}>Ver inventario <ArrowRight size={13} /></button>
        </div>
        <div className="cpy-alert-columns">
          <div className="cpy-alert-column">
            <h3><span className="cpy-alert-low">!</span> EXISTENCIAS BAJAS · {alertas.bajas.length}</h3>
            <div className="cpy-alert-table-heading"><span>PRODUCTO</span><span>EXISTENCIA</span><span>MÍNIMO</span></div>
            {alertas.bajas.length === 0 ? (
              <p><strong>Sin existencias bajas</strong><span>—</span><span>—</span></p>
            ) : (
              alertas.bajas.map((p) => (
                <p key={p.id_producto}>
                  <strong>{p.nombre}</strong>
                  <span>{p.stock} {p.unidad_medida || 'piezas'}</span>
                  <span>{p.stock_minimo} {p.unidad_medida || 'piezas'}</span>
                </p>
              ))
            )}
          </div>
          <div className="cpy-alert-column">
            <h3><span className="cpy-alert-out">!</span> PRODUCTOS AGOTADOS · {alertas.agotadas.length}</h3>
            <div className="cpy-alert-table-heading"><span>PRODUCTO</span><span>EXISTENCIA</span></div>
            {alertas.agotadas.length === 0 ? (
              <p className="cpy-alert-out-row"><strong>Sin productos agotados</strong><span>—</span></p>
            ) : (
              alertas.agotadas.map((p) => (
                <p className="cpy-alert-out-row" key={p.id_producto}>
                  <strong>{p.nombre}</strong>
                  <span>{p.stock} {p.unidad_medida || 'piezas'}</span>
                </p>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

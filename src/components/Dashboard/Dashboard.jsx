import React from 'react';
import { ArrowRight } from 'lucide-react';
import './Dashboard.css';

const metrics = [
  {
    title: 'Ventas del mes',
    amount: '$186,540',
    change: '+ 12%',
    detail: 'Importe de productos vendidos',
    featured: true,
    spark: 'M2 28 C18 26 22 18 34 16 S52 22 62 10 82 16 98 4',
  },
  {
    title: 'Compras del mes',
    amount: '$92,300',
    change: '+ 8%',
    detail: '24 compras registradas',
    extra: 'Importe de productos adquiridos',
    spark: 'M2 26 C16 24 24 18 36 20 S58 10 72 14 98 6',
  },
  {
    title: 'Gastos del mes',
    amount: '$64,200',
    change: '- 5%',
    down: true,
    detail: '18 gastos registrados',
    extra: 'Pago por gastos de operación',
    spark: 'M2 10 C18 14 28 22 42 18 S68 28 82 24 98 30',
  },
  {
    title: 'Ingresos recibidos',
    amount: '$198,740',
    change: '+ 15%',
    detail: 'Dinero recibido en el mes',
    extra: 'Dinero recibido en el periodo',
    spark: 'M2 30 C14 26 22 16 34 18 S56 8 70 12 98 3',
  },
];

const receivables = [
  ['Luisa Martínez', '$12,400', '18 oct.', 'Vencido'],
  ['Paola Rocha', '$9,900', '20 oct.', 'Pendiente'],
  ['Guadalupe Lozano', '$6,200', '19 oct.', 'Pendiente'],
];

const payables = [
  ['Tecnomayoreo S.A.', '$18,600', '17 oct.', 'Vencido'],
  ['Distribuidora Digital', '$7,350', '22 oct.', 'Pendiente'],
  ['Importaciones MX', '$15,850', '21 oct.', 'Pendiente'],
];

function Sparkline({ path, featured }) {
  return (
    <svg className="cpy-trend-line" viewBox="0 0 100 36" role="img" aria-hidden="true">
      <path d={path} fill="none" stroke={featured ? '#fff' : '#8091ff'} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SalesChart() {
  return (
    <svg className="cpy-sales-chart" viewBox="0 0 680 200" preserveAspectRatio="none" role="img" aria-label="Gráfica de ventas e ingresos por mes">
      <g className="cpy-chart-grid">
        <path d="M48 18H670 M48 58H670 M48 98H670 M48 138H670" />
      </g>
      <g className="cpy-chart-y-labels">
        <text x="0" y="22">$60k</text>
        <text x="0" y="62">$45k</text>
        <text x="0" y="102">$30k</text>
        <text x="0" y="142">$15k</text>
      </g>
      <polyline className="cpy-chart-line cpy-chart-line-sales" points="52,118 150,108 250,92 350,70 450,58 550,36 650,22" />
      <polyline className="cpy-chart-line cpy-chart-line-income" points="52,128 150,122 250,112 350,96 450,88 550,70 650,58" />
      <polyline className="cpy-chart-line cpy-chart-line-expense" points="52,148 150,146 250,142 350,140 450,138 550,136 650,134" />
      {['52,118', '150,108', '250,92', '350,70', '450,58', '550,36', '650,22'].map((point) => {
        const [cx, cy] = point.split(',');
        return <circle key={point} className="cpy-chart-point" cx={cx} cy={cy} r="4.5" />;
      })}
      <g className="cpy-chart-x-labels">
        <text x="40" y="176">Mayo</text>
        <text x="138" y="176">Junio</text>
        <text x="236" y="176">Julio</text>
        <text x="328" y="176">Agosto</text>
        <text x="430" y="176">Septiembre</text>
        <text x="548" y="176">Octubre</text>
      </g>
    </svg>
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
      {rows.map(([name, amount, date, status]) => (
        <div className="cpy-ledger-row" key={name}>
          <strong>{name}</strong>
          <b>{amount}</b>
          <span>{date}</span>
          <span className={`cpy-status cpy-status-${status.toLowerCase()}`}>{status}</span>
        </div>
      ))}
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
              <p>Importes de mayo a octubre 2026</p>
            </div>
            <div className="cpy-chart-legend">
              <span><i className="legend-sales" />Ventas</span>
              <span><i className="legend-income" />Ingresos recibidos</span>
              <span><i className="legend-expense" />Gastos</span>
            </div>
          </div>
          <SalesChart />
        </article>

        <article className="cpy-card cpy-stock-card">
          <div className="cpy-card-heading">
            <div><h2>Estado del inventario</h2></div>
          </div>
          <div className="cpy-stock-gauge">
            <div className="cpy-gauge-arc" />
            <strong>151</strong>
            <span className="cpy-gauge-caption">Total de productos</span>
          </div>
          <div className="cpy-stock-summary">
            <span><i className="stock-normal" />Normal <b>142</b></span>
            <span><i className="stock-low" />Bajo <b>6</b></span>
            <span><i className="stock-out" />Agotado <b>3</b></span>
          </div>
        </article>

        <article className="cpy-card cpy-today-card">
          <div className="cpy-card-heading">
            <div>
              <h2>Ventas de hoy <span>— 15 de octubre de 2026</span></h2>
            </div>
          </div>
          <div className="cpy-today-stats">
            <div>
              <small>Importe vendido</small>
              <strong>$13,420</strong>
            </div>
            <div>
              <small>N° de ventas</small>
              <strong>14</strong>
            </div>
          </div>
          <div className="cpy-week-bars" aria-label="Ventas de los últimos siete días">
            {[42, 58, 50, 78, 64, 86, 100].map((height, index) => (
              <div className={index === 6 ? 'is-today' : ''} key={height + index}>
                <span style={{ height: `${height}%` }} />
                <small>{['Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue'][index]}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="cpy-finance-grid">
        <article className="cpy-card cpy-finance-card">
          <div className="cpy-finance-head">
            <h2>Cuentas por cobrar</h2>
            <button type="button" onClick={() => onNavigate('finanzas')}>Ver todas <ArrowRight size={13} /></button>
          </div>
          <div className="cpy-finance-body">
            <div className="cpy-finance-total">
              <p>Saldo total pendiente de cobro</p>
              <strong>$52,300.00</strong>
              <span className="cpy-overdue">3 vencidas</span>
            </div>
            <MiniLedger rows={receivables} heading="CLIENTES CON PAGOS PENDIENTES" />
          </div>
        </article>
        <article className="cpy-card cpy-finance-card">
          <div className="cpy-finance-head">
            <h2>Cuentas por pagar</h2>
            <button type="button" onClick={() => onNavigate('finanzas')}>Ver todas <ArrowRight size={13} /></button>
          </div>
          <div className="cpy-finance-body">
            <div className="cpy-finance-total">
              <p>Saldo total pendiente de pago</p>
              <strong>$41,800.00</strong>
              <span className="cpy-overdue">2 vencidas</span>
            </div>
            <MiniLedger rows={payables} heading="PROVEEDORES CON PAGOS PENDIENTES" />
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
            <h3><span className="cpy-alert-low">!</span> EXISTENCIAS BAJAS · 6</h3>
            <div className="cpy-alert-table-heading"><span>PRODUCTO</span><span>EXISTENCIA</span><span>MÍNIMO</span></div>
            <p><strong>SSD Kingston 480 GB</strong><span>3 piezas</span><span>8 piezas</span></p>
            <p><strong>Cable HDMI 3 m</strong><span>4 piezas</span><span>10 piezas</span></p>
            <p><strong>Teclado Logitech K380</strong><span>2 piezas</span><span>6 piezas</span></p>
          </div>
          <div className="cpy-alert-column">
            <h3><span className="cpy-alert-out">!</span> PRODUCTOS AGOTADOS · 3</h3>
            <div className="cpy-alert-table-heading"><span>PRODUCTO</span><span>EXISTENCIA</span></div>
            <p className="cpy-alert-out-row"><strong>Mouse Logitech M185</strong><span>0 piezas</span></p>
            <p className="cpy-alert-out-row"><strong>Cargador USB-C 65 W</strong><span>0 piezas</span></p>
            <p className="cpy-alert-out-row"><strong>Memoria USB 64 GB</strong><span>0 piezas</span></p>
          </div>
        </div>
      </section>
    </div>
  );
}

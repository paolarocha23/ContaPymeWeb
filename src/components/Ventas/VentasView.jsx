import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Eye, Receipt, ChevronLeft, ChevronRight, RotateCw,
  ShoppingCart, DollarSign, Clock, Ban
} from 'lucide-react';
import { useVentas, FILTROS_INICIALES } from '../../hooks/useVentas';
import { formatMoney, formatFechaISO, resolverTicket } from '../../utils/ventasUtils';
import NuevaVentaView from './NuevaVentaView';
import DetalleVentaView from './DetalleVentaView';
import TicketVentaModal from './TicketVentaModal';
import './Ventas.css';

const POR_PAGINA = 8;

export const PILL_ESTATUS = {
  pagada: ['green', 'Pagada'],
  pendiente_pago: ['amber', 'Pendiente de pago'],
  pago_parcial: ['blue', 'Pago parcial'],
  cancelada: ['red', 'Cancelada']
};

const fechaCorta = (f) =>
  f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '') : '—';

export default function VentasView() {
  const { ventas, stats, loading, error, filtros, actualizarFiltros, recargar } = useVentas();

  const [vista, setVista] = useState('lista'); // 'lista' | 'nueva'
  const [idDetalle, setIdDetalle] = useState(null);
  const [ticketActivo, setTicketActivo] = useState(null);
  const [vendedor, setVendedor] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => { setPagina(1); }, [filtros, vendedor]);

  const vendedores = useMemo(
    () => [...new Set(ventas.map((v) => v.vendedor).filter(Boolean))].sort(),
    [ventas]
  );

  const filtradas = useMemo(
    () => (vendedor ? ventas.filter((v) => v.vendedor === vendedor) : ventas),
    [ventas, vendedor]
  );

  const canceladas = useMemo(() => ventas.filter((v) => v.estatus === 'cancelada').length, [ventas]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  const hayFiltros =
    filtros.q || filtros.estatus !== 'todas' || filtros.desde || filtros.hasta || vendedor;

  // Filtro de mes -> desde / hasta (mismos filtros que ya entiende useVentas)
  const mes = filtros.desde ? filtros.desde.slice(0, 7) : '';
  const cambiarMes = (valor) => {
    if (!valor) return actualizarFiltros({ desde: '', hasta: '' });
    const [y, m] = valor.split('-').map(Number);
    const ultimo = new Date(y, m, 0).getDate();
    actualizarFiltros({ desde: `${valor}-01`, hasta: `${valor}-${String(ultimo).padStart(2, '0')}` });
  };

  const limpiar = () => {
    actualizarFiltros(FILTROS_INICIALES);
    setVendedor('');
  };

  const handleVerTicket = async (v) => {
    try {
      setTicketActivo(await resolverTicket(v.id_venta, v.codigo));
    } catch (err) {
      alert(err.message || 'No se pudo generar el ticket.');
    }
  };

  let contenido;

  if (vista === 'nueva') {
    contenido = (
      <NuevaVentaView
        onBack={() => setVista('lista')}
        onSuccess={(venta, ticket) => {
          recargar();
          setTicketActivo(ticket);
          setVista('lista');
        }}
      />
    );
  } else if (idDetalle) {
    contenido = (
      <DetalleVentaView
        idVenta={idDetalle}
        onBack={() => setIdDetalle(null)}
        onVentaActualizada={recargar}
        onVerTicket={handleVerTicket}
      />
    );
  } else {
    contenido = (
      <div className="ven">
        {/* Encabezado */}
        <div className="ven-title">
          <div>
            <h2>Ventas</h2>
            <p>Consulta, registra y da seguimiento a las ventas de tu negocio.</p>
          </div>
          <button type="button" className="ven-btn ven-btn-primary" onClick={() => setVista('nueva')}>
            <Plus size={18} /> Nueva venta
          </button>
        </div>

        {/* Estadísticas */}
        <div className="stat-card-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-icon-wrapper"><ShoppingCart size={22} /></div>
            <div>
              <div className="stat-label">{filtros.desde ? 'Ventas del mes' : 'Ventas realizadas'}</div>
              <div className="stat-value">{stats?.total_ventas || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper"><DollarSign size={22} /></div>
            <div>
              <div className="stat-label">Total vendido</div>
              <div className="stat-value">{formatMoney(stats?.total_vendido)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: '#FDF3E1', color: '#B26A00' }}><Clock size={22} /></div>
            <div>
              <div className="stat-label">Por cobrar</div>
              <div className="stat-value" style={{ color: '#B26A00' }}>{formatMoney(stats?.total_por_cobrar)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper"><Ban size={22} /></div>
            <div>
              <div className="stat-label">Canceladas</div>
              <div className="stat-value">{canceladas}</div>
            </div>
          </div>
        </div>

        {/* Tabla y filtros */}
        <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
          <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid #E4E8F5' }}>
            <div className="table-search-input">
              <div className="input-with-icon">
                <Search className="input-icon" size={18} />
                <input
                  className="form-input form-input-pill"
                  placeholder="Código, cliente o producto..."
                  value={filtros.q}
                  onChange={(e) => actualizarFiltros({ q: e.target.value })}
                />
              </div>
            </div>

            <select className="table-pill-select" value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
              <option value="">Vendedor: Todos</option>
              {vendedores.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            <select
              className="table-pill-select"
              value={filtros.estatus}
              onChange={(e) => actualizarFiltros({ estatus: e.target.value })}
            >
              <option value="todas">Estatus: Todos</option>
              <option value="pendiente_pago">Pendiente de pago</option>
              <option value="pago_parcial">Pago parcial</option>
              <option value="pagada">Pagadas</option>
              <option value="cancelada">Canceladas</option>
            </select>

            <input
              type="month"
              className="table-pill-select"
              value={mes}
              onChange={(e) => cambiarMes(e.target.value)}
              title="Mes"
            />

            {hayFiltros && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: '#142A95', marginLeft: 'auto', fontWeight: 600 }}
                onClick={limpiar}
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="table-container-clean">
            {loading ? (
              <div className="ven-empty">
                <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
                <div style={{ marginTop: 10 }}>Cargando ventas...</div>
              </div>
            ) : error ? (
              <div className="ven-empty">
                <div style={{ color: '#C2362F', fontWeight: 600 }}>{error}</div>
                <button type="button" className="ven-btn ven-btn-outline" style={{ margin: '14px auto 0' }} onClick={recargar}>
                  Reintentar
                </button>
              </div>
            ) : (
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>FECHA</th>
                    <th>CLIENTE</th>
                    <th>VENDEDOR</th>
                    <th>TOTAL</th>
                    <th>PAGADO</th>
                    <th>VENCIMIENTO</th>
                    <th>ESTATUS</th>
                    <th style={{ textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((v) => {
                    const [color, etiqueta] = PILL_ESTATUS[v.estatus] || ['gray', v.estatus];
                    const vence = v.saldo_pendiente > 0 && v.estatus !== 'cancelada' && v.fecha_vencimiento;
                    return (
                      <tr key={v.id_venta}>
                        <td><span className="ven-code">{v.codigo}</span></td>
                        <td className="ven-muted" style={{ fontWeight: 600 }}>{fechaCorta(v.fecha)}</td>
                        <td><b>{v.nombre_cliente}</b></td>
                        <td>{v.vendedor}</td>
                        <td style={{ fontWeight: 700 }}>{formatMoney(v.total)}</td>
                        <td style={{ fontWeight: 600 }}>{formatMoney(v.monto_pagado)}</td>
                        <td>{vence ? <span className="ven-due">{formatFechaISO(v.fecha_vencimiento)}</span> : <span className="ven-muted">—</span>}</td>
                        <td><span className={`ven-pill ${color}`}>{etiqueta}</span></td>
                        <td>
                          <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                            <button type="button" className="action-circle-btn" title="Ver detalle" onClick={() => setIdDetalle(v.id_venta)}>
                              <Eye size={16} />
                            </button>
                            <button type="button" className="action-circle-btn" title="Ver ticket" onClick={() => handleVerTicket(v)}>
                              <Receipt size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={9} className="ven-empty">
                        {hayFiltros ? 'No se encontraron ventas con esos filtros.' : 'Aún no hay ventas registradas.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {!loading && !error && filtradas.length > 0 && (
            <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
              <span>
                Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtradas.length)} de {filtradas.length} ventas
              </span>
              <div className="pagination-controls">
                <button type="button" className="pagination-btn" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)}>
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={`pagination-btn${n === paginaActual ? ' active' : ''}`}
                    onClick={() => setPagina(n)}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" className="pagination-btn" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {contenido}
      <TicketVentaModal ticket={ticketActivo} isOpen={Boolean(ticketActivo)} onClose={() => setTicketActivo(null)} />
    </>
  );
}

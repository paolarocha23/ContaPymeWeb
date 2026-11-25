import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Ban, X, RotateCw, ShoppingBag, Banknote, Wallet, CircleAlert, CircleCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useCompras, POR_PAGINA } from '../../hooks/useCompras';
import {
  formatMoney, formatFechaCorta, formatFechaISO, mesesOpciones, ETIQ_ESTATUS, TONO_ESTATUS, extraerLista
} from '../../utils/opUtils';
import { Pill, StatCard, Pagination } from './../Operaciones/shared';
import NuevaCompraView from './NuevaCompraView';
import CompraDetailView from './CompraDetailView';
import CompraCancelModal from './CompraCancelModal';
import '../Operaciones/Operaciones.css';

const MESES = mesesOpciones();

export default function ComprasView() {
  const {
    compras, total, stats, comprasMes, canceladas, loading, error,
    filtros, actualizarFiltros, limpiarFiltros, pagina, setPagina, recargar
  } = useCompras();

  const [nueva, setNueva] = useState(false);
  const [idDetalle, setIdDetalle] = useState(null);
  const [idCancelar, setIdCancelar] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    api.getSuppliers({ estatus: 1 })
      .then((res) =>
        setProveedores(
          extraerLista(res).items
            .map((p) => ({ id: p.id_proveedor ?? p.id, nombre: p.nombre_empresa || p.nombre }))
            .filter((p) => p.id)
        )
      )
      .catch(() => { });
  }, []);

  const hayFiltros = Object.values(filtros).some(Boolean);

  if (nueva) {
    return (
      <NuevaCompraView
        onBack={() => setNueva(false)}
        onSuccess={(compra) => {
          setNueva(false);
          recargar();
          setFeedback({ type: 'success', message: `Compra ${compra?.codigo || ''} registrada exitosamente.` });
        }}
      />
    );
  }

  if (idDetalle) {
    return <CompraDetailView idCompra={idDetalle} onBack={() => setIdDetalle(null)} onChanged={recargar} />;
  }

  return (
    <div className="op">
      <div className="op-title">
        <div>
          <h2>Compras</h2>
          <p>Consulta, registra y da seguimiento a las compras a tus proveedores.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNueva(true)}>
          <Plus size={18} /> Nueva compra
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          <div style={{ flex: 1 }}>{feedback.message}</div>
          <button type="button" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setFeedback(null)} aria-label="Cerrar aviso"><X size={16} /></button>
        </div>
      )}

      <div className="stat-card-grid" style={{ marginBottom: 0 }}>
        <StatCard icon={<ShoppingBag size={22} />} label="Compras del mes" value={comprasMes} />
        <StatCard icon={<Banknote size={22} />} label="Total comprado" value={formatMoney(stats?.monto_total_comprado)} />
        <StatCard icon={<Wallet size={22} />} label="Por pagar" value={formatMoney(stats?.saldo_por_pagar)} tone="amber" />
        <StatCard icon={<Ban size={22} />} label="Canceladas" value={canceladas} />
      </div>

      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid #E4E8F5' }}>
          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input className="form-input form-input-pill" placeholder="Código, proveedor o producto..." value={filtros.q} onChange={(e) => actualizarFiltros({ q: e.target.value })} />
            </div>
          </div>

          <select className="table-pill-select" value={filtros.id_proveedor} onChange={(e) => actualizarFiltros({ id_proveedor: e.target.value })}>
            <option value="">Proveedor: Todos</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>

          <select className="table-pill-select" value={filtros.estatus} onChange={(e) => actualizarFiltros({ estatus: e.target.value })}>
            <option value="">Estatus: Todos</option>
            <option value="pendiente_pago">Pendiente de pago</option>
            <option value="parcial">Pago parcial</option>
            <option value="pagada">Pagada</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <select className="table-pill-select" value={filtros.mes} onChange={(e) => actualizarFiltros({ mes: e.target.value })}>
            <option value="">Fecha: Todas</option>
            {MESES.map((m) => <option key={m.val} value={m.val}>{m.lbl}</option>)}
          </select>

          {hayFiltros && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#142A95', marginLeft: 'auto', fontWeight: 600 }} onClick={limpiarFiltros}>Limpiar</button>
          )}
        </div>

        <div className="table-container-clean">
          {loading ? (
            <div className="op-empty" style={{ padding: '60px 0' }}>
              <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
              <div style={{ marginTop: 10 }}>Cargando compras...</div>
            </div>
          ) : error ? (
            <div className="op-empty" style={{ color: '#C2362F' }}>
              {error}
              <div style={{ marginTop: 12 }}><button type="button" className="btn btn-secondary btn-sm" onClick={recargar}>Reintentar</button></div>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>CÓDIGO</th><th>FECHA</th><th>PROVEEDOR</th><th>USUARIO</th><th>TOTAL</th><th>VENCIMIENTO</th><th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => {
                  const cancelada = c.estatus === 'cancelada';
                  const saldo = Number(c.saldo_pendiente ?? Math.max(0, Number(c.total) - Number(c.monto_pagado)));
                  return (
                    <tr key={c.id_compra}>
                      <td><span className="op-code">{c.codigo || `OC-${c.id_compra}`}</span></td>
                      <td>{formatFechaCorta(c.fecha)}</td>
                      <td><b>{c.proveedor_nombre || 'Proveedor'}</b></td>
                      <td>{c.usuario_nombre || c.usuario || '—'}</td>
                      <td><b>{formatMoney(c.total)}</b></td>
                      <td>{saldo > 0 && c.fecha_vencimiento ? <span className="op-venc">{formatFechaISO(c.fecha_vencimiento)}</span> : '—'}</td>
                      <td><Pill tone={TONO_ESTATUS[c.estatus] || 'gray'}>{ETIQ_ESTATUS[c.estatus] || c.estatus}</Pill></td>
                      <td>
                        <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="action-circle-btn" title="Ver detalle" onClick={() => setIdDetalle(c.id_compra)}><Eye size={16} /></button>
                          <button
                            type="button" className="action-circle-btn"
                            style={{ background: '#FDE8E7', color: '#C2362F', opacity: cancelada ? 0.45 : 1 }}
                            title={cancelada ? 'Compra cancelada' : 'Cancelar compra'}
                            disabled={cancelada}
                            onClick={() => setIdCancelar(c.id_compra)}
                          ><Ban size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {compras.length === 0 && (
                  <tr><td colSpan={8} className="op-empty">{hayFiltros ? 'No se encontraron compras con esos filtros.' : 'Aún no hay compras registradas.'}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && total > 0 && <Pagination pagina={pagina} total={total} porPagina={POR_PAGINA} onChange={setPagina} etiqueta="compras" />}
      </div>

      {idCancelar && (
        <CompraCancelModal
          idCompra={idCancelar}
          onClose={() => setIdCancelar(null)}
          onDone={(c) => {
            setIdCancelar(null);
            recargar();
            setFeedback({ type: 'success', message: `Compra ${c?.codigo || ''} cancelada. Se revirtieron inventario y cuenta por pagar.` });
          }}
        />
      )}
    </div>
  );
}
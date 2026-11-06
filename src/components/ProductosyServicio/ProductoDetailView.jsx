import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Package, Wrench, Hash, Tag, Ruler, FileText, Pencil, Power,
  DollarSign, Wallet, Percent, Info
} from 'lucide-react';

import { api } from '../../services/api';
import {
  formatoPrecio, formatoIdProducto, esStockBajo, margenGanancia, nombreTipo
} from './productoMapper';

const fechaCorta = (iso) => iso
  ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

export default function ProductoDetailView({ producto: p, onBack, onEdit, onToggle }) {
  const [hist, setHist] = useState(null);

  // GET /productos/:id/operaciones – si falla, la sección queda vacía sin romper la pantalla.
  useEffect(() => {
    let vivo = true;
    api.getProductOperations(p.id_producto)
      .then(res => { if (vivo) setHist(res.data || null); })
      .catch(() => { if (vivo) setHist(null); });
    return () => { vivo = false; };
  }, [p.id_producto]);

  const esProducto = p.tipo === 'producto';
  const activo = Number(p.estatus) === 1;
  const bajo = esStockBajo(p);
  const margen = margenGanancia(p);
  const operaciones = hist?.operaciones || [];
  const tieneOperaciones = Boolean(hist?.tiene_operaciones);

  const stock = Number(p.stock ?? 0);
  const minimo = Number(p.stock_minimo ?? 0);
  const tope = Math.max(stock, minimo * 2, 10);
  const pct = Math.min(100, (stock / tope) * 100);
  const pctMin = Math.min(100, (minimo / tope) * 100);

  return (
    <>
      <div className="prd-detail-title">
        <button type="button" className="cli-back" onClick={onBack} aria-label="Volver">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2>Detalle del {esProducto ? 'producto' : 'servicio'}</h2>
          <p>Productos y servicios / {p.codigo}</p>
        </div>
      </div>

      <div className="cli-detail">
        <div className="content-box cli-profile">
          <span className="prd-hero">{esProducto ? <Package size={30} /> : <Wrench size={30} />}</span>
          <h3>{p.nombre}</h3>
          <div className="cli-idline">
            {p.codigo}
            <span className="producto-tipo producto">{nombreTipo(p.tipo)}</span>
            <span className={`cli-pill ${activo ? 'green' : 'gray'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
          </div>

          <div className="cli-infolist">
            <div className="cli-info"><span className="cli-info-ico"><Hash size={16} /></span>
              <div><small>ID de producto</small><b>{formatoIdProducto(p.id_producto)}</b></div></div>
            <div className="cli-info"><span className="cli-info-ico"><Tag size={16} /></span>
              <div><small>Categoría</small><b>{p.nombre_categoria || '—'}</b></div></div>
            <div className="cli-info"><span className="cli-info-ico"><Ruler size={16} /></span>
              <div><small>Unidad de medida</small><b>{p.unidad_medida || '—'}</b></div></div>
            <div className="cli-info"><span className="cli-info-ico"><FileText size={16} /></span>
              <div><small>Descripción</small><b>{p.descripcion || 'Sin descripción'}</b></div></div>
          </div>

          <div className="cli-profile-actions">
            <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onEdit(p)}>
              <Pencil size={15} /> Editar
            </button>
            <button type="button" className={`btn ${activo ? 'btn-danger' : 'btn-primary'}`}
              style={{ flex: 1, justifyContent: 'center' }} onClick={() => onToggle(p)}>
              <Power size={15} /> {activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>

        <div className="cli-right">
          <div className="cli-stats3">
            <div className="stat-card"><div className="stat-icon-wrapper"><DollarSign size={20} /></div>
              <div><div className="stat-label">Precio de compra</div><div className="stat-value">{formatoPrecio(p.precio_compra)}</div></div></div>
            <div className="stat-card"><div className="stat-icon-wrapper"><Wallet size={20} /></div>
              <div><div className="stat-label">Precio de venta</div><div className="stat-value">{formatoPrecio(p.precio_venta)}</div></div></div>
            <div className="stat-card"><div className="stat-icon-wrapper"><Percent size={20} /></div>
              <div><div className="stat-label">Margen de ganancia</div><div className="stat-value">{margen === null ? '—' : `${margen}%`}</div></div></div>
          </div>

          {esProducto && (
            <div className="content-box prd-panel">
              <div className="prd-panel-head">
                <h4>Inventario</h4>
                <span className={`cli-pill ${bajo ? 'amber' : 'green'}`}>{bajo ? 'Stock bajo' : 'Stock suficiente'}</span>
              </div>

              <div className="prd-kpis">
                <div><small>Stock actual</small><b>{stock} <span>{p.unidad_medida?.toLowerCase()}s</span></b></div>
                <div><small>Stock mínimo</small><b>{minimo} <span>{p.unidad_medida?.toLowerCase()}s</span></b></div>
                <div><small>Valor en inventario</small><b>{formatoPrecio(stock * p.precio_compra)}</b></div>
              </div>

              <div className="prd-bar">
                <div className={`prd-bar-fill${bajo ? ' low' : ''}`} style={{ width: `${pct}%` }} />
                <span className="prd-bar-min" style={{ left: `${pctMin}%` }} />
              </div>
              <div className="prd-bar-lbl"><span>0</span><span>Mínimo: {minimo}</span><span>{tope}</span></div>
            </div>
          )}

          <div className="content-box prd-panel">
            <div className="prd-panel-head"><h4>Operaciones relacionadas</h4></div>

            <div className="prd-kpis">
              <div><small>Ventas</small><b>{hist?.ventas ?? 0}</b></div>
              <div><small>Compras</small><b>{hist?.compras ?? 0}</b></div>
              <div><small>Última operación</small><b>{fechaCorta(hist?.ultima_operacion)}</b></div>
            </div>

            {tieneOperaciones && (
              <div className="prd-note"><Info size={15} /> Tiene operaciones: solo puede desactivarse, no eliminarse.</div>
            )}

            <table className="table-clean">
              <thead><tr><th>FOLIO</th><th>FECHA</th><th>OPERACIÓN</th><th style={{ textAlign: 'right' }}>IMPORTE</th></tr></thead>
              <tbody>
                {operaciones.map(o => (
                  <tr key={`${o.tipo}-${o.folio}`}>
                    <td><b className="producto-codigo">{o.folio}</b></td>
                    <td>{fechaCorta(o.fecha)}</td>
                    <td>{o.descripcion}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatoPrecio(o.importe)}</td>
                  </tr>
                ))}
                {operaciones.length === 0 && (
                  <tr><td colSpan={4} className="cli-empty">{tieneOperaciones ? 'Sin ventas registradas para mostrar.' : 'Aún no tiene operaciones relacionadas.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

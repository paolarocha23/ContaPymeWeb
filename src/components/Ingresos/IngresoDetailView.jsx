import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, HandCoins, Tag, CreditCard, Calendar, User, Pencil, Ban, ReceiptText,
  CircleAlert, Banknote, Link2, ShieldCheck, ExternalLink
} from 'lucide-react';

import { api } from '../../services/api';

import {
  formatoPrecio, formatoIdIngreso, fechaCorta, nombreOrigen, nombreFormaPago,
  esManual, esActivo, puedeEditar, ESTATUS_VENTA
} from './ingresoMapper';

export default function IngresoDetailView({ ingreso: i, onBack, onEdit, onCancel, onIrVenta }) {
  const [det, setDet] = useState(null);

  // GET /ingresos/:id – venta relacionada, ingresos de la venta y movimientos de caja.
  // Si falla, esas secciones quedan vacías sin romper la pantalla.
  useEffect(() => {
    let vivo = true;
    api.getIncomeById(i.id_ingreso)
      .then(res => { if (vivo) setDet(res.data || null); })
      .catch(() => { if (vivo) setDet(null); });
    return () => { vivo = false; };
  }, [i.id_ingreso, i.estatus, i.monto]);

  const manual = esManual(i);
  const activo = esActivo(i);
  const venta = det?.venta || null;
  const ingresosVenta = det?.ingresos_venta || [];
  const movimientos = det?.movimientos_caja || [];
  const efectivo = i.forma_pago === 'efectivo';

  const estatusVenta = venta ? (ESTATUS_VENTA[venta.estatus] || { label: venta.estatus, clase: 'gray' }) : null;
  const saldoVenta = venta ? Math.max(0, Number(venta.total) - Number(venta.monto_pagado)) : 0;

  const origenTitulo = manual
    ? 'Manual (otro)'
    : i.origen === 'cobro' ? `Cobro de ${i.folio_venta || 'venta'}` : `Venta ${i.folio_venta || ''}`.trim();

  const origenTexto = manual
    ? 'Registrado directamente por un usuario; no depende de una venta o cobro.'
    : `El ingreso queda relacionado con ${i.origen === 'cobro' ? 'el cobro' : 'la venta'} que lo generó.`;

  const cajaTitulo = !efectivo ? 'Sin efectivo' : activo ? 'Entrada de efectivo' : 'Entrada revertida';
  const cajaTexto = !efectivo
    ? 'Pago con tarjeta: no afecta la caja de efectivo.'
    : activo ? 'Pago en efectivo: se registró una entrada en caja.'
      : 'Se canceló: la caja se revirtió con una salida.';

  const correccionTitulo = !activo ? 'Ingreso cancelado'
    : manual ? 'Modifica o cancela' : i.origen === 'cobro' ? 'Cancela el cobro' : 'Cancela la venta';
  const correccionTexto = !activo ? 'El registro se conserva como historial y ya no puede modificarse.'
    : manual ? 'Puedes modificarlo o cancelarlo; la caja se ajusta sola.'
      : 'Para corregirlo, cancela la operación de origen (RDF1102).';

  return (
    <>
      <div className="ing-detail-bar">
        <div className="ing-detail-title">
          <button type="button" className="cli-back" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2>
              Ingreso {formatoIdIngreso(i.id_ingreso)}
              <span className={`ing-estatus ${i.estatus}`}>{activo ? 'Activo' : 'Cancelado'}</span>
            </h2>
            <p>
              {fechaCorta(i.fecha)} · {manual ? 'Registrado manualmente'
                : `Generado automáticamente por ${i.origen === 'cobro' ? 'un cobro' : 'una venta'}`}
            </p>
          </div>
        </div>

        <div className="ing-detail-actions">
          <button type="button" className={`btn btn-outline${puedeEditar(i) ? '' : ' is-bloqueado'}`} onClick={() => onEdit(i)}>
            <Pencil size={15} /> Modificar
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onCancel(i)} disabled={!activo}>
            <Ban size={15} /> Cancelar ingreso
          </button>
        </div>
      </div>

      <div className="cli-detail">
        <div className="content-box cli-profile">
          <span className="ing-hero"><HandCoins size={30} /></span>
          <h3>{i.concepto}</h3>
          <div className="cli-idline">
            {formatoIdIngreso(i.id_ingreso)}
            <span className={`ing-origen ${i.origen}`}>{nombreOrigen(i.origen)}</span>
          </div>

          <div className="cli-infolist">
            <div className="cli-info"><span className="cli-info-ico"><Tag size={16} /></span>
              <div><small>Categoría</small><b>{i.nombre_categoria || '—'}</b></div></div>
            <div className="cli-info"><span className="cli-info-ico"><CreditCard size={16} /></span>
              <div><small>Forma de pago</small><b>{nombreFormaPago(i.forma_pago)}</b></div></div>
            <div className="cli-info"><span className="cli-info-ico"><Calendar size={16} /></span>
              <div><small>Fecha</small><b>{fechaCorta(i.fecha)}</b></div></div>
            <div className="cli-info"><span className="cli-info-ico"><User size={16} /></span>
              <div><small>Registrado por</small><b>{i.nombre_completo || i.nombre_usuario}</b></div></div>
          </div>
        </div>

        <div className="cli-right">
          <div className="cli-stats3">
            <div className="stat-card"><div className="stat-icon-wrapper"><HandCoins size={20} /></div>
              <div><div className="stat-label">Monto del ingreso</div><div className="stat-value">{formatoPrecio(i.monto)}</div></div></div>

            {venta ? (
              <>
                <div className="stat-card"><div className="stat-icon-wrapper"><ReceiptText size={20} /></div>
                  <div><div className="stat-label">Total de la venta</div><div className="stat-value">{formatoPrecio(venta.total)}</div></div></div>
                <div className="stat-card ing-stat-warn"><div className="stat-icon-wrapper"><CircleAlert size={20} /></div>
                  <div><div className="stat-label">Saldo de la venta</div><div className="stat-value">{formatoPrecio(saldoVenta)}</div></div></div>
              </>
            ) : (
              <>
                <div className="stat-card"><div className="stat-icon-wrapper"><Banknote size={20} /></div>
                  <div><div className="stat-label">Afecta caja</div><div className="stat-value">{efectivo ? 'Sí' : 'No'}</div></div></div>
                <div className="stat-card"><div className="stat-icon-wrapper"><ReceiptText size={20} /></div>
                  <div><div className="stat-label">Movimientos de caja</div><div className="stat-value">{movimientos.length}</div></div></div>
              </>
            )}
          </div>

          {venta && (
            <div className="content-box ing-panel">
              <div className="ing-panel-head"><h4>Venta relacionada</h4><span className="ing-tag">RDF1104</span></div>
              <div className="ing-venta">
                <span className="ing-venta-ico"><Link2 size={18} /></span>
                <div className="ing-venta-info">
                  <b>{venta.codigo}</b>
                  <small>
                    {[venta.nombre_cliente, fechaCorta(venta.fecha), venta.nombre_vendedor].filter(Boolean).join(' · ')}
                  </small>
                </div>
                <span className={`ing-pill ${estatusVenta.clase}`}>{estatusVenta.label}</span>
                <button type="button" className="btn btn-outline" onClick={onIrVenta}>
                  <ExternalLink size={15} /> Ver venta
                </button>
              </div>
            </div>
          )}

          {venta && (
            <div className="content-box ing-panel">
              <div className="ing-panel-head">
                <h4>Ingresos de esta venta</h4>
                <span className="ing-tag">{ingresosVenta.length} {ingresosVenta.length === 1 ? 'ingreso' : 'ingresos'}</span>
              </div>
              <table className="table-clean">
                <thead><tr><th>INGRESO</th><th>FECHA</th><th>FORMA DE PAGO</th><th>MONTO</th></tr></thead>
                <tbody>
                  {ingresosVenta.map(x => (
                    <tr key={x.id_ingreso}>
                      <td><b className="ing-codigo">{formatoIdIngreso(x.id_ingreso)}</b></td>
                      <td><b>{fechaCorta(x.fecha)}</b></td>
                      <td><b>{nombreFormaPago(x.forma_pago)}</b></td>
                      <td><b className={x.estatus === 'cancelado' ? 'ing-tachado' : ''}>{formatoPrecio(x.monto)}</b></td>
                    </tr>
                  ))}
                  {ingresosVenta.length === 0 && (
                    <tr><td colSpan={4} className="cli-empty">Sin ingresos registrados para esta venta.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="content-box ing-panel">
            <div className="ing-panel-head"><h4>Registro del ingreso</h4><span className="ing-tag">{manual ? 'Manual' : 'Automático'}</span></div>
            <div className="ing-tiles">
              <div className="ing-tile">
                <span className="ing-tile-ico"><Link2 size={16} /></span>
                <small>ORIGEN</small><b>{origenTitulo}</b><p>{origenTexto}</p>
              </div>
              <div className="ing-tile">
                <span className="ing-tile-ico green">{efectivo ? <Banknote size={16} /> : <CreditCard size={16} />}</span>
                <small>MOVIMIENTO DE CAJA</small><b>{cajaTitulo}</b><p>{cajaTexto}</p>
              </div>
              <div className="ing-tile">
                <span className="ing-tile-ico amber"><ShieldCheck size={16} /></span>
                <small>CORRECCIÓN</small><b>{correccionTitulo}</b><p>{correccionTexto}</p>
              </div>
            </div>
          </div>

          {movimientos.length > 0 && (
            <div className="content-box ing-panel">
              <div className="ing-panel-head"><h4>Movimientos de caja</h4><span className="ing-tag">{movimientos.length}</span></div>
              <table className="table-clean">
                <thead><tr><th>FECHA</th><th>TIPO</th><th>CONCEPTO</th><th style={{ textAlign: 'right' }}>MONTO</th></tr></thead>
                <tbody>
                  {movimientos.map(m => (
                    <tr key={m.id_movimiento}>
                      <td><b>{fechaCorta(m.fecha)}</b></td>
                      <td><span className={`ing-pill ${m.tipo === 'entrada' ? 'green' : 'red'}`}>{m.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span></td>
                      <td>{m.concepto}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatoPrecio(m.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Undo2, Ban, Receipt, Banknote, CircleAlert, Wallet, Calendar, Building2, UserRound,
  Phone, Mail, Boxes, RotateCw, CircleCheck, X
} from 'lucide-react';
import { api } from '../../services/api';
import {
  formatMoney, formatFechaCorta, formatFechaISO, pad4, TONO_ESTATUS, ETIQ_ESTATUS, extraerLista
} from '../../utils/opUtils';
import { Pill, StatCard } from '../Operaciones/shared';
import CompraCancelModal from './CompraCancelModal';
import CompraDevolucionModal from './CompraDevolucionModal';
import '../Operaciones/Operaciones.css';

/**
 * Las devoluciones de compra necesitan el endpoint POST /compras/:id/devoluciones.
 */
const DEVOLUCION_HABILITADA = true;

const normalizarPago = (p) => ({
  folio: p.folio || p.codigo || (p.id_pago ?? p.id ? `PG-${pad4(p.id_pago ?? p.id)}` : '—'),
  fecha: p.fecha || p.fecha_pago,
  metodo: p.forma_pago || p.metodo || '—',
  monto: Number(p.monto) || 0
});

export default function CompraDetailView({ idCompra, onBack, onChanged }) {
  const [compra, setCompra] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const res = await api.getCompraById(idCompra);
      if (!res.success || !res.data) throw new Error(res.message || 'No se pudo obtener la compra.');
      setCompra(res.data);
      setError('');
      const cxp = res.data.cuenta_por_pagar;
      const idCxp = res.data.id_cxp ?? cxp?.id_cxp ?? cxp?.id;
      if (idCxp) {
        try { setPagos(extraerLista(await api.getPagosCxp(idCxp)).items.map(normalizarPago)); } catch { setPagos([]); }
      } else {
        setPagos([]);
      }
    } catch (err) {
      setError(err.message || 'Error al consultar la compra.');
    }
  }, [idCompra]);

  useEffect(() => { setCompra(null); cargar(); }, [cargar]);

  if (error) {
    return (
      <div className="op">
        <div className="op-headline"><button type="button" className="op-back" onClick={onBack}><ArrowLeft size={20} /></button></div>
        <div className="alert alert-error"><CircleAlert size={18} /><div style={{ flex: 1 }}>{error}</div></div>
      </div>
    );
  }
  if (!compra) {
    return <div className="op"><div className="op-empty" style={{ padding: '80px 0' }}><RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} /></div></div>;
  }

  const cancelada = compra.estatus === 'cancelada';
  const items = compra.items || [];
  const cxp = compra.cuenta_por_pagar;
  const idCxp = compra.id_cxp ?? cxp?.id_cxp ?? cxp?.id;
  const piezas = items.filter((i) => (i.tipo_producto || 'producto') === 'producto').reduce((a, i) => a + Number(i.cantidad), 0);
  const totalPagos = pagos.length ? pagos.reduce((a, p) => a + p.monto, 0) : Number(compra.monto_pagado) || 0;
  const saldo = Number(compra.saldo_pendiente ?? Math.max(0, Number(compra.total) - Number(compra.monto_pagado)));
  const proveedor = compra.proveedor_nombre || 'Proveedor';

  const info = (Icon, label, valor) => (
    <div className="op-info"><span className="op-info-ico"><Icon size={18} /></span><div><small>{label}</small><b>{valor}</b></div></div>
  );

  const cambio = async (msg) => {
    setModal(null);
    setAviso(msg);
    await cargar();
    onChanged?.();
  };

  return (
    <div className="op">
      <div className="op-title">
        <div className="op-headline">
          <button type="button" className="op-back" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button>
          <div>
            <h2>Compra {compra.codigo} <Pill tone={TONO_ESTATUS[compra.estatus] || 'gray'}>{ETIQ_ESTATUS[compra.estatus] || compra.estatus}</Pill></h2>
            <p>{formatFechaCorta(compra.fecha)} · {compra.usuario_nombre || compra.usuario || '—'}</p>
          </div>
        </div>
        <div className="op-title-actions">
          {DEVOLUCION_HABILITADA && !cancelada && (
            <button type="button" className="btn btn-secondary op-round" onClick={() => setModal('devolucion')}><Undo2 size={15} /> Registrar devolución</button>
          )}
          {!cancelada && (
            <button type="button" className="btn btn-danger op-round" onClick={() => setModal('cancelar')}><Ban size={15} /> Cancelar compra</button>
          )}
        </div>
      </div>

      {aviso && (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <CircleCheck size={18} /><div style={{ flex: 1 }}>{aviso}</div>
          <button type="button" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setAviso(null)}><X size={16} /></button>
        </div>
      )}

      <div className="op-detail">
        <aside className="content-box op-card op-profile">
          <span className="op-avatar"><Building2 size={34} /></span>
          <h3>{proveedor}</h3>
          {compra.id_proveedor && <div className="op-idline"><span>P-{pad4(compra.id_proveedor)}</span></div>}
          <div className="op-infolist">
            {info(UserRound, 'CONTACTO', compra.proveedor_contacto || '—')}
            {compra.proveedor_telefono && info(Phone, 'TELÉFONO', compra.proveedor_telefono)}
            {compra.proveedor_correo && info(Mail, 'CORREO', compra.proveedor_correo)}
            {info(Wallet, 'CONDICIONES DE PAGO', compra.condiciones_pago === 'credito' ? 'Crédito' : 'Contado')}
            {info(Calendar, 'FECHA DE VENCIMIENTO', compra.fecha_vencimiento ? formatFechaISO(compra.fecha_vencimiento) : 'No aplica')}
          </div>
        </aside>

        <div className="op-right">
          <div className="op-stats3">
            <StatCard icon={<Receipt size={22} />} label="Total" value={formatMoney(compra.total)} />
            <StatCard icon={<Banknote size={22} />} label="Pagado" value={formatMoney(compra.monto_pagado)} />
            <StatCard icon={<CircleAlert size={22} />} label="Saldo por pagar" value={formatMoney(cancelada ? 0 : saldo)} tone="amber" />
          </div>

          <div className="content-box op-card-flush">
            <div className="op-card-head"><h4>Detalle de la compra</h4><span>{items.length} {items.length === 1 ? 'línea' : 'líneas'}</span></div>
            <div className="table-container-clean">
              <table className="table-clean">
                <thead><tr><th>PRODUCTO</th><th>CANT.</th><th>COSTO UNIT.</th><th>SUBTOTAL</th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id_detalle_compra ?? i}>
                      <td><b>{it.producto_nombre || it.nombre_producto || 'Producto'}</b><div className="op-small">{it.codigo_producto || 'S/C'}</div></td>
                      <td>{it.cantidad}</td>
                      <td>{formatMoney(it.costo_unitario)}</td>
                      <td><b>{formatMoney(it.subtotal)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-box op-card-flush">
            <div className="op-card-head"><h4>Operaciones generadas</h4><span>Automáticas</span></div>
            <div className="op-ops">
              <div className="op-op">
                <div className="op-op-ico"><Boxes size={18} /></div>
                <small>Inventario</small>
                <b>{piezas > 0 ? `+${piezas} ${piezas === 1 ? 'pieza' : 'piezas'}` : 'Sin movimiento'}</b>
                <p>Existencias aumentadas al confirmar (RDF1004).</p>
              </div>
              <div className="op-op">
                <div className="op-op-ico"><Wallet size={18} /></div>
                <small>Cuenta por pagar</small>
                <b>{cxp || idCxp ? `${idCxp ? `CxP-${pad4(idCxp)} · ` : ''}${formatMoney(cxp?.saldo_pendiente ?? saldo)}` : 'No generada'}</b>
                <p>{cxp?.fecha_vencimiento || compra.fecha_vencimiento ? `Vence el ${formatFechaISO(cxp?.fecha_vencimiento || compra.fecha_vencimiento)}.` : 'La compra quedó liquidada.'}</p>
              </div>
              <div className="op-op">
                <div className="op-op-ico"><Banknote size={18} /></div>
                <small>Pagos registrados</small>
                <b>{pagos.length ? `${pagos.length} ${pagos.length === 1 ? 'pago' : 'pagos'} · ` : ''}{formatMoney(totalPagos)}</b>
                <p>{pagos.length === 1 ? `${pagos[0].metodo} a ${proveedor}.` : 'Pagos aplicados al proveedor.'}</p>
              </div>
            </div>

            {pagos.length > 0 && (
              <div className="table-container-clean">
                <table className="table-clean">
                  <thead><tr><th>PAGO</th><th>FECHA</th><th>MÉTODO</th><th>MONTO</th></tr></thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.folio}>
                        <td className="op-code">{p.folio}</td>
                        <td>{formatFechaCorta(p.fecha)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.metodo}</td>
                        <td><b>{formatMoney(p.monto)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {compra.devoluciones && compra.devoluciones.length > 0 && (
            <div className="content-box op-card-flush">
              <div className="op-card-head">
                <h4>Devoluciones registradas</h4>
                <span>{compra.devoluciones.length} {compra.devoluciones.length === 1 ? 'devolución' : 'devoluciones'}</span>
              </div>
              <div className="table-container-clean">
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>FOLIO</th><th>FECHA</th><th>TIPO</th><th>USUARIO</th><th>MOTIVO</th><th>MONTO DEVUELTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compra.devoluciones.map((dev) => (
                      <tr key={dev.id_devolucion}>
                        <td className="op-code">DEV-{pad4(dev.id_devolucion)}</td>
                        <td>{formatFechaCorta(dev.fecha)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{dev.tipo}</td>
                        <td>{dev.usuario_nombre || '—'}</td>
                        <td>{dev.observaciones || '—'}</td>
                        <td><b style={{ color: '#b91c1c' }}>-{formatMoney(dev.monto_total)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal === 'cancelar' && (
        <CompraCancelModal idCompra={compra.id_compra ?? idCompra} onClose={() => setModal(null)} onDone={() => cambio(`Compra ${compra.codigo} cancelada.`)} />
      )}
      {modal === 'devolucion' && (
        <CompraDevolucionModal compra={compra} onClose={() => setModal(null)} onDone={() => cambio('Devolución registrada exitosamente.')} />
      )}
    </div>
  );
}

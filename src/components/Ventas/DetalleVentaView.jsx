import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, RotateCcw, Ban, CreditCard, CalendarClock, Info, Banknote, Wallet, Receipt, CircleAlert, RotateCw,
  DollarSign, Boxes, HandCoins, X
} from 'lucide-react';
import { api } from '../../services/api';
import { formatMoney, formatFechaISO } from '../../utils/ventasUtils';
import DevolucionModal from './DevolucionModal';

const cargarVenta = (id) => api.getVentaById(id);
const cancelarVenta = (id, motivo) => api.cancelarVenta(id, motivo);
const registrarDevolucion = (id, payload) => api.crearDevolucionVenta(id, payload);

const PILL = {
  pagada: ['green', 'Pagada'],
  pendiente_pago: ['amber', 'Pendiente de pago'],
  pago_parcial: ['blue', 'Pago parcial'],
  cancelada: ['red', 'Cancelada']
};

const iniciales = (n = '') =>
  n.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const fechaLarga = (f) =>
  f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '') : '—';

function normalizar(resp) {
  const d = resp?.data || resp || {};
  const v = d.venta || d;
  const lista = d.items || d.detalle || v.items || v.detalle || [];
  const cuenta = d.cuenta_por_cobrar || d.cuenta || v.cuenta_por_cobrar || null;
  return {
    id: v.id_venta,
    codigo: v.codigo,
    fecha: v.fecha,
    vendedor: v.vendedor,
    estatus: v.estatus,
    total: Number(v.total || 0),
    pagado: Number(v.monto_pagado || 0),
    monto_pagado: Number(v.monto_pagado || 0),
    saldo: Number(v.saldo_pendiente || 0),
    saldo_pendiente: Number(v.saldo_pendiente || 0),
    forma_pago: v.forma_pago,
    formaPago: v.forma_pago,
    condiciones: v.condiciones_pago,
    vencimiento: v.fecha_vencimiento,
    observaciones: v.observaciones,
    cliente: {
      nombre: v.nombre_cliente || 'Público en general',
      codigo: v.codigo_cliente || (v.id_cliente ? `C-${String(v.id_cliente).padStart(4, '0')}` : null),
      activo: v.cliente_activo === undefined ? true : Boolean(Number(v.cliente_activo))
    },
    items: lista.map((it) => {
      const cantidad = Number(it.cantidad || 0);
      const precio = Number(it.precio_unitario ?? it.precio ?? 0);
      return {
        id_producto: it.id_producto,
        nombre: it.producto || it.nombre || it.nombre_producto,
        tipo: it.tipo || it.tipo_producto || 'producto',
        cantidad,
        precio,
        subtotal: Number(it.subtotal ?? cantidad * precio),
        devuelta: Number(it.cantidad_devuelta || 0)
      };
    }),
    cobros: (d.cobros || v.cobros || d.pagos || []).map((c) => ({
      codigo: c.codigo || c.folio,
      fecha: c.fecha,
      metodo: c.metodo || c.forma_pago,
      monto: Number(c.monto || 0)
    })),
    cuenta: cuenta ? { codigo: cuenta.codigo || cuenta.folio, saldo: Number(cuenta.saldo ?? v.saldo_pendiente ?? 0) } : null
  };
}

export default function DetalleVentaView({ idVenta, onBack, onVentaActualizada, onVerTicket }) {
  const [venta, setVenta] = useState(null);
  const [error, setError] = useState('');
  const [devolucionOpen, setDevolucionOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState('');
  const [accionError, setAccionError] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      setVenta(normalizar(await cargarVenta(idVenta)));
    } catch (err) {
      setError(err.message || 'No se pudo cargar la venta.');
    }
  }, [idVenta]);

  useEffect(() => { cargar(); }, [cargar]);

  const hacerDevolucion = async (payload) => {
    const resp = await registrarDevolucion(idVenta, payload);
    if (resp && resp.success === false) throw new Error(resp.message || 'No se pudo registrar la devolución.');
    setDevolucionOpen(false);
    await cargar();
    onVentaActualizada?.();
  };

  const hacerCancelacion = async () => {
    setAccionError('');
    setProcesando(true);
    try {
      const resp = await cancelarVenta(idVenta, motivoCancel.trim() || undefined);
      if (resp && resp.success === false) throw new Error(resp.message || 'No se pudo cancelar la venta.');
      setCancelOpen(false);
      setMotivoCancel('');
      await cargar();
      onVentaActualizada?.();
    } catch (err) {
      setAccionError(err.message || 'No se pudo cancelar la venta.');
    } finally {
      setProcesando(false);
    }
  };

  if (error) {
    return (
      <div className="ven">
        <div className="ven-title-left">
          <button type="button" className="ven-back" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button>
          <h2 style={{ margin: 0 }}>Detalle de venta</h2>
        </div>
        <div className="ven-alert"><CircleAlert size={18} />{error}</div>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="ven">
        <div className="ven-card ven-lines-empty">
          <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
        </div>
      </div>
    );
  }

  const [color, etiqueta] = PILL[venta.estatus] || ['gray', venta.estatus];
  const cancelada = venta.estatus === 'cancelada';
  const piezas = venta.items.filter((i) => i.tipo === 'producto').reduce((a, i) => a + i.cantidad, 0);

  const info = (Icon, label, valor) => (
    <div className="ven-info">
      <span className="ven-info-ico"><Icon size={18} /></span>
      <div><small>{label}</small><b>{valor}</b></div>
    </div>
  );

  return (
    <div className="ven">
      {/* Encabezado */}
      <div className="ven-title">
        <div className="ven-title-left">
          <button type="button" className="ven-back" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button>
          <div>
            <div className="ven-title-inline">
              <h2>Venta {venta.codigo}</h2>
              <span className={`ven-pill ${color}`}>{etiqueta}</span>
            </div>
            <p>{fechaLarga(venta.fecha)} · {venta.vendedor}</p>
          </div>
        </div>
        <div className="ven-title-actions">
          <button type="button" className="ven-btn ven-btn-outline" onClick={() => onVerTicket?.({ id_venta: venta.id, codigo: venta.codigo })}>
            <Receipt size={16} /> Ver ticket
          </button>
          {!cancelada && (
            <>
              <button type="button" className="ven-btn ven-btn-outline" onClick={() => setDevolucionOpen(true)}>
                <RotateCcw size={16} /> Registrar devolución
              </button>
              <button type="button" className="ven-btn ven-btn-danger" onClick={() => setCancelOpen(true)}>
                <Ban size={16} /> Cancelar venta
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ven-detail">
        {/* Perfil / datos */}
        <aside className="content-box ven-profile" style={{ marginBottom: 0, borderRadius: 20 }}>
          <span className="ven-avatar">{iniciales(venta.cliente.nombre)}</span>
          <h3>{venta.cliente.nombre}</h3>
          {venta.cliente.codigo && (
            <div className="ven-idline">
              <span>{venta.cliente.codigo}</span>
              <span className={`ven-pill ${venta.cliente.activo ? 'green' : 'gray'}`}>
                {venta.cliente.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          )}

          <div className="ven-infolist">
            {info(venta.formaPago === 'tarjeta' ? CreditCard : Banknote, 'FORMA DE PAGO', venta.formaPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo')}
            {info(venta.condiciones === 'credito' ? CalendarClock : Wallet, 'CONDICIONES DE PAGO', venta.condiciones === 'credito' ? 'Crédito' : 'Contado')}
            {venta.condiciones === 'credito' && info(CalendarClock, 'FECHA DE VENCIMIENTO', formatFechaISO(venta.vencimiento))}
            {info(Info, 'OBSERVACIONES', venta.observaciones || '—')}
          </div>
        </aside>

        {/* Derecha */}
        <div className="ven-right">
          <div className="ven-stats3">
            <div className="stat-card">
              <div className="stat-icon-wrapper"><DollarSign size={22} /></div>
              <div><div className="stat-label">Total</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatMoney(venta.total)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper"><Banknote size={22} /></div>
              <div><div className="stat-label">Monto pagado</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{formatMoney(venta.pagado)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ background: '#FDF3E1', color: '#B26A00' }}><CircleAlert size={22} /></div>
              <div>
                <div className="stat-label">Saldo pendiente</div>
                <div className="stat-value" style={{ fontSize: '1.4rem', color: '#B26A00' }}>{formatMoney(cancelada ? 0 : venta.saldo)}</div>
              </div>
            </div>
          </div>

          <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
            <div className="ven-box-head">
              <h4>Detalle de la venta</h4>
              <span>{venta.items.length} {venta.items.length === 1 ? 'línea' : 'líneas'}</span>
            </div>
            <div className="table-container-clean">
              <table className="table-clean">
                <thead>
                  <tr><th>PRODUCTO</th><th>CANT.</th><th>PRECIO UNIT.</th><th>SUBTOTAL</th></tr>
                </thead>
                <tbody>
                  {venta.items.map((it, i) => (
                    <tr key={`${it.id_producto}-${i}`}>
                      <td><b>{it.nombre}</b></td>
                      <td>{it.cantidad}</td>
                      <td>{formatMoney(it.precio)}</td>
                      <td style={{ fontWeight: 700 }}>{formatMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
            <div className="ven-box-head">
              <h4>Operaciones generadas</h4>
              <span>Automáticas</span>
            </div>

            <div className="ven-ops">
              <div className="ven-op">
                <span className="ven-op-ico" style={{ color: '#142A95' }}><Boxes size={16} /></span>
                <small>Inventario</small>
                <b>{piezas > 0 ? `−${piezas} ${piezas === 1 ? 'pieza' : 'piezas'}` : 'Sin descuento'}</b>
                <p>
                  {piezas > 0
                    ? 'Existencias descontadas al confirmar.'
                    : 'No se descontó nada del inventario ya que fue un servicio.'}
                </p>
              </div>
              <div className="ven-op">
                <span className="ven-op-ico" style={{ color: '#12805C' }}><Banknote size={16} /></span>
                <small>Ingreso</small>
                <b>{formatMoney(venta.pagado)}</b>
                <p>{venta.formaPago === 'tarjeta' ? 'Pago con tarjeta registrado como ingreso.' : 'Pago en efectivo registrado en caja.'}</p>
              </div>
              <div className="ven-op">
                <span className="ven-op-ico" style={{ color: '#B26A00' }}><HandCoins size={16} /></span>
                <small>Cuenta por cobrar</small>
                <b>{venta.cuenta ? `${venta.cuenta.codigo || 'CxC'} · ${formatMoney(venta.saldo)}` : 'Sin cuenta por cobrar'}</b>
                <p>{venta.cuenta && venta.vencimiento ? `Vence el ${formatFechaISO(venta.vencimiento)}.` : 'La venta no dejó saldo.'}</p>
              </div>
            </div>

            {venta.cobros.length > 0 && (
              <div className="table-container-clean" style={{ borderTop: '1px solid #E4E8F5' }}>
                <table className="table-clean">
                  <thead>
                    <tr><th>COBRO</th><th>FECHA</th><th>MÉTODO</th><th>MONTO</th></tr>
                  </thead>
                  <tbody>
                    {venta.cobros.map((c, i) => (
                      <tr key={`${c.codigo}-${i}`}>
                        <td><span className="ven-code">{c.codigo}</span></td>
                        <td>{fechaLarga(c.fecha)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{c.metodo}</td>
                        <td style={{ fontWeight: 700 }}>{formatMoney(c.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {devolucionOpen && (
        <DevolucionModal venta={venta} onClose={() => setDevolucionOpen(false)} onConfirm={hacerDevolucion} />
      )}

      {cancelOpen && (
        <div className="ventas-modal-backdrop" onClick={() => !procesando && setCancelOpen(false)}>
          <div className="ventas-modal-card" style={{ width: 'min(100%, 480px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="ventas-modal-header">
              <div>
                <h3>Cancelar venta {venta.codigo}</h3>
                <p>Se revertirá el inventario y se anularán los movimientos generados.</p>
              </div>
              <button type="button" className="ventas-modal-close" onClick={() => setCancelOpen(false)} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>
            <div className="ventas-modal-body">
              {accionError && <div className="ven-alert"><CircleAlert size={18} />{accionError}</div>}
              <div>
                <div className="ven-dev-label">Motivo (opcional)</div>
                <textarea className="ven-textarea" value={motivoCancel} onChange={(e) => setMotivoCancel(e.target.value)} />
              </div>
            </div>
            <div className="ventas-modal-footer">
              <button type="button" className="ven-btn ven-btn-outline" onClick={() => setCancelOpen(false)} disabled={procesando}>
                Volver
              </button>
              <button type="button" className="ven-btn ven-btn-danger" onClick={hacerCancelacion} disabled={procesando}>
                <Ban size={15} /> {procesando ? 'Cancelando...' : 'Cancelar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
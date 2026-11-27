import React, { useState, useEffect } from 'react';
import { Ban, Boxes, History, Wallet, RotateCw, CircleCheck, CircleAlert, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { pad4, extraerLista, formatMoney } from '../../utils/opUtils';
import { Modal } from '../Operaciones/Shared';
import '../Operaciones/Operaciones.css';

export default function CompraCancelModal({ idCompra, onClose, onDone }) {
  const [compra, setCompra] = useState(null);
  const [stock, setStock] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api.getCompraById(idCompra)
      .then((r) => activo && setCompra(r.data))
      .catch((e) => activo && setError(e.message || 'No se pudo cargar la compra.'));
    api.getProducts({})
      .then((r) => {
        if (!activo) return;
        const mapa = {};
        extraerLista(r).items.forEach((p) => { mapa[p.id_producto] = Number(p.stock || 0); });
        setStock(mapa);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, [idCompra]);

  const items = compra?.items || [];
  const fisicos = items.filter((i) => (i.tipo_producto || 'producto') === 'producto');
  const piezas = fisicos.reduce((a, i) => a + Number(i.cantidad), 0);

  const faltantes = stock
    ? fisicos.filter((i) => i.id_producto in stock && stock[i.id_producto] - Number(i.cantidad) < 0)
    : [];
  const bloqueada = faltantes.length > 0;
  const cxp = compra?.cuenta_por_pagar;
  const idCxp = compra?.id_cxp ?? cxp?.id_cxp ?? cxp?.id;

  const totalCompra = Number(compra?.total || 0);
  const pagadoCompra = Number(compra?.monto_pagado || 0);
  const saldoPendiente = Number(compra?.saldo_pendiente ?? Math.max(0, totalCompra - pagadoCompra));

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const resp = await api.cancelarCompra(idCompra, motivo.trim() || 'Cancelación de compra');
      if (!resp.success) { setError(resp.message || 'No se pudo cancelar la compra.'); return; }
      onDone(resp.data);
    } catch (err) {
      setError(err.message || 'Error al cancelar la compra.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal onClose={enviando ? () => {} : onClose}>
      <div className="op-ic"><Ban size={30} /></div>
      <h3>¿Cancelar la compra {compra?.codigo || ''}?</h3>
      <p>Esta acción no se puede deshacer. Revisa los datos de la compra antes de confirmar:</p>

      {!compra && !error ? (
        <div style={{ padding: 20 }}><RotateCw className="spinning" size={22} style={{ color: '#183b9c' }} /></div>
      ) : compra && (
        <div style={{ textAlign: 'left', marginTop: 12 }}>
          {/* Resumen de la compra */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Building2 size={15} style={{ color: '#142a95' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {compra.proveedor_nombre || 'Proveedor'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, marginBottom: 10 }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Importe total</span>
                <b style={{ color: '#0f172a' }}>{formatMoney(totalCompra)}</b>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Pagos realizados</span>
                <b style={{ color: '#15803d' }}>{formatMoney(pagadoCompra)}</b>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Saldo pendiente</span>
                <b style={{ color: saldoPendiente > 0 ? '#b45309' : '#64748b' }}>{formatMoney(saldoPendiente)}</b>
              </div>
            </div>

            {items.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                  Productos ({items.length})
                </div>
                <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map((it, idx) => (
                    <div key={it.id_detalle_compra ?? idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                      <span>{it.cantidad} × {it.producto_nombre || it.nombre_producto || 'Producto'}</span>
                      <b>{formatMoney(it.subtotal)}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="op-list">
            {piezas > 0 && <div><Boxes size={16} />Descuenta {piezas} {piezas === 1 ? 'pieza' : 'piezas'} del inventario.</div>}
            <div><History size={16} />Registra los movimientos inversos de inventario, gastos y caja.</div>
            {(cxp || idCxp) && <div><Wallet size={16} />Cancela la cuenta por pagar{idCxp ? ` CxP-${pad4(idCxp)}` : ''}.</div>}
          </div>

          {stock && (bloqueada ? (
            <div className="op-note err" style={{ textAlign: 'left', marginBottom: 12 }}>
              <CircleAlert size={16} />
              <span>No se puede cancelar: las existencias quedarían negativas en {faltantes.map((f) => f.producto_nombre || f.nombre_producto).join(', ')}.</span>
            </div>
          ) : (
            <div className="op-note ok" style={{ textAlign: 'left', marginBottom: 12 }}>
              <CircleCheck size={16} /><span>Las existencias resultantes quedan en cero o más: se puede cancelar.</span>
            </div>
          ))}

          <input className="op-input noicon" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la cancelación (opcional)" />
        </div>
      )}
      {error && <div className="op-note err" style={{ textAlign: 'left', marginTop: 12 }}>{error}</div>}

      <div className="op-modal-actions">
        <button type="button" className="btn btn-secondary op-round" onClick={onClose} disabled={enviando}>Regresar</button>
        <button type="button" className="btn btn-danger op-round" onClick={confirmar} disabled={enviando || !compra || bloqueada}>
          <Ban size={15} /> {enviando ? 'Cancelando...' : 'Cancelar compra'}
        </button>
      </div>
    </Modal>
  );
}

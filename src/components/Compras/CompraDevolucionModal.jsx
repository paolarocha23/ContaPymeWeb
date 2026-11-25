import React, { useState, useEffect } from 'react';
import { Undo2, ArrowRight, Boxes, Wallet, Banknote } from 'lucide-react';
import { api } from '../../services/api';
import { formatMoney, redondear, pad4, extraerLista } from '../../utils/opUtils';
import { Modal, ModalHead, Seg, Stepper } from '../Operaciones/shared';
import '../Operaciones/Operaciones.css';

/**
 * Diseño de "Registrar devolución" para compras.
 * Requiere en api.js:  crearDevolucionCompra(id, data) -> POST /compras/:id/devoluciones
 * (el backend de compras todavía no lo tiene; por eso el botón está desactivado en CompraDetailView).
 */
export default function CompraDevolucionModal({ compra, onClose, onDone }) {
  const [sel, setSel] = useState({});
  const [resolucion, setResolucion] = useState(saldo > 0 ? 'cxp' : 'ingreso');
  const [motivo, setMotivo] = useState('');
  const [stock, setStock] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProducts({})
      .then((r) => {
        const m = {};
        extraerLista(r).items.forEach((p) => { m[p.id_producto] = Number(p.stock || 0); });
        setStock(m);
      })
      .catch(() => {});
  }, []);

  const items = compra.items || [];
  const lineas = items.filter((i) => sel[i.id_producto]);
  const monto = redondear(lineas.reduce((a, i) => a + sel[i.id_producto] * Number(i.costo_unitario), 0));
  const saldo = Number(compra.saldo_pendiente || 0);
  const saldoNuevo = redondear(Math.max(0, saldo - monto));
  const idCxp = compra.id_cxp ?? compra.cuenta_por_pagar?.id_cxp ?? compra.cuenta_por_pagar?.id;
  const valido = lineas.length > 0 && motivo.trim().length >= 3;

  const toggle = (it) =>
    setSel((p) => { const n = { ...p }; if (n[it.id_producto]) delete n[it.id_producto]; else n[it.id_producto] = 1; return n; });

  const enviar = async () => {
    setEnviando(true);
    setError('');
    try {
      const resp = await api.crearDevolucionCompra(compra.id_compra, {
        items: lineas.map((i) => ({ id_producto: i.id_producto, cantidad: sel[i.id_producto] })),
        resolucion,
        observaciones: motivo.trim()
      });
      if (!resp.success) { setError(resp.message || 'No se pudo registrar la devolución.'); return; }
      onDone(resp.data);
    } catch (err) {
      setError(err.message || 'Error al registrar la devolución.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal onClose={enviando ? () => {} : onClose}>
      <ModalHead title={`Registrar devolución · ${compra.codigo}`} subtitle="Selecciona los productos que devuelves al proveedor, total o parcialmente." onClose={onClose} />

      <div className="table-container-clean">
        <table className="table-clean">
          <thead><tr><th>PRODUCTO</th><th>COMPRADOS</th><th>COSTO UNIT.</th><th>A DEVOLVER</th></tr></thead>
          <tbody>
            {items.map((it, i) => {
              const marcado = Boolean(sel[it.id_producto]);
              return (
                <tr key={it.id_detalle_compra ?? i}>
                  <td>
                    <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={marcado} onChange={() => toggle(it)} />
                      <b>{it.producto_nombre || it.nombre_producto}</b>
                    </label>
                  </td>
                  <td>{it.cantidad}</td>
                  <td>{formatMoney(it.costo_unitario)}</td>
                  <td>
                    {marcado
                      ? <Stepper value={sel[it.id_producto]} min={1} max={Number(it.cantidad)} onChange={(v) => setSel((p) => ({ ...p, [it.id_producto]: v }))} />
                      : <span className="op-muted">0</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="op-label">Resolución <i>*</i></label>
        <Seg
          value={resolucion} onChange={setResolucion}
          options={[
            { value: 'cxp', label: 'Ajustar cuenta por pagar', icon: <Wallet size={14} /> },
            { value: 'ingreso', label: 'Reembolso en efectivo (Entrada a Caja)', icon: <Banknote size={14} /> }
          ]}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <label className="op-label">Motivo de la devolución <i>*</i></label>
        <textarea className="op-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Piezas con empaque dañado" />
      </div>

      <div className="op-resumen">
        <div><small>Monto a devolver</small><b>{formatMoney(monto)}</b></div>
        <span className="arrow"><ArrowRight size={16} /></span>
        <div className="right">
          {resolucion === 'cxp'
            ? <><small>Cuenta por pagar {idCxp ? `CxP-${pad4(idCxp)}` : ''}</small><b>{formatMoney(saldo)} → {formatMoney(saldoNuevo)}</b></>
            : <><small>Ingreso por reembolso</small><b>{formatMoney(monto)}</b></>}
        </div>
      </div>

      {lineas.length > 0 && (
        <div className="op-note warn">
          <Boxes size={16} />
          <span>
            Se descuentan {lineas.map((i) => {
              const antes = stock[i.id_producto];
              return `${sel[i.id_producto]} ${sel[i.id_producto] === 1 ? 'pieza' : 'piezas'} de ${i.producto_nombre || i.nombre_producto}${antes !== undefined ? ` (existencia ${antes} → ${redondear(antes - sel[i.id_producto])})` : ''}`;
            }).join(', ')}.
          </span>
        </div>
      )}
      {error && <div className="op-note err" style={{ marginTop: 10 }}>{error}</div>}

      <div className="op-modal-actions">
        <button type="button" className="btn btn-secondary op-round" onClick={onClose} disabled={enviando}>Cancelar</button>
        <button type="button" className="btn btn-primary op-round" onClick={enviar} disabled={!valido || enviando}>
          <Undo2 size={15} /> {enviando ? 'Registrando...' : 'Registrar devolución'}
        </button>
      </div>
    </Modal>
  );
}

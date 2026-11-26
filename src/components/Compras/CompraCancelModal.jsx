import React, { useState, useEffect } from 'react';
import { Ban, Boxes, History, Wallet, RotateCw, CircleCheck, CircleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { pad4, extraerLista } from '../../utils/opUtils';
import { Modal } from '../Operaciones/Shared';
import '../Operaciones/Operaciones.css';

export default function CompraCancelModal({ idCompra, onClose, onDone }) {
  const [compra, setCompra] = useState(null);
  const [stock, setStock] = useState(null); // { id_producto: stock actual } | null si no se pudo consultar
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

  // ¿Las existencias resultantes quedan en cero o más?
  const faltantes = stock
    ? fisicos.filter((i) => i.id_producto in stock && stock[i.id_producto] - Number(i.cantidad) < 0)
    : [];
  const bloqueada = faltantes.length > 0;
  const cxp = compra?.cuenta_por_pagar;
  const idCxp = compra?.id_cxp ?? cxp?.id_cxp ?? cxp?.id;

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
    <Modal onClose={enviando ? () => {} : onClose} size="sm">
      <div className="op-ic"><Ban size={30} /></div>
      <h3>¿Cancelar la compra {compra?.codigo || ''}?</h3>
      <p>Esta acción no se puede deshacer. Al cancelar, el sistema hará lo siguiente:</p>

      {!compra && !error ? (
        <div style={{ padding: 20 }}><RotateCw className="spinning" size={22} style={{ color: '#183b9c' }} /></div>
      ) : compra && (
        <>
          <div className="op-list">
            {piezas > 0 && <div><Boxes size={16} />Descuenta {piezas} {piezas === 1 ? 'pieza' : 'piezas'} del inventario.</div>}
            <div><History size={16} />Registra los movimientos inversos de inventario y pagos.</div>
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
        </>
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
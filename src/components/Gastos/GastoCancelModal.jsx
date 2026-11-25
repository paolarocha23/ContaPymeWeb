import React, { useState } from 'react';
import { Ban, History, Banknote, Archive } from 'lucide-react';
import { moneda, codigoGasto, afectaCaja } from './gastosHelpers';
import './Gastos.css';

export default function GastoCancelModal({ gasto, onClose, onConfirm }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      await onConfirm(gasto);
    } catch (err) {
      setError(err.message || 'No fue posible cancelar el gasto.');
      setEnviando(false);
    }
  };

  return (
    <div className="gas-overlay" onClick={enviando ? undefined : onClose}>
      <div className="gas-modal gas-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="gas-ic red"><Ban size={30} /></div>
        <h4>¿Cancelar el gasto {codigoGasto(gasto.id_gasto)}?</h4>
        <p>Esta acción no se puede deshacer. Al cancelar, el sistema hará lo siguiente:</p>

        <div className="gas-list">
          <div><Archive size={16} />Conserva el registro de “{gasto.concepto}” con estatus cancelado.</div>
          {afectaCaja(gasto)
            ? <div><Banknote size={16} />Registra el movimiento inverso en caja (+{moneda(gasto.monto)}).</div>
            : <div><History size={16} />No genera movimiento en caja porque el pago fue con {gasto.forma_pago}.</div>}
        </div>

        {error && <div className="gas-alert error" style={{ marginTop: 12 }}>{error}</div>}

        <div className="gas-actions gas-actions-center">
          <button type="button" className="btn btn-secondary gas-round" onClick={onClose} disabled={enviando}>Regresar</button>
          <button type="button" className="btn btn-danger gas-round" onClick={confirmar} disabled={enviando}>
            <Ban size={15} /> {enviando ? 'Cancelando...' : 'Cancelar gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}

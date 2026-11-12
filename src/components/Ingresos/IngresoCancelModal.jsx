import React, { useState } from 'react';
import { Ban, Lock, Info, ExternalLink, RotateCw, TriangleAlert } from 'lucide-react';

import { formatoIdIngreso } from './ingresoMapper';

// modo = 'cancelar' (confirmar cancelación de un ingreso manual)
//      | 'bloqueado' (RDF1102: ingreso automático o ya cancelado, no se puede modificar/cancelar)
// accion = 'modificar' | 'cancelar' (solo para el texto del modo bloqueado)
export default function IngresoCancelModal({
  ingreso, modo = 'cancelar', accion = 'cancelar', onClose, onConfirm, onIrVenta
}) {
  const [procesando, setProcesando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const codigo = formatoIdIngreso(ingreso.id_ingreso);
  const bloqueado = modo === 'bloqueado';
  const cancelado = ingreso.estatus === 'cancelado';
  const folio = ingreso.folio_venta;

  const origenTxt = ingreso.origen === 'cobro'
    ? (folio ? `un cobro de la venta ${folio}` : 'un cobro')
    : (folio ? `la venta ${folio}` : 'una venta');

  const verbo = accion === 'modificar' ? 'modificar' : 'cancelar';

  const confirmar = async () => {
    setProcesando(true);
    setError('');
    try {
      await onConfirm(ingreso, motivo.trim());
    } catch (err) {
      setError(err.message || 'No se pudo cancelar el ingreso.');
    } finally {
      setProcesando(false);
    }
  };

  if (bloqueado) {
    return (
      <div className="ing-overlay">
        <div className="ing-modal ing-modal-sm">
          <div className="ing-ic red"><Lock size={28} /></div>

          <h4>No se puede {verbo} {codigo}</h4>
          <p>
            {cancelado
              ? 'Este ingreso ya está cancelado. Se conserva en el historial y no admite cambios.'
              : `Este ingreso se generó automáticamente por ${origenTxt}. Solo se ${accion === 'modificar' ? 'modifican' : 'cancelan'} los ingresos manuales (origen Otro).`}
          </p>

          {!cancelado && (
            <div className="ing-note">
              <Info size={16} />
              <span>Para corregirlo, cancela la venta o el cobro de origen y el ingreso se ajusta solo.</span>
            </div>
          )}

          <div className="ing-actions ing-actions-center">
            <button type="button" className="btn btn-outline" onClick={onClose}>Entendido</button>
            {!cancelado && (
              <button type="button" className="btn btn-primary" onClick={onIrVenta}>
                <ExternalLink size={16} /> {folio ? `Ir a la venta ${folio}` : 'Ir a ventas'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ing-overlay">
      <div className="ing-modal ing-modal-sm">
        <div className="ing-ic red"><Ban size={28} /></div>

        <h4>¿Cancelar {codigo}?</h4>
        <p>
          El ingreso se conserva en el historial con estatus Cancelado. Si fue en efectivo,
          se revertirá su movimiento de caja. Esta acción no se puede deshacer.
        </p>

        <textarea
          className="form-input ing-motivo"
          rows={2}
          maxLength={255}
          placeholder="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={procesando}
        />

        {error && (
          <div className="ing-alert error" style={{ textAlign: 'left' }}>
            <TriangleAlert size={18} /><div>{error}</div>
          </div>
        )}

        <div className="ing-actions ing-actions-center">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={procesando}>Volver</button>
          <button type="button" className="btn btn-danger" onClick={confirmar} disabled={procesando}>
            {procesando ? <RotateCw className="animate-spin" size={16} /> : <Ban size={16} />}
            Cancelar ingreso
          </button>
        </div>
      </div>
    </div>
  );
}
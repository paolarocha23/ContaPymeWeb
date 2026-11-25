import { ArrowDownToLine, ArrowUpFromLine, Calendar, FileText, Banknote, Info, Check, X, AlertCircle } from 'lucide-react';
import { formatoMoneda } from './cajaUtils';

export default function ModalEntradaCaja({
  formulario, onChange, onCambiarTipo, onSubmit, onClose, guardando, error, saldoActual, usuario
}) {
  const monto = Number(formulario.monto) > 0 ? Number(formulario.monto) : 0;

  return (
    <div className="caja-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="caja-modal" role="dialog" aria-modal="true" aria-labelledby="caja-modal-titulo">
        <div className="caja-modal-head">
          <div>
            <h3 id="caja-modal-titulo">Registrar entrada de efectivo</h3>
            <p>Registra un movimiento manual de efectivo en caja.</p>
          </div>
          <button type="button" className="caja-close" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="caja-field">
            <label>Tipo de movimiento <i>*</i></label>
            <div className="caja-seg">
              <button type="button" className="on"><ArrowDownToLine size={15} /> Entrada</button>
              <button type="button" onClick={() => onCambiarTipo('salida')}><ArrowUpFromLine size={15} /> Salida</button>
            </div>
          </div>

          <div className="caja-field">
            <label htmlFor="caja-fecha">Fecha y hora <i>*</i></label>
            <div className="caja-input">
              <Calendar size={16} />
              <input id="caja-fecha" type="datetime-local" name="fecha" value={formulario.fecha} onChange={onChange} required />
            </div>
          </div>

          <div className="caja-field">
            <label htmlFor="caja-concepto">Concepto <i>*</i></label>
            <div className="caja-input">
              <FileText size={16} />
              <input
                id="caja-concepto" type="text" name="concepto" value={formulario.concepto} onChange={onChange}
                placeholder="Ej. Fondo inicial de caja" maxLength={255} required autoFocus
              />
            </div>
          </div>

          <div className="caja-field">
            <label htmlFor="caja-monto">Monto <i>*</i></label>
            <div className="caja-input">
              <Banknote size={16} />
              <input
                id="caja-monto" type="number" name="monto" value={formulario.monto} onChange={onChange}
                placeholder="0.00" min="0.01" step="0.01" required
              />
            </div>
          </div>

          {error && <div className="caja-note err" role="alert"><AlertCircle size={16} /> {error}</div>}

          <div className="caja-note ok">
            <Info size={16} />
            <span>
              Esta entrada aumentará el saldo de caja.
              {usuario ? <> Se guarda a nombre de {usuario}.</> : ' Se guarda a nombre de tu usuario.'}
            </span>
          </div>

          <div className="caja-balance">
            <span>Saldo actual: <b>{formatoMoneda(saldoActual)}</b></span>
            <span>→ Saldo resultante: <b className="pos">{formatoMoneda(saldoActual + monto)}</b></span>
          </div>

          <div className="caja-modal-foot">
            <button type="button" className="caja-btn caja-btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" className="caja-btn caja-btn-primary" disabled={guardando}>
              <Check size={16} /> {guardando ? 'Guardando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
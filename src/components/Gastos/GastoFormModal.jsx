import React, { useState } from 'react';
import { X, Calendar, Tag, DollarSign, FileText, Info, Banknote, CreditCard, Landmark } from 'lucide-react';
import { fechaFormato, hoyISO } from './gastosHelpers';
import './Gastos.css';

export default function GastoFormModal({ gasto, categorias, onClose, onSave }) {
  const editando = Boolean(gasto);

  const [form, setForm] = useState(() =>
    editando
      ? {
          fecha: gasto.fecha?.slice(0, 10) || hoyISO(),
          concepto: gasto.concepto || '',
          id_categoria: String(gasto.id_categoria ?? ''),
          monto: gasto.monto ?? '',
          forma_pago: gasto.forma_pago || 'efectivo',
          observaciones: gasto.observaciones || ''
        }
      : {
          fecha: hoyISO(),
          concepto: '',
          id_categoria: categorias[0] ? String(categorias[0].id_categoria) : '',
          monto: '',
          forma_pago: 'efectivo',
          observaciones: ''
        }
  );
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const errores = {
    fecha: !form.fecha,
    concepto: !form.concepto.trim(),
    id_categoria: !form.id_categoria,
    monto: !(Number(form.monto) > 0)
  };
  const hayErrores = Object.values(errores).some(Boolean);
  const inval = (c) => intento && errores[c];

  const formas = [
    { value: 'efectivo', label: 'Efectivo', icon: <Banknote size={15} /> },
    { value: 'tarjeta', label: 'Tarjeta', icon: <CreditCard size={15} /> }
  ];
  // Gastos antiguos pagados por transferencia se conservan tal cual
  if (form.forma_pago === 'transfer') formas.push({ value: 'transfer', label: 'Transferencia', icon: <Landmark size={15} /> });

  const enviar = async (ev) => {
    ev.preventDefault();
    setIntento(true);
    setError('');
    if (hayErrores) return;

    setGuardando(true);
    try {
      await onSave({
        fecha: form.fecha,
        concepto: form.concepto.trim(),
        id_categoria: Number(form.id_categoria),
        monto: Number(form.monto),
        forma_pago: form.forma_pago,
        observaciones: form.observaciones.trim()
      });
    } catch (err) {
      setError(err.message || 'No fue posible guardar el gasto.');
      setGuardando(false);
    }
  };

  return (
    <div className="gas-overlay" onClick={guardando ? undefined : onClose}>
      <form className="gas-modal gas-modal-lg" onClick={(e) => e.stopPropagation()} onSubmit={enviar} noValidate>
        <div className="gas-modal-head">
          <div>
            <h4>{editando ? 'Modificar gasto' : 'Registrar gasto'}</h4>
            <p>{editando ? 'Actualiza la información del gasto. Solo los gastos no cancelados pueden modificarse.' : 'Completa la información del gasto.'}</p>
          </div>
          <button type="button" className="gas-x" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>

        <div className="gas-grid">
          <div className="gas-campo">
            <label className="gas-label">Fecha<span className="gas-req">*</span></label>
            <div className="gas-input gas-fecha">
              <Calendar className="gas-input-ico" size={16} />
              <div className={`gas-ctl${inval('fecha') ? ' is-invalid' : ''}`}>{form.fecha ? fechaFormato(form.fecha) : 'Selecciona una fecha'}</div>
              <input type="date" value={form.fecha} onChange={(e) => set('fecha', e.target.value)} aria-label="Fecha" />
            </div>
            {inval('fecha') && <div className="gas-err">Selecciona la fecha del gasto.</div>}
          </div>

          <div className="gas-campo">
            <label className="gas-label">Categoría<span className="gas-req">*</span></label>
            <div className="gas-input">
              <Tag className="gas-input-ico" size={16} />
              <select className={`gas-ctl${inval('id_categoria') ? ' is-invalid' : ''}`} value={form.id_categoria} onChange={(e) => set('id_categoria', e.target.value)}>
                <option value="">Selecciona una categoría</option>
                {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </select>
            </div>
            {inval('id_categoria') && <div className="gas-err">Selecciona una categoría.</div>}
          </div>

          <div className="gas-campo full">
            <label className="gas-label">Concepto<span className="gas-req">*</span></label>
            <div className="gas-input">
              <FileText className="gas-input-ico" size={16} />
              <input
                className={`gas-ctl${inval('concepto') ? ' is-invalid' : ''}`}
                value={form.concepto} maxLength={255}
                onChange={(e) => set('concepto', e.target.value)}
                placeholder="Ej. Pago de servicio de internet"
              />
            </div>
            {inval('concepto') && <div className="gas-err">El concepto es obligatorio.</div>}
          </div>

          <div className="gas-campo">
            <label className="gas-label">Monto<span className="gas-req">*</span></label>
            <div className="gas-input">
              <DollarSign className="gas-input-ico" size={16} />
              <input
                type="number" min="0.01" step="0.01"
                className={`gas-ctl${inval('monto') ? ' is-invalid' : ''}`}
                value={form.monto} onChange={(e) => set('monto', e.target.value)} placeholder="0.00"
              />
            </div>
            {inval('monto') && <div className="gas-err">Captura un monto mayor a cero.</div>}
          </div>

          <div className="gas-campo">
            <label className="gas-label">Forma de pago<span className="gas-req">*</span></label>
            <div className="gas-seg">
              {formas.map((f) => (
                <button type="button" key={f.value} className={form.forma_pago === f.value ? 'on' : ''} onClick={() => set('forma_pago', f.value)}>
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gas-campo full">
            <label className="gas-label">Observaciones</label>
            <textarea className="gas-ctl" value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Información adicional (opcional)" />
          </div>
        </div>

        {form.forma_pago === 'efectivo' && (
          <div className="gas-note"><Info size={16} />Los gastos en efectivo registran una salida en caja.</div>
        )}
        {(error || (intento && hayErrores)) && (
          <div className="gas-alert error" style={{ marginTop: 12 }}>{error || 'Completa los campos marcados para continuar.'}</div>
        )}

        <div className="gas-actions">
          <button type="button" className="btn btn-secondary gas-round" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button type="submit" className="btn btn-primary gas-round" disabled={guardando}>
            {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
        </div>
      </form>
    </div>
  );
}
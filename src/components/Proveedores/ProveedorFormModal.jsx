import React, { useState } from 'react';
import { X, Plus, Phone, Mail, AlertCircle } from 'lucide-react';
import { ESTADOS } from './constants';

const VACIO = {
  nombreEmpresa: '', nombreContacto: '', telefono: '', correo: '',
  calle: '', colonia: '', ciudad: '', estado: ''
};

function validar(f) {
  const e = {};
  if (!f.nombreEmpresa?.trim()) e.nombreEmpresa = 'El nombre de la empresa es obligatorio.';
  if (!f.nombreContacto?.trim()) e.nombreContacto = 'El nombre del contacto es obligatorio.';

  const tel = String(f.telefono || '').replace(/\D/g, '');
  if (tel.length !== 10) e.telefono = 'Debe tener 10 dígitos.';

  if (!f.correo?.trim()) e.correo = 'El correo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) e.correo = 'Correo electrónico no válido.';

  if (!f.calle?.trim()) e.calle = 'La calle es obligatoria.';
  if (!f.colonia?.trim()) e.colonia = 'La colonia es obligatoria.';
  if (!f.ciudad?.trim()) e.ciudad = 'La ciudad es obligatoria.';
  if (!f.estado?.trim()) e.estado = 'Selecciona un estado.';
  return e;
}

export default function ProveedorFormModal({ proveedor, onClose, onSave }) {
  const editando = Boolean(proveedor);
  const [form, setForm] = useState(proveedor ? { ...VACIO, ...proveedor } : VACIO);
  const [activo, setActivo] = useState(proveedor ? proveedor.activo : true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (ev) => {
    let val = ev.target.value;
    if (k === 'telefono') val = val.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, [k]: val }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validar(form);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      setSubmitting(true);
      await onSave({ ...form, activo });
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: err.message || 'Error al guardar proveedor' }));
    } finally {
      setSubmitting(false);
    }
  };

  const errStyle = (k) => (errors[k] ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined);
  const Err = ({ k }) => errors[k] ? <div className="cli-err"><AlertCircle size={12} />{errors[k]}</div> : null;
  const Req = () => <span style={{ color: '#C2362F' }}>*</span>;

  return (
    <div className="modal-backdrop">
      <form className="modal-content cli-form-modal" onSubmit={submit} noValidate>
        <div className="modal-header" style={{ paddingBottom: 16 }}>
          <div className="modal-title-group">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B132B' }}>
              {editando ? 'Modificar proveedor' : 'Agregar proveedor'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: 4 }}>
              {editando
                ? 'Actualiza los datos del proveedor. El identificador no se puede cambiar.'
                : 'Registra un nuevo proveedor. Se creará con estatus Activo.'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errors.submit && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              <AlertCircle size={16} /><span>{errors.submit}</span>
            </div>
          )}

          {editando && (
            <div className="cli-grid">
              <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  ID DE PROVEEDOR
                </label>
                <input
                  className="form-input"
                  value={proveedor.codigo}
                  disabled
                  style={{ backgroundColor: '#F3F5FC', color: '#0B132B', fontWeight: 600 }}
                />
              </div>
              <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  ESTATUS
                </label>
                <button
                  type="button"
                  className="switch-toggle"
                  style={{ height: 42, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setActivo(!activo)}
                >
                  <span className={`switch-track${activo ? ' active' : ''}`}>
                    <span className="switch-thumb" />
                  </span>
                  <span className={activo ? 'status-label-active' : 'status-label-inactive'} style={{ fontSize: '0.85rem' }}>
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="cli-sec">Datos de la empresa</div>
          <div className="cli-grid">
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">NOMBRE DE LA EMPRESA <Req /></label>
              <input className="form-input" style={errStyle('nombreEmpresa')} value={form.nombreEmpresa}
                onChange={set('nombreEmpresa')} placeholder="Nombre de la empresa" autoFocus />
              <Err k="nombreEmpresa" />
            </div>
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">NOMBRE DEL CONTACTO <Req /></label>
              <input className="form-input" style={errStyle('nombreContacto')} value={form.nombreContacto}
                onChange={set('nombreContacto')} placeholder="Persona de contacto" />
              <Err k="nombreContacto" />
            </div>
          </div>

          <div className="cli-sec">Contacto</div>
          <div className="cli-grid">
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">TELÉFONO <Req /></label>
              <div className="input-with-icon">
                <Phone className="input-icon" size={17} />
                <input className="form-input" style={errStyle('telefono')} value={form.telefono}
                  onChange={set('telefono')} placeholder="10 dígitos" maxLength={10} inputMode="numeric" />
              </div>
              <Err k="telefono" />
            </div>
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">CORREO <Req /></label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={17} />
                <input className="form-input" type="email" style={errStyle('correo')} value={form.correo}
                  onChange={set('correo')} placeholder="correo@ejemplo.com" />
              </div>
              <Err k="correo" />
            </div>
          </div>

          <div className="cli-sec">Dirección</div>
          <div className="cli-grid">
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">CALLE <Req /></label>
              <input className="form-input" style={errStyle('calle')} value={form.calle}
                onChange={set('calle')} placeholder="Calle" />
              <Err k="calle" />
            </div>
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">COLONIA <Req /></label>
              <input className="form-input" style={errStyle('colonia')} value={form.colonia}
                onChange={set('colonia')} placeholder="Colonia" />
              <Err k="colonia" />
            </div>
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">CIUDAD <Req /></label>
              <input className="form-input" style={errStyle('ciudad')} value={form.ciudad}
                onChange={set('ciudad')} placeholder="Ciudad" />
              <Err k="ciudad" />
            </div>
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">ESTADO <Req /></label>
              <select className="form-select" style={errStyle('estado')} value={form.estado} onChange={set('estado')}>
                <option value="">Selecciona un estado</option>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Err k="estado" />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #E4E8F5', paddingTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {!editando && <Plus size={16} />}
            {editando ? 'Guardar cambios' : 'Guardar proveedor'}
          </button>
        </div>
      </form>
    </div>
  );
}
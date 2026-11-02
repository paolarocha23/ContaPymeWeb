import React, { useState } from 'react';
import { X, Plus, Phone, Mail, AlertCircle } from 'lucide-react';
import { ESTADOS } from './constants';

const VACIO = {
  nombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  telefono: '',
  correo: '',
  calle: '',
  numExterior: '',
  colonia: '',
  cp: '',
  ciudad: '',
  estado: ''
};

function validar(f) {
  const e = {};
  if (!f.nombre?.trim()) e.nombre = 'El nombre es obligatorio.';
  if (!f.apellidoPaterno?.trim()) e.apellidoPaterno = 'El apellido paterno es obligatorio.';
  
  const telLimpio = String(f.telefono || '').replace(/\D/g, '');
  if (!telLimpio || telLimpio.length !== 10) e.telefono = 'Debe tener 10 dígitos.';
  
  if (!f.correo?.trim()) {
    e.correo = 'El correo es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) {
    e.correo = 'Correo electrónico no válido.';
  }

  if (!f.calle?.trim()) e.calle = 'La calle es obligatoria.';
  if (!f.numExterior?.trim()) e.numExterior = 'Obligatorio.';
  if (!f.colonia?.trim()) e.colonia = 'La colonia es obligatoria.';
  
  const cpLimpio = String(f.cp || '').trim();
  if (!cpLimpio || !/^\d{5}$/.test(cpLimpio)) e.cp = 'Debe tener 5 dígitos.';
  
  if (!f.ciudad?.trim()) e.ciudad = 'La ciudad es obligatoria.';
  if (!f.estado?.trim()) e.estado = 'Selecciona un estado.';

  return e;
}

export default function ClienteFormModal({ cliente, onClose, onSave }) {
  const editando = Boolean(cliente);
  const [form, setForm] = useState(cliente ? { ...VACIO, ...cliente } : VACIO);
  const [activo, setActivo] = useState(cliente ? cliente.activo : true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (ev) => {
    let val = ev.target.value;
    if (k === 'telefono') {
      val = val.replace(/\D/g, '').slice(0, 10);
    } else if (k === 'cp') {
      val = val.replace(/\D/g, '').slice(0, 5);
    }
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
      setErrors((prev) => ({ ...prev, submit: err.message || 'Error al guardar cliente' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal-content cli-form-modal" onSubmit={submit} noValidate>
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: 16 }}>
          <div className="modal-title-group">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B132B' }}>
              {editando ? 'Modificar cliente' : 'Agregar cliente'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: 4 }}>
              {editando
                ? 'Actualiza los datos del cliente. El identificador no se puede cambiar.'
                : 'Registra un nuevo cliente. Se creará con estatus Activo.'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errors.submit && (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              <AlertCircle size={16} />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* En modo edición: ID de cliente y Switch de estatus */}
          {editando && (
            <div className="cli-grid">
              <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  ID DE CLIENTE
                </label>
                <input
                  className="form-input"
                  value={cliente.codigo || `C-${String(cliente.id).padStart(4, '0')}`}
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

          {/* Sección: Datos personales */}
          <div className="cli-sec">Datos personales</div>
          <div className="cli-grid">
            <div className="form-group cli-span" style={{ '--span': 2, marginBottom: 0 }}>
              <label className="form-label">
                NOMBRE(S) <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.nombre ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.nombre}
                onChange={set('nombre')}
                placeholder="Nombre"
                autoFocus
              />
              {errors.nombre && <div className="cli-err"><AlertCircle size={12} />{errors.nombre}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 2, marginBottom: 0 }}>
              <label className="form-label">
                APELLIDO PATERNO <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.apellidoPaterno ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.apellidoPaterno}
                onChange={set('apellidoPaterno')}
                placeholder="Apellido paterno"
              />
              {errors.apellidoPaterno && <div className="cli-err"><AlertCircle size={12} />{errors.apellidoPaterno}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 2, marginBottom: 0 }}>
              <label className="form-label">APELLIDO MATERNO</label>
              <input
                className="form-input"
                value={form.apellidoMaterno}
                onChange={set('apellidoMaterno')}
                placeholder="Apellido materno"
              />
            </div>
          </div>

          {/* Sección: Contacto */}
          <div className="cli-sec">Contacto</div>
          <div className="cli-grid">
            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">
                TELÉFONO <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <div className="input-with-icon">
                <Phone className="input-icon" size={17} />
                <input
                  className="form-input"
                  style={errors.telefono ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                  value={form.telefono}
                  onChange={set('telefono')}
                  placeholder="10 dígitos"
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
              {errors.telefono && <div className="cli-err"><AlertCircle size={12} />{errors.telefono}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">
                CORREO <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={17} />
                <input
                  className="form-input"
                  type="email"
                  style={errors.correo ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                  value={form.correo}
                  onChange={set('correo')}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              {errors.correo && <div className="cli-err"><AlertCircle size={12} />{errors.correo}</div>}
            </div>
          </div>

          {/* Sección: Domicilio */}
          <div className="cli-sec">Domicilio</div>
          <div className="cli-grid">
            <div className="form-group cli-span" style={{ '--span': 4, marginBottom: 0 }}>
              <label className="form-label">
                CALLE <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.calle ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.calle}
                onChange={set('calle')}
                placeholder="Calle"
              />
              {errors.calle && <div className="cli-err"><AlertCircle size={12} />{errors.calle}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 2, marginBottom: 0 }}>
              <label className="form-label">
                NÚM. EXTERIOR <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.numExterior ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.numExterior}
                onChange={set('numExterior')}
                placeholder="Núm. ext."
              />
              {errors.numExterior && <div className="cli-err"><AlertCircle size={12} />{errors.numExterior}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">
                COLONIA <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.colonia ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.colonia}
                onChange={set('colonia')}
                placeholder="Colonia"
              />
              {errors.colonia && <div className="cli-err"><AlertCircle size={12} />{errors.colonia}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">
                CÓDIGO POSTAL <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.cp ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.cp}
                onChange={set('cp')}
                placeholder="5 dígitos"
                maxLength={5}
                inputMode="numeric"
              />
              {errors.cp && <div className="cli-err"><AlertCircle size={12} />{errors.cp}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">
                CIUDAD <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <input
                className="form-input"
                style={errors.ciudad ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.ciudad}
                onChange={set('ciudad')}
                placeholder="Selecciona una ciudad"
              />
              {errors.ciudad && <div className="cli-err"><AlertCircle size={12} />{errors.ciudad}</div>}
            </div>

            <div className="form-group cli-span" style={{ '--span': 3, marginBottom: 0 }}>
              <label className="form-label">
                ESTADO <span style={{ color: '#C2362F' }}>*</span>
              </label>
              <select
                className="form-select"
                style={errors.estado ? { borderColor: '#C2362F', background: '#FCEDEC' } : undefined}
                value={form.estado}
                onChange={set('estado')}
              >
                <option value="">Selecciona un estado</option>
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.estado && <div className="cli-err"><AlertCircle size={12} />{errors.estado}</div>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #E4E8F5', paddingTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {!editando && <Plus size={16} />}
            {editando ? 'Guardar cambios' : 'Guardar cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}


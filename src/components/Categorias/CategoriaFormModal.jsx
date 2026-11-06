import React, { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { MAX_NOMBRE } from './constants';

const VACIO = { nombre: '', descripcion: '' };

function validar(f) {
  const e = {};
  const nombre = f.nombre?.trim();
  if (!nombre) e.nombre = 'El nombre de la categoría es obligatorio.';
  else if (nombre.length > MAX_NOMBRE) e.nombre = `El nombre no puede tener más de ${MAX_NOMBRE} caracteres.`;
  return e;
}

export default function CategoriaFormModal({ categoria, onClose, onSave }) {
  const editando = Boolean(categoria);
  const [form, setForm] = useState(categoria ? { ...VACIO, ...categoria } : VACIO);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (ev) => setForm((prev) => ({ ...prev, [k]: ev.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validar(form);
    if (Object.keys(e).length > 0) {
      setError(Object.values(e)[0]);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() });
    } catch (err) {
      setError(err.message || 'Error al guardar la categoría.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>{editando ? 'Modificar categoría' : 'Agregar categoría'}</h3>
            <p>
              {editando
                ? 'Actualiza el nombre y la descripción. El identificador no se puede cambiar.'
                : 'Registra una nueva categoría para clasificar productos y servicios.'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} />
                <div style={{ flex: 1 }}>{error}</div>
              </div>
            )}

            {editando && (
              <div className="form-group">
                <label className="form-label">ID DE CATEGORÍA</label>
                <input
                  className="form-input"
                  value={categoria.codigo}
                  disabled
                  style={{ fontWeight: 700, color: '#1e3a8a' }}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">NOMBRE</label>
              <input
                className="form-input"
                placeholder="Ej. Mercancía"
                value={form.nombre}
                maxLength={MAX_NOMBRE}
                onChange={set('nombre')}
                autoFocus
              />
              <div className="form-helper">Debe ser único. Máximo {MAX_NOMBRE} caracteres.</div>
            </div>

            <div className="form-group">
              <label className="form-label">DESCRIPCIÓN</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe para qué se usa esta categoría"
                value={form.descripcion}
                onChange={set('descripcion')}
                style={{ resize: 'vertical', minHeight: 84, fontFamily: 'inherit' }}
              />
              <div className="form-helper">Opcional.</div>
            </div>

            {!editando && (
              <div className="modal-alert-green">
                <CheckCircle2 size={18} color="#059669" />
                <span>La categoría se creará con estatus Activa.</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <RotateCw className="animate-spin" size={16} /> : (!editando && <Plus size={16} />)}
              {editando ? 'Guardar cambios' : 'Guardar categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

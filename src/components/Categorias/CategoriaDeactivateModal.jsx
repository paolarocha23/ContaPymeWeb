import React, { useState } from 'react';
import { Power, RotateCw } from 'lucide-react';

export default function CategoriaDeactivateModal({ categoria, onClose, onConfirm }) {
  const [enviando, setEnviando] = useState(false);
  if (!categoria) return null;

  const desactivando = categoria.activo;

  const confirmar = async () => {
    setEnviando(true);
    try {
      await onConfirm(categoria);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 440, textAlign: 'center' }}>
        <div className="modal-body" style={{ padding: '36px 32px 28px', alignItems: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            backgroundColor: desactivando ? '#fef3c7' : '#ecfdf5',
            color: desactivando ? '#d97706' : '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16
          }}>
            <Power size={32} />
          </div>

          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
            {desactivando ? `¿Desactivar "${categoria.nombre}"?` : `¿Activar "${categoria.nombre}"?`}
          </h3>

          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
            {desactivando
              ? 'Solo se puede desactivar si no tiene productos o servicios asociados. Podrás activarla de nuevo cuando quieras.'
              : 'La categoría volverá a estar activa.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, width: '100%' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1, padding: '10px 20px' }}
              onClick={onClose}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={confirmar}
              disabled={enviando}
            >
              {enviando ? <RotateCw className="animate-spin" size={16} /> : <Power size={16} />}
              {desactivando ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

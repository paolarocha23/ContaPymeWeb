import React, { useState } from 'react';
import { Power, X } from 'lucide-react';

export default function ProveedorDeactivateModal({ proveedor, onClose, onConfirm }) {
  const [enviando, setEnviando] = useState(false);
  if (!proveedor) return null;

  const desactivando = proveedor.activo;
  const nombre = proveedor.nombreEmpresa;

  const confirmar = async () => {
    setEnviando(true);
    try {
      await onConfirm(proveedor);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content cli-deactivate-modal"
        style={{ textAlign: 'center', position: 'relative' }}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: 18, right: 18 }}
        >
          <X size={16} />
        </button>

        <div
          style={{
            width: 68, height: 68, borderRadius: '50%',
            backgroundColor: desactivando ? '#FDF3E1' : '#E8ECFB',
            color: desactivando ? '#B26A00' : '#142A95',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}
        >
          <Power size={32} />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B132B', marginBottom: 10 }}>
          {desactivando ? `¿Desactivar a ${nombre}?` : `¿Activar a ${nombre}?`}
        </h3>

        <p style={{ fontSize: '0.9rem', color: '#6B7280', lineHeight: 1.5, marginBottom: 28 }}>
          {desactivando
            ? 'Un proveedor inactivo no podrá seleccionarse en nuevas compras. Solo se puede desactivar si no tiene compras asociadas.'
            : 'El proveedor volverá a estar activo y podrá seleccionarse en nuevas compras.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={enviando}
            style={{ minWidth: 120, borderRadius: 9999, padding: '10px 24px', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={desactivando ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={confirmar}
            disabled={enviando}
            style={{
              minWidth: 140, borderRadius: 9999, padding: '10px 24px', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <Power size={16} />
            {desactivando ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}
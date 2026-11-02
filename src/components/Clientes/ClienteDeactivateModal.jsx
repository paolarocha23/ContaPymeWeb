import React from 'react';
import { Power, X } from 'lucide-react';
import { nombreCompleto } from './helpers';

export default function ClienteDeactivateModal({ cliente, onClose, onConfirm }) {
  if (!cliente) return null;

  const desactivando = cliente.activo;
  const nombre = nombreCompleto(cliente);

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content cli-deactivate-modal"
        style={{
          maxWidth: '480px',
          padding: '36px 32px 28px',
          textAlign: 'center',
          borderRadius: '24px',
          boxShadow: '0 24px 48px -12px rgba(11, 19, 43, 0.25)',
          position: 'relative'
        }}
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

        {/* Ícono circular arriba al centro */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: desactivando ? '#FDF3E1' : '#E8ECFB',
            color: desactivando ? '#B26A00' : '#142A95',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: desactivando
              ? '0 8px 16px -4px rgba(178, 106, 0, 0.15)'
              : '0 8px 16px -4px rgba(20, 42, 149, 0.15)'
          }}
        >
          <Power size={32} />
        </div>

        {/* Título */}
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0B132B',
            marginBottom: '10px'
          }}
        >
          {desactivando ? `¿Desactivar a ${nombre}?` : `¿Activar a ${nombre}?`}
        </h3>

        {/* Subtítulo / Descripción */}
        <p
          style={{
            fontSize: '0.9rem',
            color: '#6B7280',
            lineHeight: 1.5,
            marginBottom: '28px'
          }}
        >
          {desactivando
            ? 'Un cliente inactivo no podrá seleccionarse en nuevas ventas, pero conservará todo su historial de operaciones.'
            : 'El cliente volverá a estar activo y podrá seleccionarse en nuevas ventas conservando todo su historial.'}
        </p>

        {/* Botones de acción */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              minWidth: '120px',
              borderRadius: '9999px',
              padding: '10px 24px',
              fontWeight: 600
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={desactivando ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => onConfirm(cliente)}
            style={{
              minWidth: '140px',
              borderRadius: '9999px',
              padding: '10px 24px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
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


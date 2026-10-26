import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

export default function InactivityModal({ show, secondsLeft, onKeepAlive, onLogoutNow }) {
  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div className="modal-body" style={{ padding: '32px 24px', alignItems: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '2px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            marginBottom: '8px'
          }}>
            <Clock size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', color: '#f8fafc' }}>
            ¿Sigues ahí?
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Tu sesión está a punto de cerrarse automáticamente por inactividad para proteger tus datos.
          </p>

          <div style={{
            fontSize: '2.5rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: '700',
            color: secondsLeft <= 15 ? '#f43f5e' : '#f59e0b',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '10px 24px',
            borderRadius: '12px',
            border: '1px solid var(--border-medium)',
            margin: '8px 0'
          }}>
            00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', marginTop: '12px' }}>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              onClick={onKeepAlive}
            >
              <CheckCircle2 size={18} />
              Continuar Sesión
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '10px' }}
              onClick={onLogoutNow}
            >
              <LogOut size={16} />
              Cerrar Sesión Ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

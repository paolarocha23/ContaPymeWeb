import React, { useState } from 'react';
import { Mail, ArrowRight, X, AlertCircle, CheckCircle2, RotateCw, Key } from 'lucide-react';
import { api } from '../services/api';

export default function ForgotPasswordModal({ onClose, onGoToReset }) {
  const [identificador, setIdentificador] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identificador.trim()) {
      setError('Introduce tu correo o nombre de usuario.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.forgotPassword(identificador.trim());
      setSuccessMsg(res.message);
      if (res.devToken) {
        setDevToken(res.devToken);
      }
    } catch (err) {
      setError(err.message || 'Error al solicitar recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Key size={20} color="#6366f1" />
            Recuperar Contraseña
          </h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Ingresa el correo electrónico o nombre de usuario registrado en tu cuenta. Te enviaremos un token y enlace seguro para restablecer tu contraseña.
            </p>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success">
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <div>{successMsg}</div>
              </div>
            )}

            {devToken && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px dashed #10b981',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#6ee7b7'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Token de desarrollo generado:</div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: '#f8fafc' }}>{devToken}</div>
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  style={{ marginTop: '8px', width: '100%' }}
                  onClick={() => onGoToReset(devToken)}
                >
                  Restablecer Contraseña Ahora con este Token &rarr;
                </button>
              </div>
            )}

            {!successMsg && (
              <div className="form-group">
                <label className="form-label">Correo o Nombre de Usuario</label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej. usuario@contapyme.com o admin"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cerrar
            </button>
            {!successMsg ? (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <RotateCw className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                Enviar Instrucciones
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => onGoToReset(devToken || '')}
              >
                Ingresar Token
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

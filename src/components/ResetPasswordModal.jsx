import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, CheckCircle2, RotateCw, KeyRound } from 'lucide-react';
import { api } from '../services/api';

export default function ResetPasswordModal({ initialToken = '', onClose, onCompleted }) {
  const [token, setToken] = useState(initialToken);
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Debes ingresar el token de recuperación.');
      return;
    }
    if (nuevaContrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.resetPassword(token.trim(), nuevaContrasena);
      setSuccess(true);
      setTimeout(() => {
        if (onCompleted) onCompleted();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <KeyRound size={20} color="#6366f1" />
            Restablecer Contraseña
          </h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>{error}</div>
              </div>
            )}

            {success ? (
              <div className="alert alert-success">
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>¡Contraseña actualizada con éxito!</strong>
                  <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                    Redirigiéndote al inicio de sesión...
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Token de Recuperación</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pega el código o token recibido"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    disabled={loading}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nueva Contraseña</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Mínimo 6 caracteres"
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="input-action-btn"
                      onClick={() => setShowPwd(!showPwd)}
                    >
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmar Nueva Contraseña</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Repite la nueva contraseña"
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            {!success && (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <RotateCw className="animate-spin" size={16} /> : null}
                Guardar Nueva Contraseña
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

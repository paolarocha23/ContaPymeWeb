import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, CheckCircle2, RotateCw, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contrasenaActual || !nuevaContrasena) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (nuevaContrasena.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    if (contrasenaActual === nuevaContrasena) {
      setError('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.changePassword(contrasenaActual, nuevaContrasena);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Lock size={20} color="#6366f1" />
            Cambiar Contraseña
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
                  <strong>¡Contraseña cambiada con éxito!</strong>
                  <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                    Tu nueva contraseña ya se encuentra activa.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Contraseña Actual</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Introduce tu contraseña actual"
                      value={contrasenaActual}
                      onChange={(e) => setContrasenaActual(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="input-action-btn"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nueva Contraseña</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showNew ? 'text' : 'password'}
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
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmar Nueva Contraseña</label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showNew ? 'text' : 'password'}
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
                Actualizar Contraseña
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

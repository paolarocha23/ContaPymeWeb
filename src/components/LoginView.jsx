import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, RotateCw, Key } from 'lucide-react';
import { api } from '../services/api';
import './LoginView.css';

export default function LoginView({ onRequire2FA, onOpenForgot, onOpenReset, sessionExpiredMsg }) {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(sessionExpiredMsg || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombreUsuario.trim() || !contrasena) {
      setError('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.login(nombreUsuario.trim(), contrasena);
      if (res.requires2FA) {
        onRequire2FA({
          tempToken: res.tempToken,
          emailMasked: res.emailMasked,
          devCode: res.devCode
        });
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setNombreUsuario('admin');
    setContrasena('Admin1234!');
    setError('');
  };

  return (
    <div className="login-split-page">
      <div className="login-hero-side">
        <div className="login-hero-overlay-brand">
          <img className="login-brand-logo login-brand-logo-light" src="/img/logo-blanco.png" alt="ContaPyme" />
        </div>
        <img
          src="/img/login-imagen.png"
          alt="ContaPyme - Finanzas y Contabilidad para PyMEs"
          className="login-hero-image"
        />
      </div>

      <div className="login-form-side">
        <div className="login-form-inner">
          <div className="login-form-brand">
            <img className="login-brand-logo login-brand-logo-dark" src="/img/logo-azul.png" alt="ContaPyme" />
          </div>

          <div className="login-form-heading">
            <h1>Iniciar sesión</h1>
            <p>Ingresa tus credenciales para acceder a tu cuenta.</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group login-field">
              <label className="form-label">USUARIO</label>
              <div className="input-with-icon">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group login-field login-field-password">
              <label className="form-label">CONTRASEÑA</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Ingresa tu contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="button" className="login-forgot" onClick={onOpenForgot}>
              ¿Olvidaste tu contraseña?
            </button>

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? (
                <>
                  <RotateCw className="animate-spin" size={18} />
                  Verificando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="login-contact">
            ¿Aún no tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => alert('Para adquirir una licencia o crear una nueva empresa en ContaPyme, por favor comunícate a soporte@contapyme.com o llama al 800-CONTAPYME.')}
            >
              Contáctanos
            </button>
          </div>

          <div className="login-reset-wrap">
            <button type="button" className="login-reset-link" onClick={onOpenReset}>
              <Key size={13} />
              ¿Ya tienes token de recuperación? Restablecer aquí
            </button>
          </div>

          <div className="login-demo">
            <div>
              <strong>Admin demo:</strong>{' '}
              <code>admin</code> / <code>Admin1234!</code>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#e2e8f0', color: '#0f172a', padding: '4px 10px', fontSize: '0.72rem' }}
              onClick={fillAdmin}
            >
              Autocompletar
            </button>
          </div>
        </div>

        <div className="login-legal">Aviso de privacidad · Términos y condiciones</div>
      </div>
    </div>
  );
}

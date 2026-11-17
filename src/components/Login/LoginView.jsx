import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, RotateCw } from 'lucide-react';
import { api } from '../../services/api';
import './LoginView.css';

export default function LoginView({ onRequire2FA, onOpenForgot, sessionExpiredMsg }) {
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
      {/* ───── Imagen fija ───── */}
      <div className="login-hero-side">
        <img
          src="/img/login-imagen.png"
          alt="ContaPyme - Administración y contabilidad para PyMEs"
          className="login-hero-image"
        />
        <img
          className="login-brand-light"
          src="/img/logo-blanco.png"
          alt="ContaPyme"
        />
      </div>

      {/* ───── Formulario ───── */}
      <div className="login-form-side">
        <div className="login-form-inner">
          <div className="login-form-brand">
            <img className="login-brand-dark" src="/img/logo-azul.png" alt="ContaPyme" />
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
            <div className="login-field">
              <label className="login-label">USUARIO</label>
              <div className="login-input-wrap">
                <span className="login-ico"><User size={18} /></span>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-label">CONTRASEÑA</label>
              <div className="login-input-wrap">
                <span className="login-ico"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Ingresa tu contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-eye"
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

            <button type="submit" className="login-submit" disabled={loading}>
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

          {/* Demo: quitar antes de producción */}
          <div className="login-demo">
            <div>
              <strong>Admin demo:</strong>{' '}
              <code>admin</code> / <code>Admin1234!</code>
            </div>
            <button type="button" className="login-demo-btn" onClick={fillAdmin}>
              Autocompletar
            </button>
          </div>
        </div>

        <div className="login-legal">Aviso de privacidad · Términos y condiciones</div>
      </div>
    </div>
  );
}
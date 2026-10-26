import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, RotateCw, Key } from 'lucide-react';
import { api } from '../services/api';
import ContaPymeLogo from './ContaPymeLogo';

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
      {/* Lado Izquierdo: Banner Visual de Laptop y Métricas Financieras */}
      <div className="login-hero-side">
        <div className="login-hero-overlay-brand">
          <ContaPymeLogo variant="light" size="normal" showSubtitle={true} />
        </div>
        <img
          src="/login-hero.png"
          alt="ContaPyme - Finanzas y Contabilidad para PyMEs"
          className="login-hero-image"
        />
      </div>

      {/* Lado Derecho: Formulario de Inicio de Sesión */}
      <div className="login-form-side">
        <div style={{ width: '100%', maxWidth: '420px', margin: 'auto' }}>
          {/* Logo Central */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <ContaPymeLogo variant="dark" size="large" showSubtitle={true} />
          </div>

          {/* Título y Subtítulo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '6px'
            }}>
              Iniciar sesión
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Ingresa tus credenciales para acceder a tu cuenta.
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            {/* Campo USUARIO */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ color: '#1e3a8a', letterSpacing: '0.04em' }}>
                USUARIO
              </label>
              <div className="input-with-icon">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderRadius: '14px',
                    padding: '13px 16px 13px 44px'
                  }}
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {/* Campo CONTRASEÑA */}
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" style={{ color: '#1e3a8a', letterSpacing: '0.04em' }}>
                CONTRASEÑA
              </label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderRadius: '14px',
                    padding: '13px 44px 13px 44px'
                  }}
                  placeholder="Ingresa tu contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                  disabled={loading}
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

            {/* Enlace Olvidaste tu contraseña */}
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={onOpenForgot}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#183b9c',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón Iniciar sesión */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                borderRadius: '14px',
                fontWeight: '700'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RotateCw className="animate-spin" size={18} />
                  Verificando...
                </>
              ) : (
                <>
                  Iniciar sesión <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Enlace Contáctanos */}
          <div style={{
            textAlign: 'center',
            marginTop: '28px',
            fontSize: '0.88rem',
            color: '#64748b'
          }}>
            ¿Aún no tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => alert('Para adquirir una licencia o crear una nueva empresa en ContaPyme, por favor comunícate a soporte@contapyme.com o llama al 800-CONTAPYME.')}
              style={{
                background: 'none',
                border: 'none',
                color: '#183b9c',
                fontWeight: '700',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Contáctanos
            </button>
          </div>

          {/* Enlace para restablecer con token */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onOpenReset}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Key size={13} />
              ¿Ya tienes token de recuperación? Restablecer aquí
            </button>
          </div>

          {/* Acceso Rápido de Prueba (Admin) */}
          <div style={{
            marginTop: '24px',
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            fontSize: '0.78rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: '600', color: '#334155' }}>Admin demo:</span>{' '}
              <code style={{ color: '#183b9c' }}>admin</code> / <code style={{ color: '#183b9c' }}>Admin1234!</code>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: '#e2e8f0',
                color: '#0f172a',
                padding: '4px 10px',
                fontSize: '0.72rem'
              }}
              onClick={fillAdmin}
            >
              Autocompletar
            </button>
          </div>
        </div>

        {/* Footer Legal */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          fontSize: '0.76rem',
          color: '#94a3b8'
        }}>
          Aviso de privacidad · Términos y condiciones
        </div>
      </div>
    </div>
  );
}

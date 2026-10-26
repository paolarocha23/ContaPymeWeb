import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowRight, RotateCw, AlertCircle, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { api } from '../services/api';

export default function TwoFactorModal({ 
  tempToken, 
  emailMasked, 
  devCode, 
  onSuccess, 
  onCancel 
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(45);
  const [currentDevCode, setCurrentDevCode] = useState(devCode);
  const [currentToken, setCurrentToken] = useState(tempToken);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Foco automático en el primer input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Temporizador para el botón de reenvío
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');

    // Avanzar al siguiente input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Si completó los 6 dígitos, enviar automáticamente
    if (newDigits.every(d => d !== '')) {
      submitCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newDigits = pastedData.split('');
      setDigits(newDigits);
      if (inputRefs.current[5]) inputRefs.current[5].focus();
      submitCode(pastedData);
    }
  };

  const submitCode = async (codeToSubmit) => {
    const code = codeToSubmit || digits.join('');
    if (code.length < 6) {
      setError('Por favor, ingresa los 6 dígitos del código.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.verify2FA(currentToken, code);
      api.setToken(response.token);
      api.setUser(response.user);
      onSuccess(response.user);
    } catch (err) {
      setError(err.message || 'Código incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.resend2FA(currentToken);
      if (res.devCode) {
        setCurrentDevCode(res.devCode);
      }
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message || 'Error al reenviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const fillDevCode = () => {
    if (currentDevCode && currentDevCode.length === 6) {
      const splitted = currentDevCode.split('');
      setDigits(splitted);
      submitCode(currentDevCode);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
          <button 
            type="button" 
            className="btn-icon" 
            style={{ position: 'absolute', left: '16px' }} 
            onClick={onCancel}
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h3 className="modal-title" style={{ justifyContent: 'center' }}>
              <ShieldCheck size={22} color="#6366f1" />
              Verificación en 2 Pasos
            </h3>
          </div>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <Mail size={28} />
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: '1.5' }}>
            Hemos enviado un código de seguridad de 6 dígitos al correo registrado:
          </p>

          <div style={{
            display: 'inline-block',
            fontWeight: '600',
            color: '#f8fafc',
            background: 'var(--bg-card-hover)',
            padding: '4px 12px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            border: '1px solid var(--border-medium)'
          }}>
            {emailMasked}
          </div>

          {currentDevCode && (
            <div 
              onClick={fillDevCode}
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px dashed #10b981',
                borderRadius: '8px',
                color: '#6ee7b7',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              title="Haz clic para autocompletar código de desarrollo"
            >
              <KeyRound size={15} />
              <span>Código de desarrollo: <strong>{currentDevCode}</strong> (Clic para aplicar)</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginTop: '14px', textAlign: 'left' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* 6 Casillas de entrada de dígitos */}
          <div className="otp-container" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={el => inputRefs.current[idx] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="otp-digit-input"
                disabled={loading}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            onClick={() => submitCode()}
            disabled={loading || digits.some(d => d === '')}
          >
            {loading ? (
              <>
                <RotateCw className="animate-spin" size={18} />
                Verificando...
              </>
            ) : (
              <>
                Confirmar y Entrar
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#94a3b8' }}>
            ¿No recibiste el correo?{' '}
            {resendCooldown > 0 ? (
              <span style={{ color: '#64748b' }}>
                Reenviar en {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Reenviar código
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

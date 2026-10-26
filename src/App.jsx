import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LoginView from './components/LoginView';
import TwoFactorModal from './components/TwoFactorModal';
import ForgotPasswordModal from './components/ForgotPasswordModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import UserCatalog from './components/UserCatalog';
import RoleManagement from './components/RoleManagement';
import BitacoraView from './components/BitacoraView';
import InactivityModal from './components/InactivityModal';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(() => api.getUser());
  const [currentTab, setCurrentTab] = useState('usuarios'); // 'usuarios' | 'roles' | 'bitacora'
  const [twoFactorData, setTwoFactorData] = useState(null); // { tempToken, emailMasked, devCode }
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetModalToken, setResetModalToken] = useState(null); // null or token string
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState('');

  const isAuthenticated = Boolean(user && api.getToken());

  // Manejo de Cierre de Sesión Automático por Inactividad
  const handleInactivityTimeout = useCallback(async () => {
    try {
      await api.logout('inactividad');
    } catch (e) {
      // Ignorar error si ya expiró el token
    }
    setUser(null);
    setSessionExpiredNotice('Tu sesión se cerró automáticamente debido a 15 minutos de inactividad.');
  }, []);

  // Hook de inactividad
  const { secondsRemaining, showWarning, resetTimer } = useInactivityTimer({
    isAuthenticated,
    onTimeout: handleInactivityTimeout,
    timeoutMinutes: 15,
    warningSeconds: 60
  });

  // Escuchar si la API rechaza por sesión expirada
  useEffect(() => {
    const handleAuthExpired = (e) => {
      setUser(null);
      setSessionExpiredNotice(e.detail || 'Tu sesión ha expirado o tu usuario fue desactivado.');
    };
    window.addEventListener('contapyme_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('contapyme_auth_expired', handleAuthExpired);
  }, []);

  // Revisar si viene ?reset_token= en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetModalToken(token);
      // Limpiar query param de la URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Cierre de Sesión Manual
  const handleManualLogout = async () => {
    if (window.confirm('¿Deseas cerrar tu sesión?')) {
      try {
        await api.logout('manual');
      } catch (e) {
        // Ignorar
      }
      setUser(null);
      setSessionExpiredNotice('');
    }
  };

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setTwoFactorData(null);
    setSessionExpiredNotice('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isAuthenticated ? (
        <>
          <LoginView
            onRequire2FA={(data) => setTwoFactorData(data)}
            onOpenForgot={() => setShowForgotModal(true)}
            onOpenReset={() => setResetModalToken('')}
            sessionExpiredMsg={sessionExpiredNotice}
          />

          {twoFactorData && (
            <TwoFactorModal
              tempToken={twoFactorData.tempToken}
              emailMasked={twoFactorData.emailMasked}
              devCode={twoFactorData.devCode}
              onSuccess={handleLoginSuccess}
              onCancel={() => setTwoFactorData(null)}
            />
          )}

          {showForgotModal && (
            <ForgotPasswordModal
              onClose={() => setShowForgotModal(false)}
              onGoToReset={(token) => {
                setShowForgotModal(false);
                setResetModalToken(token || '');
              }}
            />
          )}

          {resetModalToken !== null && (
            <ResetPasswordModal
              initialToken={resetModalToken}
              onClose={() => setResetModalToken(null)}
              onCompleted={() => setResetModalToken(null)}
            />
          )}
        </>
      ) : (
        <>
          <Navbar
            user={user}
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
            onManualLogout={handleManualLogout}
          />

          <main style={{ flex: 1, paddingBottom: '40px' }}>
            {currentTab === 'usuarios' && (
              <UserCatalog currentAdminUser={user} />
            )}

            {currentTab === 'roles' && (
              <RoleManagement />
            )}

            {currentTab === 'bitacora' && (
              <BitacoraView />
            )}
          </main>

          {showChangePasswordModal && (
            <ChangePasswordModal
              onClose={() => setShowChangePasswordModal(false)}
              onSuccess={() => {
                alert('Contraseña actualizada con éxito');
              }}
            />
          )}

          {/* Modal de Advertencia de Inactividad (últimos 60s) */}
          <InactivityModal
            show={showWarning}
            secondsLeft={secondsRemaining}
            onKeepAlive={resetTimer}
            onLogoutNow={handleInactivityTimeout}
          />
        </>
      )}
    </div>
  );
}

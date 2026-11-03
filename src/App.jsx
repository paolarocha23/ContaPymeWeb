import React, { useState, useEffect, useCallback } from 'react';
import LoginView from './components/Login/LoginView';
import TwoFactorModal from './components/Login/TwoFactorModal';
import ForgotPasswordModal from './components/Login/ForgotPasswordModal';
import ResetPasswordModal from './components/Login/ResetPasswordModal';
import ChangePasswordModal from './components/Login/ChangePasswordModal';
import UserCatalog from './components/UserCatalog';
import RoleManagement from './components/RoleManagement';
import BitacoraView from './components/BitacoraView';
import InactivityModal from './components/InactivityModal';
import ClientesView from './components/Clientes/ClientesView';
import ProveedoresView from './components/Proveedores/ProveedoresView';
import Layout from './components/Layuot/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import CuentasPorPagarView from './components/CuentasPorPagar/CuentasPorPagarView';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(() => api.getUser());
  const [currentTab, setCurrentTab] = useState('usuarios');
  const [activeView, setActiveView] = useState('dashboard');
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
    setActiveView('dashboard');
    setTwoFactorData(null);
    setSessionExpiredNotice('');
  };

  const handleNavigate = (view) => {
    if (['usuarios', 'roles', 'bitacora'].includes(view)) {
      setCurrentTab(view);
      setActiveView('admin');
      return;
    }

    setActiveView(view);
  };

  const firstName = user?.nombre_completo?.split(' ')[0] || user?.nombre_usuario || 'Laura';

  const pageTitles = {
    dashboard: `Hola, ${firstName}`,
    admin: 'Usuarios y roles',
    reports: 'Reportes',
    ventas: 'Ventas',
    compras: 'Compras',
    inventario: 'Inventario',
    contactos: 'Contactos',
    clientes: 'Contactos',
    proveedores: 'Contactos',
    finanzas: 'Finanzas',
  };

  const subtitles = {
    dashboard: 'Resumen de las operaciones de ContaPyme',
    clientes: 'Catálogo de clientes',
    proveedores: 'Catálogo de proveedores',
    contactos: 'Catálogo de clientes',
  };

  // Vistas que ya tienen pantalla propia (el resto muestra el placeholder)
  const isClientes = activeView === 'clientes' || activeView === 'contactos';
  const isProveedores = activeView === 'proveedores';
  const isCuentasPorPagar = activeView === 'cxp';

  const hasOwnView =
    activeView === 'dashboard' ||
    activeView === 'admin' ||
    isClientes || isProveedores ||
    isCuentasPorPagar;

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
          <Layout
            user={user}
            activeView={activeView}
            pageTitle={pageTitles[activeView] || pageTitles.dashboard}
            subtitle={subtitles[activeView] || 'Administra tu operación desde un solo lugar'}
            onNavigate={handleNavigate}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
            onManualLogout={handleManualLogout}
          >
            {activeView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}

            {activeView === 'admin' && (
              <section className="cpy-admin-view">
                <nav className="cpy-admin-tabs" aria-label="Administración">
                  <button className={currentTab === 'usuarios' ? 'is-active' : ''} onClick={() => setCurrentTab('usuarios')}>Usuarios</button>
                  <button className={currentTab === 'roles' ? 'is-active' : ''} onClick={() => setCurrentTab('roles')}>Roles</button>
                  <button className={currentTab === 'bitacora' ? 'is-active' : ''} onClick={() => setCurrentTab('bitacora')}>Bitácora</button>
                </nav>
                {currentTab === 'usuarios' && <UserCatalog currentAdminUser={user} />}
                {currentTab === 'roles' && <RoleManagement />}
                {currentTab === 'bitacora' && <BitacoraView />}
              </section>
            )}

            {isClientes && <ClientesView />}
            {isProveedores && <ProveedoresView />}
            {isCuentasPorPagar && <CuentasPorPagarView />}

            {!hasOwnView && (
              <section className="cpy-module-placeholder">
                <span className="cpy-module-kicker">CONTAPYME</span>
                <h2>{pageTitles[activeView] || 'Módulo'}</h2>
                <p>Este espacio está listo para integrar las funciones de este módulo.</p>
                <button type="button" onClick={() => setActiveView('dashboard')}>Volver al dashboard</button>
              </section>
            )}
          </Layout>

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
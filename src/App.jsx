
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
import CategoriasView from './components/Categorias/CategoriasView';
import ProductosView from './components/ProductosyServicio/ProductosView';

import Layout from './components/Layuot/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import CuentasPorPagarView from './components/CuentasPorPagar/CuentasPorPagarView';
import GastosView from './components/Gastos/GastosView';

import InventarioView from './components/Inventario/InventarioView';
import IngresosView from './components/Ingresos/IngresosView';


import { useInactivityTimer } from './hooks/useInactivityTimer';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(() => api.getUser());
  const [currentTab, setCurrentTab] = useState('usuarios');
  const [activeView, setActiveView] = useState('dashboard');

  const [twoFactorData, setTwoFactorData] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetModalToken, setResetModalToken] = useState(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState('');

  const isAuthenticated = Boolean(user && api.getToken());

  // Cierre automático de sesión por inactividad
  const handleInactivityTimeout = useCallback(async () => {
    try {
      await api.logout('inactividad');
    } catch (e) {
      // Ignorar error si el token ya expiró
    }

    setUser(null);
    setSessionExpiredNotice(
      'Tu sesión se cerró automáticamente debido a 15 minutos de inactividad.'
    );
  }, []);

  // Hook de control de inactividad
  const {
    secondsRemaining,
    showWarning,
    resetTimer
  } = useInactivityTimer({
    isAuthenticated,
    onTimeout: handleInactivityTimeout,
    timeoutMinutes: 15,
    warningSeconds: 60
  });

  // Escuchar expiración de sesión
  useEffect(() => {
    const handleAuthExpired = (e) => {
      setUser(null);
      setSessionExpiredNotice(
        e.detail || 'Tu sesión ha expirado o tu usuario fue desactivado.'
      );
    };

    window.addEventListener('contapyme_auth_expired', handleAuthExpired);

    return () => {
      window.removeEventListener('contapyme_auth_expired', handleAuthExpired);
    };
  }, []);

  // Revisar si viene reset_token en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');

    if (token) {
      setResetModalToken(token);
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  // Cierre de sesión manual
  const handleManualLogout = async () => {
    if (window.confirm('¿Deseas cerrar tu sesión?')) {
      try {
        await api.logout('manual');
      } catch (e) {
        // Ignorar error
      }

      setUser(null);
      setSessionExpiredNotice('');
    }
  };

  // Inicio de sesión exitoso
  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setActiveView('dashboard');
    setTwoFactorData(null);
    setSessionExpiredNotice('');
  };

  // Navegación
  const handleNavigate = (view) => {
    if (['usuarios', 'roles', 'bitacora'].includes(view)) {
      setCurrentTab(view);
      setActiveView('admin');
      return;
    }

    setActiveView(view);
  };

  const firstName =
    user?.nombre_completo?.split(' ')[0] ||
    user?.nombre_usuario ||
    'Laura';

  // Títulos de las pantallas
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
    categorias: 'Categorías',
    productos: 'Productos y servicios',
    cxp: 'Cuentas por pagar',
    gastos: 'Gastos',
    caja: 'Caja / Efectivo',
    cxc: 'Cuentas por cobrar',
    ingresos: 'Finanzas',

  };

  // Subtítulos de las pantallas
  const subtitles = {
    dashboard: 'Resumen de las operaciones de ContaPyme',
    clientes: 'Catálogo de clientes',
    contactos: 'Catálogo de clientes',
    proveedores: 'Catálogo de proveedores',
    cxp: 'Control de cuentas por pagar',
    gastos: 'Registro y control de gastos',
    categorias: 'Catálogo de categorías',
    productos: 'Catálogo de productos y servicios',
    inventario: 'Existencias y movimientos',
    ingresos: 'Registro y consulta de ingresos',


  };

  // Identificar pantallas con componentes propios
  const isClientes =
    activeView === 'clientes' || activeView === 'contactos';

  const isProveedores = activeView === 'proveedores';
  const isCategorias = activeView === 'categorias';
  const isProductos = activeView === 'productos';
  const isCuentasPorPagar = activeView === 'cxp';
  const isGastos = activeView === 'gastos';

  const hasOwnView =
    activeView === 'dashboard' ||
    activeView === 'admin' ||
    isClientes ||
    isProveedores ||
    isCategorias ||
    isProductos ||
    isCuentasPorPagar ||
    isGastos ||
    activeView === 'categorias' ||
    activeView === 'productos' ||
    activeView === 'inventario' ||
    activeView === 'ingresos' ||
    isClientes || isProveedores ||
    isCuentasPorPagar;
   


  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
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
            subtitle={
              subtitles[activeView] ||
              'Administra tu operación desde un solo lugar'
            }
            onNavigate={handleNavigate}
            onOpenChangePassword={() => setShowChangePasswordModal(true)}
            onManualLogout={handleManualLogout}
          >
            {activeView === 'dashboard' && (
              <Dashboard onNavigate={handleNavigate} />
            )}

            {activeView === 'admin' && (
              <section className="cpy-admin-view">
                <nav
                  className="cpy-admin-tabs"
                  aria-label="Administración"
                >
                  <button
                    className={currentTab === 'usuarios' ? 'is-active' : ''}
                    onClick={() => setCurrentTab('usuarios')}
                  >
                    Usuarios
                  </button>

                  <button
                    className={currentTab === 'roles' ? 'is-active' : ''}
                    onClick={() => setCurrentTab('roles')}
                  >
                    Roles
                  </button>

                  <button
                    className={currentTab === 'bitacora' ? 'is-active' : ''}
                    onClick={() => setCurrentTab('bitacora')}
                  >
                    Bitácora
                  </button>
                </nav>

                {currentTab === 'usuarios' && (
                  <UserCatalog currentAdminUser={user} />
                )}

                {currentTab === 'roles' && <RoleManagement />}

                {currentTab === 'bitacora' && <BitacoraView />}
              </section>
            )}

            {isClientes && <ClientesView />}

            {isProveedores && <ProveedoresView />}

            {isCategorias && <CategoriasView />}

            {isProductos && <ProductosView />}

            {isCuentasPorPagar && <CuentasPorPagarView />}

            {isGastos && <GastosView />}

            {activeView === 'categorias' && <CategoriasView />}
            {activeView === 'productos' && <ProductosView />}
            
            {activeView === 'inventario' && <InventarioView />}
            {activeView === 'ingresos' && <IngresosView />}

            {!hasOwnView && (
              <section className="cpy-module-placeholder">
                <span className="cpy-module-kicker">CONTAPYME</span>

                <h2>{pageTitles[activeView] || 'Módulo'}</h2>

                <p>
                  Este espacio está listo para integrar las funciones de este módulo.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveView('dashboard')}
                >
                  Volver al dashboard
                </button>
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

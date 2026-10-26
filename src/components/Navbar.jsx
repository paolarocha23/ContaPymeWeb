import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  ShieldAlert, 
  ScrollText, 
  Lock, 
  LogOut, 
  UserCircle2, 
  Activity,
  CheckCircle2
} from 'lucide-react';

export default function Navbar({ 
  user, 
  currentTab, 
  onSelectTab, 
  onOpenChangePassword, 
  onManualLogout 
}) {
  const getRoleBadgeClass = (rol) => {
    if (!rol) return 'badge-custom';
    const r = rol.toLowerCase();
    if (r.includes('admin')) return 'badge-admin';
    if (r.includes('encargad')) return 'badge-encargado';
    if (r.includes('vendedor')) return 'badge-vendedor';
    return 'badge-custom';
  };

  return (
    <header style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px var(--indigo-glow)'
            }}>
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.15rem', color: '#f8fafc', letterSpacing: '-0.02em' }}>
                ContaPyme
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                MySQL 8.0 Activo
              </div>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-sm ${currentTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onSelectTab('usuarios')}
            >
              <Users size={16} />
              Catálogo de Usuarios
            </button>

            <button
              type="button"
              className={`btn btn-sm ${currentTab === 'roles' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onSelectTab('roles')}
            >
              <ShieldAlert size={16} />
              Gestión de Roles
            </button>

            <button
              type="button"
              className={`btn btn-sm ${currentTab === 'bitacora' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onSelectTab('bitacora')}
            >
              <ScrollText size={16} />
              Bitácora de Accesos
            </button>
          </nav>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Tarjeta de Usuario */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-card)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '0.85rem'
            }}>
              {user?.nombre?.[0] || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: '600', color: '#f8fafc', lineHeight: 1.2 }}>
                {user?.nombre_completo || user?.nombre_usuario}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className={`badge ${getRoleBadgeClass(user?.rol_nombre)}`} style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                  {user?.rol_nombre}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  @{user?.nombre_usuario}
                </span>
              </div>
            </div>
          </div>

          {/* Cambiar Contraseña */}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onOpenChangePassword}
            title="Cambiar mi contraseña"
          >
            <Lock size={15} />
            <span style={{ display: 'none', md: 'inline' }}>Cambiar Contraseña</span>
          </button>

          {/* Cerrar Sesión Manual */}
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={onManualLogout}
            title="Cerrar Sesión Manualmente"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

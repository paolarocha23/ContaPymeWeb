import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, Search, X, LockKeyhole, LogOut } from 'lucide-react';
import './Header.css';

export default function Header({ user, title, subtitle, onOpenChangePassword, onManualLogout }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const fullName = user?.nombre_completo || user?.nombre_usuario || 'Laura';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  const monthLabel = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const monthText = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <header className="cpy-header">
      <div className="cpy-brand-heading">
        <img className="cpy-brand-logo" src="/img/logo-azul.png" alt="ContaPyme" />
        <span className="cpy-header-divider" aria-hidden="true" />
        <div className="cpy-heading-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="cpy-header-actions">
        <button type="button" className="cpy-month-chip" aria-label={`Periodo ${monthText}`}>
          <CalendarDays size={16} strokeWidth={2} />
          {monthText}
        </button>

        <label className={`cpy-search-pill${searchOpen ? ' is-open' : ''}`}>
          <span className="sr-only">Buscar en ContaPyme</span>
          <input
            placeholder="Buscar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
          />
          {searchOpen && query && (
            <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </label>

        <button
          className="cpy-header-circle cpy-action-circle"
          type="button"
          aria-label="Buscar"
          onClick={() => setSearchOpen((open) => !open)}
        >
          <Search size={19} strokeWidth={2} />
        </button>
        <button className="cpy-header-circle cpy-action-circle cpy-notification" type="button" aria-label="Notificaciones">
          <Bell size={18} strokeWidth={2} />
          <span />
        </button>
        <div className="cpy-user-menu-wrap" ref={menuRef}>
          <button
            className="cpy-header-circle cpy-avatar"
            type="button"
            aria-label="Abrir menú de usuario"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((open) => !open)}
          >
            {initials || 'LM'}
          </button>
          {userMenuOpen && (
            <div className="cpy-user-popover">
              <strong>{fullName}</strong>
              <span>{user?.rol_nombre || 'Usuario'}</span>
              <button type="button" onClick={() => { setUserMenuOpen(false); onOpenChangePassword(); }}>
                <LockKeyhole size={15} /> Cambiar contraseña
              </button>
              <button type="button" onClick={() => { setUserMenuOpen(false); onManualLogout(); }}>
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

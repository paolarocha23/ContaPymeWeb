import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, CalendarDays, Search, X, LockKeyhole, LogOut,
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, Tags, Boxes,
  Users, Truck, HandCoins, Receipt, Calculator, FileClock, FileMinus,
  FileBarChart, ShieldCheck, ClipboardList
} from 'lucide-react';
import './Header.css';
import { api } from '../../services/api.js';
import NotificacionesPanel from './NotificacionesPanel.jsx';
import './NotificacionesPanel.css';

// Pantallas que se pueden buscar desde el encabezado
const SEARCH_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', group: 'General', icon: LayoutDashboard, keywords: 'inicio resumen panel' },
  { id: 'ventas', label: 'Ventas', group: 'Operaciones', icon: ShoppingCart, keywords: 'vender facturas' },
  { id: 'compras', label: 'Compras', group: 'Operaciones', icon: ShoppingBag, keywords: 'comprar pedidos' },
  { id: 'productos', label: 'Productos y Servicios', group: 'Inventario', icon: Package, keywords: 'catalogo articulos' },
  { id: 'categorias', label: 'Categorías', group: 'Inventario', icon: Tags, keywords: 'clasificacion' },
  { id: 'inventario', label: 'Inventario', group: 'Inventario', icon: Boxes, keywords: 'existencias stock movimientos' },
  { id: 'clientes', label: 'Clientes', group: 'Contactos', icon: Users, keywords: 'contactos' },
  { id: 'proveedores', label: 'Proveedores', group: 'Contactos', icon: Truck, keywords: 'contactos' },
  { id: 'ingresos', label: 'Ingresos', group: 'Finanzas', icon: HandCoins, keywords: 'dinero entradas' },
  { id: 'gastos', label: 'Gastos', group: 'Finanzas', icon: Receipt, keywords: 'egresos salidas' },
  { id: 'caja', label: 'Caja / Efectivo', group: 'Finanzas', icon: Calculator, keywords: 'efectivo saldo' },
  { id: 'cxc', label: 'Cuentas por cobrar', group: 'Finanzas', icon: FileClock, keywords: 'cobros pendientes' },
  { id: 'cxp', label: 'Cuentas por pagar', group: 'Finanzas', icon: FileMinus, keywords: 'pagos pendientes' },
  { id: 'reports', label: 'Reportes', group: 'Análisis', icon: FileBarChart, keywords: 'informes indicadores' },
  { id: 'usuarios', label: 'Usuarios', group: 'Administración', icon: Users, keywords: 'cuentas accesos' },
  { id: 'roles', label: 'Roles y permisos', group: 'Administración', icon: ShieldCheck, keywords: 'accesos' },
  { id: 'bitacora', label: 'Bitácora', group: 'Administración', icon: ClipboardList, keywords: 'historial registro actividad' }
];

// Quita acentos y mayúsculas para comparar
const normalizar = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function Header({ user, title, subtitle, onNavigate, onOpenChangePassword, onManualLogout }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState('');
  const notificacionesRef = useRef(null);

  const fullName = user?.nombre_completo || user?.nombre_usuario;
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  // Fecha completa: día, mes y año (se actualiza sola al cambiar de día)
  const [hoy, setHoy] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setHoy(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const dateText = hoy.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  /* ───────── Buscador ───────── */
  const resultados = useMemo(() => {
    const q = normalizar(query);
    if (!q) return [];
    const tokens = q.split(/\s+/);

    return SEARCH_ITEMS
      .filter((item) => {
        const texto = normalizar(`${item.label} ${item.group} ${item.keywords}`);
        return tokens.every((t) => texto.includes(t));
      })
      .sort((a, b) => {
        const aIni = normalizar(a.label).startsWith(q) ? 0 : 1;
        const bIni = normalizar(b.label).startsWith(q) ? 0 : 1;
        return aIni - bIni;
      })
      .slice(0, 7);
  }, [query]);

  const mostrarResultados = searchOpen && query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Al abrir con el botón de lupa, enfoca el campo
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!searchOpen) return undefined;
    const cerrarFuera = (event) => {
      if (!searchWrapRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [searchOpen]);

  const irA = (item) => {
    if (!item) return;
    onNavigate?.(item.id);
    setQuery('');
    setSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setQuery('');
      setSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }
    if (!resultados.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % resultados.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      irA(resultados[activeIndex]);
    }
  };

  /* ───────── Menú de usuario ───────── */
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

  /* ───────── Notificaciones ───────── */
  const cargarNotificaciones = async () => {
    setCargandoNotificaciones(true);
    setErrorNotificaciones('');
    try {
      const respuesta = await api.getNotificaciones();
      setNotificaciones(respuesta.data?.notificaciones || []);
    } catch (error) {
      setErrorNotificaciones(
        error.message || 'No fue posible cargar las notificaciones.'
      );
    } finally {
      setCargandoNotificaciones(false);
    }
  };

  useEffect(() => {
    if (!user?.id_usuario) return undefined;
    let activo = true;
    const actualizar = async () => {
      setCargandoNotificaciones(true);
      setErrorNotificaciones('');
      try {
        const respuesta = await api.getNotificaciones();
        if (activo) {
          setNotificaciones(respuesta.data?.notificaciones || []);
        }
      } catch (error) {
        if (activo) {
          setErrorNotificaciones(
            error.message || 'No fue posible cargar las notificaciones.'
          );
        }
      } finally {
        if (activo) {
          setCargandoNotificaciones(false);
        }
      }
    };
    actualizar();
    const intervalo = setInterval(actualizar, 60000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [user?.id_usuario, user]);

  useEffect(() => {
    if (!notificacionesOpen) return undefined;
    const cerrarFuera = (event) => {
      if (!notificacionesRef.current?.contains(event.target)) {
        setNotificacionesOpen(false);
      }
    };
    const cerrarEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificacionesOpen(false);
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [notificacionesOpen]);

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
        <button type="button" className="cpy-month-chip" aria-label={`Fecha de hoy: ${dateText}`}>
          <CalendarDays size={16} strokeWidth={2} />
          {dateText}
        </button>

        {/* ───── Buscador ───── */}
        <div className="cpy-search-wrap" ref={searchWrapRef}>
          <label className={`cpy-search-pill${searchOpen ? ' is-open' : ''}`}>
            <span className="sr-only">Buscar en ContaPyme</span>
            <input
              ref={searchInputRef}
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              role="combobox"
              aria-expanded={mostrarResultados}
              aria-controls="cpy-search-results"
            />
            {searchOpen && query && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
              >
                <X size={14} />
              </button>
            )}
          </label>

          {mostrarResultados && (
            <ul className="cpy-search-results" id="cpy-search-results" role="listbox">
              {resultados.length === 0 ? (
                <li className="cpy-search-empty">Sin resultados para «{query.trim()}»</li>
              ) : (
                resultados.map((item, i) => {
                  const Icono = item.icon;
                  return (
                    <li key={item.id} role="option" aria-selected={i === activeIndex}>
                      <button
                        type="button"
                        className={`cpy-search-result${i === activeIndex ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => irA(item)}
                      >
                        <span className="cpy-search-ico"><Icono size={17} strokeWidth={2} /></span>
                        <span className="cpy-search-text">
                          <strong>{item.label}</strong>
                          <small>{item.group}</small>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>

        <button
          className="cpy-header-circle cpy-action-circle"
          type="button"
          aria-label="Buscar"
          onClick={() => {
            if (searchOpen) {
              setSearchOpen(false);
            } else {
              setSearchOpen(true);
              searchInputRef.current?.focus();
            }
          }}
        >
          <Search size={19} strokeWidth={2} />
        </button>

        <div className="cpy-notificaciones-wrap" ref={notificacionesRef}>
          <button
            className="cpy-header-circle cpy-action-circle cpy-notification"
            type="button"
            aria-label="Notificaciones"
            aria-expanded={notificacionesOpen}
            onClick={() => {
              setNotificacionesOpen((open) => !open);
              setUserMenuOpen(false);
            }}
          >
            <Bell size={18} strokeWidth={2} />
            {notificaciones.length > 0 && <span />}
          </button>

          {notificacionesOpen && (
            <NotificacionesPanel
              notificaciones={notificaciones}
              cargando={cargandoNotificaciones}
              error={errorNotificaciones}
              onActualizar={cargarNotificaciones}
            />
          )}
        </div>

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

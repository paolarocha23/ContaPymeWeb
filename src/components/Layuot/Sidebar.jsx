import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Warehouse, ContactRound,
  Wallet, FileBarChart, Users, LogOut, Package, Tags, Boxes,
  Truck, HandCoins, Receipt, Calculator, FileClock, FileMinus,
} from 'lucide-react';
import './Sidebar.css';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart  },
  { id: 'compras', label: 'Compras', icon: ShoppingBag  },
{
   
    id: 'inventario', label: 'Inventario', icon: Warehouse, submenu: [
        { id: 'productos', label: 'Productos y Servicios', icon: Package },
        { id: 'categorias', label: 'Categorías', icon: Tags },
        { id: 'inventario', label: 'Inventario', icon: Boxes },
      ]
 
  },
  {
   
    id: 'contactos', label: 'Contactos', icon: ContactRound, submenu: [
        { id: 'clientes', label: 'Clientes', icon: Users },
        { id: 'proveedores', label: 'Proveedores', icon: Truck },
      ]
 
  },
  {
   
    id: 'finanzas', label: 'Finanzas', icon: Wallet, submenu: [
        { id: 'ingresos', id: 'ingresos', label: 'Ingresos', icon: HandCoins },
        { id: 'gastos', id: 'gastos', label: 'Gastos', icon: Receipt },
        { id: 'caja', id: 'caja', label: 'Caja / Efectivo', icon: Calculator },
        { id: 'cxc', id: 'cxc', label: 'Cuentas por cobrar', icon: FileClock, badge: '5' },
        { id: 'cxp', id: 'cxp', label: 'Cuentas por pagar', icon: FileMinus, badge: '2' },
      ]
 
  },
  { id: 'reports', label: 'Reportes', icon: FileBarChart },
  { id: 'usuarios', label: 'Usuarios y roles', icon: Users },
];

export default function Sidebar({ activeView, onNavigate, onManualLogout }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [flyoutTop, setFlyoutTop] = useState(153);
  const sidebarRef = useRef(null);
  const flyoutRef = useRef(null);

  const openFlyout = (item, event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setFlyoutTop(bounds.top + bounds.height / 2 - 24 - 53);
    setOpenMenu(item);
  };

  useEffect(() => {
    if (!openMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!sidebarRef.current?.contains(event.target) && !flyoutRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    const handleViewportChange = () => setOpenMenu(null);

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [openMenu]);

  const selectItem = (item) => {
    setOpenMenu(null);
    onNavigate(item.id);
  };

  return (
    <>
      <aside className="cpy-sidebar" ref={sidebarRef} aria-label="Navegación principal">
        <nav className="cpy-sidebar-items">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isContactosActive = item.id === 'contactos' && (
              activeView === 'contactos' || activeView === 'clientes' || activeView === 'proveedores'
            );
            const isSubmenuActive = item.submenu?.some((sub) => sub.id === activeView);
            const isActive = activeView === item.id ||
              (item.id === 'usuarios' && activeView === 'admin') ||
              isContactosActive ||
              Boolean(isSubmenuActive);

            return (
              <button
                type="button"
                key={item.id}
                className={`cpy-sidebar-button${isActive ? ' is-active' : ''}${openMenu?.id === item.id ? ' is-open' : ''}`}
                aria-label={item.label}
                aria-haspopup={item.submenu ? 'true' : undefined}
                aria-expanded={item.submenu ? openMenu?.id === item.id : undefined}
                title={item.label}
                onClick={(event) => item.submenu
                  ? (openMenu?.id === item.id ? setOpenMenu(null) : openFlyout(item, event))
                  : selectItem(item)}
                onMouseEnter={(event) => {
                  if (item.submenu) openFlyout(item, event);
                }}
              >
                <Icon size={20} strokeWidth={2} />
              </button>
            );
          })}
        </nav>
        <span className="cpy-sidebar-spacer" />
        <button
          type="button"
          className="cpy-sidebar-button cpy-logout-button"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={onManualLogout}
        >
          <LogOut size={20} strokeWidth={2} />
        </button>
      </aside>

      {openMenu && (
        <>
          <button className="cpy-content-overlay" type="button" aria-label="Cerrar menú" onClick={() => setOpenMenu(null)} />
          <section
            className="cpy-flyout"
            ref={flyoutRef}
            style={{ top: flyoutTop }}
            aria-label={`Submenú de ${openMenu.label}`}
          >
            <h2>{openMenu.label}</h2>
            {openMenu.submenu.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = activeView === option.id || selectedOption === `${openMenu.id}:${option.id || option.label}`;
              return (
                <button
                  className={`cpy-flyout-option${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  key={option.id || option.label}
                  onClick={() => {
                    setSelectedOption(`${openMenu.id}:${option.label}`);
                    setOpenMenu(null);
                    onNavigate(option.id);
                  }}
                >
                  <span className="cpy-flyout-icon"><OptionIcon size={18} strokeWidth={2} /></span>
                  <span className="cpy-flyout-label">{option.label}</span>
                  {option.badge && <span className="cpy-flyout-badge">{option.badge}</span>}
                </button>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}

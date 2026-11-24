import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Plus,
  RotateCw,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Clock,
  Eye,
  Ban,
  Receipt,
  FileQuestion
} from 'lucide-react';
import { api } from '../../services/api';
import { useVentas } from '../../hooks/useVentas';
import NuevaVentaModal from './NuevaVentaModal';
import DetalleVentaModal from './DetalleVentaModal';
import './Ventas.css';

export default function VentasView() {
  const {
    ventas,
    stats,
    loading,
    error,
    filtros,
    actualizarFiltros,
    recargar
  } = useVentas();

  // Modales
  const [modalNuevaVentaOpen, setModalNuevaVentaOpen] = useState(false);
  const [idVentaDetalle, setIdVentaDetalle] = useState(null);
  const [draftTicketsCount, setDraftTicketsCount] = useState(0);

  const actualizarDraftCount = useCallback(() => {
    try {
      const user = api.getUser();
      const storageKey = `contapyme_tickets_${user?.empresa_id || 'default'}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const conItems = parsed.filter((t) => t.items && t.items.length > 0).length;
          setDraftTicketsCount(conItems);
          return;
        }
      }
    } catch (e) {
      // Ignorar error de parsing
    }
    setDraftTicketsCount(0);
  }, []);

  useEffect(() => {
    actualizarDraftCount();
  }, [modalNuevaVentaOpen, actualizarDraftCount]);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSearchChange = (e) => {
    actualizarFiltros({ q: e.target.value });
  };

  const handleFilterChange = (field, value) => {
    actualizarFiltros({ [field]: value });
  };

  const handleResetFilters = () => {
    actualizarFiltros({
      q: '',
      estatus: 'todas',
      condiciones_pago: 'todas',
      forma_pago: 'todas',
      desde: '',
      hasta: ''
    });
  };

  return (
    <div className="ventas">
      {/* Header */}
      <div className="ventas-header">
        <div>
          <h2>Módulo de Ventas</h2>
          <p>Registro comercial, emisión de folios y control de cobros</p>
        </div>
        <div className="ventas-header-actions">
          <button
            type="button"
            className="ventas-btn-refresh"
            onClick={recargar}
            title="Recargar datos"
          >
            <RotateCw size={16} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            className="ventas-btn-primary"
            onClick={() => setModalNuevaVentaOpen(true)}
            title={draftTicketsCount > 0 ? `${draftTicketsCount} ticket(s) pendiente(s) en borrador` : 'Crear venta'}
          >
            <Plus size={18} />
            <span>Nueva Venta</span>
            {draftTicketsCount > 0 && (
              <span className="ventas-badge-ticket-count">
                {draftTicketsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="ventas-stats">
        <div className="ventas-stat-card">
          <div className="ventas-stat-icon blue">
            <DollarSign size={22} />
          </div>
          <div>
            <span>Total Vendido</span>
            <strong>{formatCurrency(stats?.monto_total_vendido)}</strong>
          </div>
        </div>

        <div className="ventas-stat-card">
          <div className="ventas-stat-icon green">
            <ShoppingCart size={22} />
          </div>
          <div>
            <span>Ventas Realizadas</span>
            <strong>{stats?.total_ventas || 0}</strong>
          </div>
        </div>

        <div className="ventas-stat-card">
          <div className="ventas-stat-icon purple">
            <CreditCard size={22} />
          </div>
          <div>
            <span>Ventas a Crédito</span>
            <strong>{stats?.ventas_credito || 0}</strong>
          </div>
        </div>

        <div className="ventas-stat-card">
          <div className="ventas-stat-icon amber">
            <Clock size={22} />
          </div>
          <div>
            <span>Por Cobrar</span>
            <strong>{formatCurrency(stats?.saldo_por_cobrar)}</strong>
          </div>
        </div>

        <div className="ventas-stat-card">
          <div className="ventas-stat-icon slate">
            <Receipt size={22} />
          </div>
          <div>
            <span>Ticket Promedio</span>
            <strong>{formatCurrency(stats?.ticket_promedio)}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="ventas-toolbar">
        <div className="ventas-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por folio, cliente, RFC o producto..."
            value={filtros.q}
            onChange={handleSearchChange}
          />
        </div>

        <div className="ventas-filters">
          <select
            value={filtros.estatus}
            onChange={(e) => handleFilterChange('estatus', e.target.value)}
            title="Filtrar por estatus"
          >
            <option value="todas">Todos los estatus</option>
            <option value="pagada">Pagadas</option>
            <option value="parcial">Parciales</option>
            <option value="pendiente">Pendientes</option>
            <option value="cancelada">Canceladas</option>
          </select>

          <select
            value={filtros.condiciones_pago}
            onChange={(e) => handleFilterChange('condiciones_pago', e.target.value)}
            title="Filtrar por condición"
          >
            <option value="todas">Todas las condiciones</option>
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
          </select>

          <select
            value={filtros.forma_pago}
            onChange={(e) => handleFilterChange('forma_pago', e.target.value)}
            title="Filtrar por forma de pago"
          >
            <option value="todas">Todas las formas de pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>

          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => handleFilterChange('desde', e.target.value)}
            title="Fecha inicio"
            placeholder="Desde"
          />

          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => handleFilterChange('hasta', e.target.value)}
            title="Fecha fin"
            placeholder="Hasta"
          />

          {(filtros.q || filtros.estatus !== 'todas' || filtros.condiciones_pago !== 'todas' || filtros.forma_pago !== 'todas' || filtros.desde || filtros.hasta) && (
            <button
              type="button"
              className="ventas-btn-refresh"
              onClick={handleResetFilters}
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main Content Table */}
      <div className="ventas-table-card">
        {loading ? (
          <div className="ventas-loading">
            <div className="ventas-spinner" />
            <span>Cargando ventas...</span>
          </div>
        ) : error ? (
          <div className="ventas-empty">
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button type="button" className="ventas-btn-refresh" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : ventas.length === 0 ? (
          <div className="ventas-empty">
            <FileQuestion size={44} className="ventas-empty-icon" />
            <p>No se encontraron registros de ventas con los filtros aplicados.</p>
            <button
              type="button"
              className="ventas-btn-primary"
              style={{ margin: '12px auto 0' }}
              onClick={() => setModalNuevaVentaOpen(true)}
            >
              <Plus size={16} />
              Registrar Primera Venta
            </button>
          </div>
        ) : (
          <table className="ventas-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Condición</th>
                <th>Forma de Pago</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Cobrado</th>
                <th style={{ textAlign: 'right' }}>Saldo Pend.</th>
                <th style={{ textAlign: 'center' }}>Estatus</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => {
                const total = Number(v.total || 0);
                const pagado = Number(v.monto_pagado || 0);
                const saldo = Number(v.saldo_pendiente ?? Math.max(0, total - pagado));

                return (
                  <tr key={v.id_venta}>
                    <td>
                      <span className="ventas-codigo">{v.codigo || `VEN-${v.id_venta}`}</span>
                    </td>
                    <td>{formatDate(v.fecha)}</td>
                    <td>
                      <div className="ventas-cliente-cell">
                        <strong>{v.cliente_nombre || 'Público en General'}</strong>
                        {v.cliente_rfc && <span>{v.cliente_rfc}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`ventas-badge-condicion ventas-condicion-${v.condiciones_pago}`}>
                        {v.condiciones_pago === 'credito' ? 'Crédito' : 'Contado'}
                      </span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', color: '#475569' }}>
                        {v.forma_pago}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(total)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>
                      {formatCurrency(pagado)}
                    </td>
                    <td style={{ textAlign: 'right', color: saldo > 0 ? '#b91c1c' : '#64748b', fontWeight: saldo > 0 ? 600 : 400 }}>
                      {formatCurrency(saldo)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`ventas-badge ventas-badge-${v.estatus}`}>
                        {v.estatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="ventas-actions-cell" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="ventas-btn-action"
                          onClick={() => setIdVentaDetalle(v.id_venta)}
                          title="Ver detalle completo"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva Venta */}
      <NuevaVentaModal
        isOpen={modalNuevaVentaOpen}
        onClose={() => setModalNuevaVentaOpen(false)}
        onSuccess={() => {
          recargar();
        }}
      />

      {/* Modal Detalle Venta */}
      <DetalleVentaModal
        idVenta={idVentaDetalle}
        isOpen={Boolean(idVentaDetalle)}
        onClose={() => setIdVentaDetalle(null)}
        onVentaCancelada={() => {
          recargar();
        }}
      />
    </div>
  );
}

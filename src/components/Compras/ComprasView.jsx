import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  RotateCw,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Clock,
  Eye,
  Receipt,
  FileQuestion
} from 'lucide-react';
import { api } from '../../services/api';
import { useCompras } from '../../hooks/useCompras';
import NuevaCompraModal from './NuevaCompraModal';
import DetalleCompraModal from './DetalleCompraModal';
import './Compras.css';

export default function ComprasView() {
  const {
    compras,
    stats,
    loading,
    error,
    filtros,
    actualizarFiltros,
    recargar
  } = useCompras();

  // Modales
  const [modalNuevaCompraOpen, setModalNuevaCompraOpen] = useState(false);
  const [idCompraDetalle, setIdCompraDetalle] = useState(null);
  const [draftTicketsCount, setDraftTicketsCount] = useState(0);

  const actualizarDraftCount = useCallback(() => {
    try {
      const user = api.getUser();
      const storageKey = `contapyme_tickets_compras_${user?.empresa_id || 'default'}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const conItems = parsed.filter((t) => t.items && t.items.length > 0).length;
          setDraftTicketsCount(conItems);
          return;
        }
      }
    } catch {
      // Ignorar error de parsing
    }
    setDraftTicketsCount(0);
  }, []);

  useEffect(() => {
    actualizarDraftCount();
  }, [modalNuevaCompraOpen, actualizarDraftCount]);

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
      desde: '',
      hasta: ''
    });
  };

  return (
    <div className="compras">
      {/* Header */}
      <div className="compras-header">
        <div>
          <h2>Módulo de Compras</h2>
          <p>Adquisición de mercancías, entrada a inventario y control de cuentas por pagar</p>
        </div>
        <div className="compras-header-actions">
          <button
            type="button"
            className="compras-btn-refresh"
            onClick={recargar}
            title="Recargar datos"
          >
            <RotateCw size={16} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            className="compras-btn-primary"
            onClick={() => setModalNuevaCompraOpen(true)}
            title={draftTicketsCount > 0 ? `${draftTicketsCount} orden(es) pendiente(s) en borrador` : 'Registrar compra'}
          >
            <Plus size={18} />
            <span>Nueva Compra</span>
            {draftTicketsCount > 0 && (
              <span className="compras-badge-ticket-count">
                {draftTicketsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="compras-stats">
        <div className="compras-stat-card">
          <div className="compras-stat-icon blue">
            <DollarSign size={22} />
          </div>
          <div>
            <span>Total Comprado</span>
            <strong>{formatCurrency(stats?.monto_total_comprado)}</strong>
          </div>
        </div>

        <div className="compras-stat-card">
          <div className="compras-stat-icon green">
            <ShoppingBag size={22} />
          </div>
          <div>
            <span>Compras Realizadas</span>
            <strong>{stats?.total_compras || 0}</strong>
          </div>
        </div>

        <div className="compras-stat-card">
          <div className="compras-stat-icon purple">
            <CreditCard size={22} />
          </div>
          <div>
            <span>Compras a Crédito</span>
            <strong>{stats?.compras_credito || 0}</strong>
          </div>
        </div>

        <div className="compras-stat-card">
          <div className="compras-stat-icon amber">
            <Clock size={22} />
          </div>
          <div>
            <span>Por Pagar (CxP)</span>
            <strong>{formatCurrency(stats?.saldo_por_pagar)}</strong>
          </div>
        </div>

        <div className="compras-stat-card">
          <div className="compras-stat-icon slate">
            <Receipt size={22} />
          </div>
          <div>
            <span>Ticket Promedio</span>
            <strong>{formatCurrency(stats?.ticket_promedio)}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="compras-toolbar">
        <div className="compras-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por folio, proveedor, contacto, teléfono o correo..."
            value={filtros.q}
            onChange={handleSearchChange}
          />
        </div>

        <div className="compras-filters">
          <select
            value={filtros.estatus}
            onChange={(e) => handleFilterChange('estatus', e.target.value)}
            title="Filtrar por estatus"
          >
            <option value="todas">Todos los estatus</option>
            <option value="pagada">Pagadas</option>
            <option value="parcial">Parciales</option>
            <option value="pendiente_pago">Pendientes de Pago</option>
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

          {(filtros.q || filtros.estatus !== 'todas' || filtros.condiciones_pago !== 'todas' || filtros.desde || filtros.hasta) && (
            <button
              type="button"
              className="compras-btn-refresh"
              onClick={handleResetFilters}
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main Content Table */}
      <div className="compras-table-card">
        {loading ? (
          <div className="compras-loading">
            <div className="compras-spinner" />
            <span>Cargando compras...</span>
          </div>
        ) : error ? (
          <div className="compras-empty">
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button type="button" className="compras-btn-refresh" onClick={recargar}>
              Reintentar
            </button>
          </div>
        ) : compras.length === 0 ? (
          <div className="compras-empty">
            <FileQuestion size={44} className="compras-empty-icon" />
            <p>No se encontraron registros de compras con los filtros aplicados.</p>
            <button
              type="button"
              className="compras-btn-primary"
              style={{ margin: '12px auto 0' }}
              onClick={() => setModalNuevaCompraOpen(true)}
            >
              <Plus size={16} />
              Registrar Primera Compra
            </button>
          </div>
        ) : (
          <table className="compras-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Condición</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Pagado</th>
                <th style={{ textAlign: 'right' }}>Saldo Pend. (CxP)</th>
                <th style={{ textAlign: 'center' }}>Estatus</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => {
                const total = Number(c.total || 0);
                const pagado = Number(c.monto_pagado || 0);
                const saldo = Number(c.saldo_pendiente ?? Math.max(0, total - pagado));

                return (
                  <tr key={c.id_compra}>
                    <td>
                      <span className="compras-codigo">{c.codigo || `COM-${c.id_compra}`}</span>
                    </td>
                    <td>{formatDate(c.fecha)}</td>
                    <td>
                      <div className="compras-proveedor-cell">
                        <strong>{c.proveedor_nombre || 'Proveedor'}</strong>
                        {(c.proveedor_contacto || c.proveedor_correo) && (
                          <span>{c.proveedor_contacto || c.proveedor_correo}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`compras-badge-condicion compras-condicion-${c.condiciones_pago}`}>
                        {c.condiciones_pago === 'credito' ? 'Crédito' : 'Contado'}
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
                      <span className={`compras-badge compras-badge-${c.estatus}`}>
                        {c.estatus === 'pendiente_pago' ? 'Pendiente' : c.estatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="compras-actions-cell" style={{ justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="compras-btn-action"
                          onClick={() => setIdCompraDetalle(c.id_compra)}
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

      {/* Modal Nueva Compra */}
      <NuevaCompraModal
        isOpen={modalNuevaCompraOpen}
        onClose={() => setModalNuevaCompraOpen(false)}
        onSuccess={() => {
          recargar();
        }}
      />

      {/* Modal Detalle Compra */}
      <DetalleCompraModal
        idCompra={idCompraDetalle}
        isOpen={Boolean(idCompraDetalle)}
        onClose={() => setIdCompraDetalle(null)}
        onCompraCancelada={() => {
          recargar();
        }}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Ban, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../../services/api';

export default function DetalleCompraModal({ idCompra, isOpen, onClose, onCompraCancelada }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compra, setCompra] = useState(null);

  // Estado para cancelación
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!isOpen || !idCompra) return;

    let activo = true;
    async function cargarDetalle() {
      setLoading(true);
      setError('');
      setShowCancelPrompt(false);
      setMotivoCancelacion('');
      setCancelError('');

      try {
        const resp = await api.getCompraById(idCompra);
        if (activo) {
          if (resp.success && resp.data) {
            setCompra(resp.data);
          } else {
            setError(resp.message || 'No se pudo obtener la información de la compra.');
          }
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error al consultar la compra.');
        }
      } finally {
        if (activo) setLoading(false);
      }
    }

    cargarDetalle();

    return () => {
      activo = false;
    };
  }, [isOpen, idCompra]);

  const handleCancelarCompra = async (e) => {
    e.preventDefault();
    if (!motivoCancelacion.trim()) {
      setCancelError('Debe indicar el motivo de la cancelación.');
      return;
    }

    setCancelling(true);
    setCancelError('');

    try {
      const resp = await api.cancelarCompra(idCompra, motivoCancelacion.trim());
      if (resp.success) {
        alert('Compra cancelada exitosamente. Se ha revertido el inventario y los movimientos asociados.');
        if (onCompraCancelada) {
          onCompraCancelada(resp.data);
        }
        onClose();
      } else {
        setCancelError(resp.message || 'No se pudo cancelar la compra.');
      }
    } catch (err) {
      setCancelError(err.message || 'Error al intentar cancelar la compra.');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="compras-modal-backdrop" onClick={onClose}>
      <div className="compras-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="compras-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} color="#0284c7" />
            <h3 style={{ margin: 0 }}>
              Detalle de Compra {compra ? `#${compra.codigo || compra.id_compra}` : ''}
            </h3>
            {compra && (
              <span className={`compras-badge compras-badge-${compra.estatus}`}>
                {compra.estatus?.toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            className="compras-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="compras-modal-body">
          {loading ? (
            <div className="compras-loading">
              <div className="compras-spinner" />
              <span>Cargando detalle de la compra...</span>
            </div>
          ) : error ? (
            <div className="compras-cxp-notice" style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : compra ? (
            <>
              {/* Información General */}
              <div className="compras-form-section">
                <span className="compras-section-title">Información General</span>
                <div className="compras-form-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Folio / Código</span>
                    <strong>{compra.codigo || `COM-${compra.id_compra}`}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Fecha de Compra</span>
                    <strong>
                      {compra.fecha ? new Date(compra.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Proveedor</span>
                    <strong>{compra.proveedor_nombre || 'Proveedor'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Comprador / Usuario</span>
                    <strong>{compra.usuario_nombre || 'Usuario'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Condición de Pago</span>
                    <span className={`compras-badge-condicion compras-condicion-${compra.condiciones_pago}`}>
                      {compra.condiciones_pago === 'credito' ? 'Crédito' : 'Contado'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Fecha Vencimiento</span>
                    <span>{compra.fecha_vencimiento ? new Date(compra.fecha_vencimiento).toLocaleDateString('es-MX') : 'Inmediato'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Contacto Proveedor</span>
                    <span>{compra.proveedor_contacto || compra.proveedor_correo || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Empresa</span>
                    <span>{compra.empresa_nombre || 'Principal'}</span>
                  </div>
                </div>
              </div>

              {/* Artículos de la Compra */}
              <div className="compras-form-section">
                <span className="compras-section-title">Partidas de la Compra ({compra.items?.length || 0})</span>
                <table className="compras-items-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto / Insumo</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'center' }}>Cantidad Ingresada</th>
                      <th style={{ textAlign: 'right' }}>Costo Unitario</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(compra.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td><strong>{it.codigo_producto || '—'}</strong></td>
                        <td>{it.producto_nombre || 'Producto'}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#64748b' }}>
                            {it.tipo_producto || 'producto'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>+{it.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>${Number(it.costo_unitario).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(it.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen Financiero */}
              <div className="compras-summary-box">
                <div className="compras-summary-row">
                  <span>Subtotal</span>
                  <span>${Number(compra.subtotal || compra.total || 0).toFixed(2)}</span>
                </div>
                <div className="compras-summary-row total">
                  <span>Total de la Compra</span>
                  <span>${Number(compra.total || 0).toFixed(2)}</span>
                </div>
                <div className="compras-summary-row" style={{ color: '#16a34a' }}>
                  <span>Monto Pagado</span>
                  <span>${Number(compra.monto_pagado || 0).toFixed(2)}</span>
                </div>
                {Number(compra.saldo_pendiente || 0) > 0 && (
                  <div className="compras-summary-row" style={{ color: '#b91c1c', fontWeight: 600 }}>
                    <span>Saldo Pendiente de Pago (CxP)</span>
                    <span>${Number(compra.saldo_pendiente).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Información de Cuenta por Pagar si existe */}
              {compra.cuenta_por_pagar && (
                <div className="compras-cxp-notice">
                  <CreditCard size={20} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Cuenta por Pagar Vinculada</strong>
                      <span className={`compras-badge compras-badge-${compra.cuenta_por_pagar.estatus}`}>
                        {compra.cuenta_por_pagar.estatus?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                      Monto original: <strong>${Number(compra.cuenta_por_pagar.monto_original || 0).toFixed(2)}</strong> | 
                      Saldo por liquidar: <strong style={{ color: '#b91c1c' }}>${Number(compra.cuenta_por_pagar.saldo_pendiente || 0).toFixed(2)}</strong> | 
                      Vence: <strong>{compra.cuenta_por_pagar.fecha_vencimiento ? new Date(compra.cuenta_por_pagar.fecha_vencimiento).toLocaleDateString('es-MX') : '—'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelación de Compra */}
              {compra.estatus !== 'cancelada' && (
                <div style={{ marginTop: '10px' }}>
                  {!showCancelPrompt ? (
                    <button
                      type="button"
                      className="compras-btn-action cancel"
                      style={{ width: 'auto', padding: '8px 14px', gap: '8px' }}
                      onClick={() => setShowCancelPrompt(true)}
                    >
                      <Ban size={15} />
                      <span>Cancelar Compra</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleCancelarCompra}
                      style={{
                        padding: '16px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', marginBottom: '8px' }}>
                        <AlertTriangle size={18} />
                        <strong>¿Está seguro de cancelar esta compra?</strong>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#7f1d1d' }}>
                        Esta acción restará las existencias ingresadas al inventario, anulará los gastos registrados y cancelará la cuenta por pagar asociada (siempre que no tenga abonos previos).
                      </p>

                      {cancelError && (
                        <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '8px' }}>
                          {cancelError}
                        </div>
                      )}

                      <div className="compras-form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ color: '#991b1b' }}>Motivo de la cancelación *</label>
                        <input
                          type="text"
                          value={motivoCancelacion}
                          onChange={(e) => setMotivoCancelacion(e.target.value)}
                          placeholder="Ej. Devolución al proveedor, error en captura..."
                          required
                          autoFocus
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="compras-btn-cancel"
                          onClick={() => {
                            setShowCancelPrompt(false);
                            setCancelError('');
                          }}
                          disabled={cancelling}
                        >
                          Descartar
                        </button>
                        <button
                          type="submit"
                          className="compras-btn-primary"
                          style={{ background: '#dc2626' }}
                          disabled={cancelling}
                        >
                          {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="compras-modal-footer">
          <button type="button" className="compras-btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

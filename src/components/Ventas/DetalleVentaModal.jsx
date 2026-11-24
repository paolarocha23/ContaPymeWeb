import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CreditCard, Ban, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../../services/api';

export default function DetalleVentaModal({ idVenta, isOpen, onClose, onVentaCancelada }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [venta, setVenta] = useState(null);

  // Estado para cancelación
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (!isOpen || !idVenta) return;

    let activo = true;
    async function cargarDetalle() {
      setLoading(true);
      setError('');
      setShowCancelPrompt(false);
      setMotivoCancelacion('');
      setCancelError('');

      try {
        const resp = await api.getVentaById(idVenta);
        if (activo) {
          if (resp.success && resp.data) {
            setVenta(resp.data);
          } else {
            setError(resp.message || 'No se pudo obtener la información de la venta.');
          }
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error al consultar la venta.');
        }
      } finally {
        if (activo) setLoadingDataFalse();
      }
    }

    const setLoadingDataFalse = () => setLoading(false);
    cargarDetalle();

    return () => {
      activo = false;
    };
  }, [isOpen, idVenta]);

  const handleCancelarVenta = async (e) => {
    e.preventDefault();
    if (!motivoCancelacion.trim()) {
      setCancelError('Debe indicar el motivo de la cancelación.');
      return;
    }

    setCancelling(true);
    setCancelError('');

    try {
      const resp = await api.cancelarVenta(idVenta, motivoCancelacion.trim());
      if (resp.success) {
        alert('Venta cancelada exitosamente. Se ha revertido el inventario y los movimientos asociados.');
        if (onVentaCancelada) {
          onVentaCancelada(resp.data);
        }
        onClose();
      } else {
        setCancelError(resp.message || 'No se pudo cancelar la venta.');
      }
    } catch (err) {
      setCancelError(err.message || 'Error al intentar cancelar la venta.');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ventas-modal-backdrop" onClick={onClose}>
      <div className="ventas-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ventas-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} color="#0284c7" />
            <h3 style={{ margin: 0 }}>
              Detalle de Venta {venta ? `#${venta.codigo || venta.id_venta}` : ''}
            </h3>
            {venta && (
              <span className={`ventas-badge ventas-badge-${venta.estatus}`}>
                {venta.estatus?.toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            className="ventas-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ventas-modal-body">
          {loading ? (
            <div className="ventas-loading">
              <div className="ventas-spinner" />
              <span>Cargando detalle de la venta...</span>
            </div>
          ) : error ? (
            <div className="ventas-cxc-notice" style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : venta ? (
            <>
              {/* Información General */}
              <div className="ventas-form-section">
                <span className="ventas-section-title">Información General</span>
                <div className="ventas-form-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Folio / Código</span>
                    <strong>{venta.codigo || `VEN-${venta.id_venta}`}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Fecha de Registro</span>
                    <strong>
                      {venta.fecha ? new Date(venta.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Cliente</span>
                    <strong>{venta.cliente_nombre || 'Público en General'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Vendedor / Usuario</span>
                    <strong>{venta.usuario_nombre || 'Usuario'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Condición de Pago</span>
                    <span className={`ventas-badge-condicion ventas-condicion-${venta.condiciones_pago}`}>
                      {venta.condiciones_pago === 'credito' ? 'Crédito' : 'Contado'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Forma de Pago</span>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{venta.forma_pago}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Fecha Vencimiento</span>
                    <span>{venta.fecha_vencimiento ? new Date(venta.fecha_vencimiento).toLocaleDateString('es-MX') : 'Inmediato'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Empresa</span>
                    <span>{venta.empresa_nombre || 'Principal'}</span>
                  </div>
                </div>

                {venta.observaciones && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#475569' }}>Observaciones: </strong>
                    <span style={{ color: '#1e293b' }}>{venta.observaciones}</span>
                  </div>
                )}
              </div>

              {/* Artículos de la Venta */}
              <div className="ventas-form-section">
                <span className="ventas-section-title">Partidas de la Venta ({venta.items?.length || 0})</span>
                <table className="ventas-items-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto / Servicio</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: 'center' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Precio Unitario</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(venta.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td><strong>{it.codigo_producto || '—'}</strong></td>
                        <td>{it.producto_nombre || 'Producto'}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#64748b' }}>
                            {it.tipo_producto || 'producto'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>${Number(it.precio_unitario).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(it.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen Financiero */}
              <div className="ventas-summary-box">
                <div className="ventas-summary-row">
                  <span>Subtotal</span>
                  <span>${Number(venta.subtotal || venta.total || 0).toFixed(2)}</span>
                </div>
                <div className="ventas-summary-row total">
                  <span>Total de la Venta</span>
                  <span>${Number(venta.total || 0).toFixed(2)}</span>
                </div>
                <div className="ventas-summary-row" style={{ color: '#16a34a' }}>
                  <span>Monto Pagado / Cobrado</span>
                  <span>${Number(venta.monto_pagado || 0).toFixed(2)}</span>
                </div>
                {Number(venta.saldo_pendiente || 0) > 0 && (
                  <div className="ventas-summary-row" style={{ color: '#b91c1c', fontWeight: 600 }}>
                    <span>Saldo Pendiente de Cobro</span>
                    <span>${Number(venta.saldo_pendiente).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Información de Cuenta por Cobrar si existe */}
              {venta.cuenta_por_cobrar && (
                <div className="ventas-cxc-notice">
                  <CreditCard size={20} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Cuenta por Cobrar Vinculada</strong>
                      <span className={`ventas-badge ventas-badge-${venta.cuenta_por_cobrar.estatus}`}>
                        {venta.cuenta_por_cobrar.estatus?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                      Monto original: <strong>${Number(venta.cuenta_por_cobrar.monto_original || 0).toFixed(2)}</strong> | 
                      Saldo por liquidar: <strong style={{ color: '#b91c1c' }}>${Number(venta.cuenta_por_cobrar.saldo_pendiente || 0).toFixed(2)}</strong> | 
                      Vence: <strong>{venta.cuenta_por_cobrar.fecha_vencimiento ? new Date(venta.cuenta_por_cobrar.fecha_vencimiento).toLocaleDateString('es-MX') : '—'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelación de Venta */}
              {venta.estatus !== 'cancelada' && (
                <div style={{ marginTop: '10px' }}>
                  {!showCancelPrompt ? (
                    <button
                      type="button"
                      className="ventas-btn-action cancel"
                      style={{ width: 'auto', padding: '8px 14px', gap: '8px' }}
                      onClick={() => setShowCancelPrompt(true)}
                    >
                      <Ban size={15} />
                      <span>Cancelar Venta</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleCancelarVenta}
                      style={{
                        padding: '16px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', marginBottom: '8px' }}>
                        <AlertTriangle size={18} />
                        <strong>¿Está seguro de cancelar esta venta?</strong>
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#7f1d1d' }}>
                        Esta acción restituirá las existencias en inventario, anulará los ingresos registrados en caja/finanzas y cancelará la cuenta por cobrar asociada.
                      </p>

                      {cancelError && (
                        <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '8px' }}>
                          {cancelError}
                        </div>
                      )}

                      <div className="ventas-form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ color: '#991b1b' }}>Motivo de la cancelación *</label>
                        <input
                          type="text"
                          value={motivoCancelacion}
                          onChange={(e) => setMotivoCancelacion(e.target.value)}
                          placeholder="Ej. Devolución de mercancía, error en captura..."
                          required
                          autoFocus
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="ventas-btn-cancel"
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
                          className="ventas-btn-primary"
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
        <div className="ventas-modal-footer">
          <button type="button" className="ventas-btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

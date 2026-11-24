import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  CreditCard,
  Receipt,
  RotateCcw,
  Edit2
} from 'lucide-react';
import { api } from '../../services/api';

const obtenerStorageKey = () => {
  const user = api.getUser();
  return `contapyme_tickets_compras_${user?.empresa_id || 'default'}`;
};

const crearTicketVacio = (numero = 1) => ({
  id: `ticket_compra_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  nombre: `Orden ${numero}`,
  creadoEn: new Date().toISOString(),
  idProveedor: '',
  condicionesPago: 'contado',
  formaPago: 'efectivo',
  fechaVencimiento: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })(),
  observaciones: '',
  montoPagadoCredito: 0,
  items: []
});

export default function NuevaCompraModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [folioSiguiente, setFolioSiguiente] = useState('');

  // Estado de Tickets en LocalStorage / Memoria
  const [tickets, setTickets] = useState(() => {
    try {
      const guardado = localStorage.getItem(obtenerStorageKey());
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error al inicializar tickets de compra desde localStorage:', e);
    }
    return [crearTicketVacio(1)];
  });

  const [activeTicketId, setActiveTicketId] = useState(() => {
    return tickets[0]?.id || '';
  });

  // Selector temporal de producto a agregar
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);
  const [costoInput, setCostoInput] = useState('');

  // Guardar tickets en localStorage cada vez que cambien
  const guardarEnStorage = useCallback((nuevosTickets) => {
    try {
      localStorage.setItem(obtenerStorageKey(), JSON.stringify(nuevosTickets));
    } catch (e) {
      console.error('Error al guardar tickets de compra en localStorage:', e);
    }
  }, []);

  // Cargar catálogos
  useEffect(() => {
    if (!isOpen) return;

    let activo = true;
    async function cargarCatalogos() {
      setLoadingData(true);
      setError('');
      try {
        const [respProveedores, respProductos, respFolio] = await Promise.all([
          api.getSuppliers({ estatus: 1 }),
          api.getProducts({ estatus: 1 }),
          api.getSiguienteFolioCompra()
        ]);

        if (!activo) return;

        const listaProveedores = respProveedores.data?.items || respProveedores.data || [];
        const listaProductos = respProductos.data?.items || respProductos.data || [];
        setProveedores(listaProveedores);
        setProductos(listaProductos);
        if (respFolio?.data?.siguiente_folio) {
          setFolioSiguiente(respFolio.data.siguiente_folio);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'Error al cargar los catálogos.');
        }
      } finally {
        if (activo) setLoadingData(false);
      }
    }

    // Refrescar tickets desde localStorage
    try {
      const guardado = localStorage.getItem(obtenerStorageKey());
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickets(parsed);
          if (!parsed.some((t) => t.id === activeTicketId)) {
            setActiveTicketId(parsed[0].id);
          }
        }
      }
    } catch {
      // Ignorar error de parsing
    }

    cargarCatalogos();

    return () => {
      activo = false;
    };
  }, [isOpen, activeTicketId]);

  // Ticket activo actual
  const activeTicket = useMemo(() => {
    return tickets.find((t) => t.id === activeTicketId) || tickets[0] || crearTicketVacio(1);
  }, [tickets, activeTicketId]);

  // Actualizar campos del ticket activo
  const updateActiveTicket = useCallback(
    (nuevosCampos) => {
      setTickets((prev) => {
        const idx = prev.findIndex((t) => t.id === activeTicket.id);
        if (idx === -1) return prev;

        const ticketActualizado = {
          ...prev[idx],
          ...nuevosCampos
        };

        const nuevaLista = [...prev];
        nuevaLista[idx] = ticketActualizado;
        guardarEnStorage(nuevaLista);
        return nuevaLista;
      });
    },
    [activeTicket.id, guardarEnStorage]
  );

  // Manejo de pestañas de tickets
  const handleCrearNuevoTicket = () => {
    const nuevoNumero = tickets.length + 1;
    const nuevo = crearTicketVacio(nuevoNumero);
    const nuevaLista = [...tickets, nuevo];
    setTickets(nuevaLista);
    setActiveTicketId(nuevo.id);
    guardarEnStorage(nuevaLista);
    setProductoSeleccionadoId('');
    setCantidadInput(1);
    setCostoInput('');
  };

  const handleEliminarTicket = (ticketIdAEliminar, e) => {
    e.stopPropagation();
    if (tickets.length <= 1) {
      const ticketReinicio = crearTicketVacio(1);
      setTickets([ticketReinicio]);
      setActiveTicketId(ticketReinicio.id);
      guardarEnStorage([ticketReinicio]);
      setProductoSeleccionadoId('');
      setCantidadInput(1);
      setCostoInput('');
      return;
    }

    const nuevaLista = tickets.filter((t) => t.id !== ticketIdAEliminar);
    setTickets(nuevaLista);
    guardarEnStorage(nuevaLista);

    if (activeTicketId === ticketIdAEliminar) {
      setActiveTicketId(nuevaLista[0].id);
    }
  };

  const handleVaciarTicketActual = () => {
    if (activeTicket.items.length === 0) return;
    if (window.confirm(`¿Desea vaciar todos los artículos de "${activeTicket.nombre}"?`)) {
      updateActiveTicket({
        items: [],
        montoPagadoCredito: 0
      });
      setProductoSeleccionadoId('');
      setCantidadInput(1);
      setCostoInput('');
    }
  };

  // Selector de producto
  const handleSelectProducto = (e) => {
    const id = e.target.value;
    setProductoSeleccionadoId(id);
    if (!id) {
      setCostoInput('');
      return;
    }

    const prod = productos.find((p) => String(p.id_producto) === String(id));
    if (prod) {
      setCostoInput(Number(prod.precio_compra || 0).toFixed(2));
      setCantidadInput(1);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!productoSeleccionadoId) {
      alert('Seleccione un producto o insumo.');
      return;
    }

    const prod = productos.find((p) => String(p.id_producto) === String(productoSeleccionadoId));
    if (!prod) return;

    const cant = Number(cantidadInput);
    const costo = Number(costoInput);

    if (!cant || cant <= 0) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }

    if (isNaN(costo) || costo < 0) {
      alert('El costo unitario no es válido.');
      return;
    }

    // Agregar o acumular en el ticket actual
    const itemsActuales = [...activeTicket.items];
    const indexExistente = itemsActuales.findIndex((it) => String(it.id_producto) === String(prod.id_producto));

    if (indexExistente >= 0) {
      const actual = itemsActuales[indexExistente];
      const nuevaCantidad = actual.cantidad + cant;
      itemsActuales[indexExistente] = {
        ...actual,
        cantidad: nuevaCantidad,
        costo_unitario: costo,
        subtotal: Math.round(nuevaCantidad * costo * 100) / 100
      };
    } else {
      itemsActuales.push({
        id_producto: prod.id_producto,
        codigo: prod.codigo,
        nombre: prod.nombre,
        tipo: prod.tipo,
        cantidad: cant,
        costo_unitario: costo,
        subtotal: Math.round(cant * costo * 100) / 100
      });
    }

    updateActiveTicket({ items: itemsActuales });
    setProductoSeleccionadoId('');
    setCantidadInput(1);
    setCostoInput('');
  };

  const handleRemoveItem = (index) => {
    const nuevosItems = activeTicket.items.filter((_, i) => i !== index);
    updateActiveTicket({ items: nuevosItems });
  };

  // Cálculos de totales del ticket activo
  const totalCompra = useMemo(() => {
    const sum = (activeTicket.items || []).reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [activeTicket.items]);

  const montoPagado = useMemo(() => {
    if (activeTicket.condicionesPago === 'contado') {
      return totalCompra;
    }
    const mp = Number(activeTicket.montoPagadoCredito) || 0;
    return Math.min(totalCompra, Math.max(0, mp));
  }, [activeTicket.condicionesPago, totalCompra, activeTicket.montoPagadoCredito]);

  const saldoPendiente = useMemo(() => {
    return Math.max(0, Math.round((totalCompra - montoPagado) * 100) / 100);
  }, [totalCompra, montoPagado]);

  // Envío y registro de compra
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!activeTicket.idProveedor) {
      setError('Debe seleccionar un proveedor para registrar la compra.');
      return;
    }

    if (activeTicket.items.length === 0) {
      setError('La orden actual no contiene productos o insumos.');
      return;
    }

    const payload = {
      id_proveedor: Number(activeTicket.idProveedor),
      forma_pago: activeTicket.formaPago,
      condiciones_pago: activeTicket.condicionesPago,
      fecha_vencimiento: activeTicket.condicionesPago === 'credito' ? activeTicket.fechaVencimiento : null,
      monto_pagado: montoPagado,
      observaciones: activeTicket.observaciones ? activeTicket.observaciones.trim() : undefined,
      items: activeTicket.items.map((it) => ({
        id_producto: it.id_producto,
        cantidad: it.cantidad,
        costo_unitario: it.costo_unitario
      }))
    };

    setLoading(true);
    try {
      const resp = await api.createCompra(payload);
      if (resp.success) {
        // Remover el ticket procesado de localStorage
        const restantes = tickets.filter((t) => t.id !== activeTicket.id);
        if (restantes.length > 0) {
          setTickets(restantes);
          setActiveTicketId(restantes[0].id);
          guardarEnStorage(restantes);
        } else {
          const nuevoReinicio = [crearTicketVacio(1)];
          setTickets(nuevoReinicio);
          setActiveTicketId(nuevoReinicio[0].id);
          guardarEnStorage(nuevoReinicio);
        }

        if (onSuccess) {
          onSuccess(resp.data);
        }
        onClose();
      } else {
        setError(resp.message || 'No se pudo registrar la compra.');
      }
    } catch (err) {
      setError(err.message || 'Error al procesar la compra.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="compras-modal-backdrop" onClick={onClose}>
      <div className="compras-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="compras-modal-header">
          <div>
            <h3>Nueva Compra de Mercancía / Insumos</h3>
            {folioSiguiente && (
              <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                Folio estimado: {folioSiguiente}
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

        {/* Barra de Tickets / Órdenes en Borrador */}
        <div className="compras-tickets-bar">
          {tickets.map((t) => {
            const numArts = (t.items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
            const totalTab = (t.items || []).reduce((acc, it) => acc + (it.subtotal || 0), 0);
            const isActive = t.id === activeTicket.id;

            return (
              <div
                key={t.id}
                className={`compras-ticket-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTicketId(t.id);
                  setProductoSeleccionadoId('');
                  setCantidadInput(1);
                  setCostoInput('');
                }}
                title={`Creado: ${new Date(t.creadoEn).toLocaleTimeString('es-MX')}`}
              >
                <Receipt size={14} />
                <span>{t.nombre}</span>
                <span className="compras-ticket-tab-meta">
                  {numArts} arts • ${totalTab.toFixed(2)}
                </span>
                <button
                  type="button"
                  className="compras-ticket-tab-close"
                  onClick={(e) => handleEliminarTicket(t.id, e)}
                  title="Cerrar orden en borrador"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className="compras-btn-new-ticket"
            onClick={handleCrearNuevoTicket}
            title="Crear una nueva orden de compra en borrador"
          >
            <Plus size={14} />
            Nueva Orden
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} className="compras-modal-body">
          {/* Barra de control del Ticket Activo */}
          <div className="compras-ticket-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={14} color="#64748b" />
              <input
                type="text"
                className="compras-ticket-name-input"
                value={activeTicket.nombre}
                onChange={(e) => updateActiveTicket({ nombre: e.target.value })}
                placeholder="Nombre de la orden..."
                title="Haga clic para renombrar esta orden (ej. Proveedor Monterrey, Pedido Mensual)"
              />
            </div>
            {activeTicket.items.length > 0 && (
              <button
                type="button"
                className="compras-btn-clear-ticket"
                onClick={handleVaciarTicketActual}
                title="Vaciar artículos de esta orden"
              >
                <RotateCcw size={13} />
                Vaciar Orden
              </button>
            )}
          </div>

          {error && (
            <div
              className="compras-cxp-notice"
              style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="compras-loading">
              <div className="compras-spinner" />
              <span>Cargando catálogo de proveedores y productos...</span>
            </div>
          ) : (
            <>
              {/* Sección 1: Datos Generales */}
              <div className="compras-form-section">
                <span className="compras-section-title">1. Datos Generales de la Compra</span>
                <div className="compras-form-grid">
                  {/* Proveedor */}
                  <div className="compras-form-group">
                    <label htmlFor="compra-proveedor">
                      Proveedor <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      id="compra-proveedor"
                      value={activeTicket.idProveedor || ''}
                      onChange={(e) => updateActiveTicket({ idProveedor: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccionar Proveedor --</option>
                      {proveedores.map((p) => (
                        <option key={p.id_proveedor} value={p.id_proveedor}>
                          {p.nombre_empresa || p.nombre}
                          {p.nombre_contacto ? ` — ${p.nombre_contacto}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condición de Pago */}
                  <div className="compras-form-group">
                    <label htmlFor="compra-condicion">Condición de Pago</label>
                    <select
                      id="compra-condicion"
                      value={activeTicket.condicionesPago || 'contado'}
                      onChange={(e) => updateActiveTicket({ condicionesPago: e.target.value })}
                    >
                      <option value="contado">Contado (Pago total inmediato)</option>
                      <option value="credito">Crédito (Genera Cuenta por Pagar)</option>
                    </select>
                  </div>

                  {/* Forma de Pago */}
                  <div className="compras-form-group">
                    <label htmlFor="compra-forma">Forma de Pago</label>
                    <select
                      id="compra-forma"
                      value={activeTicket.formaPago || 'efectivo'}
                      onChange={(e) => updateActiveTicket({ formaPago: e.target.value })}
                    >
                      <option value="efectivo">Efectivo (Impacta Caja)</option>
                      <option value="tarjeta">Tarjeta (Débito/Crédito)</option>
                      <option value="transfer">Transferencia Bancaria</option>
                    </select>
                  </div>

                  {/* Fecha de Vencimiento (Solo en crédito) */}
                  {activeTicket.condicionesPago === 'credito' && (
                    <div className="compras-form-group">
                      <label htmlFor="compra-vencimiento">
                        Fecha Vencimiento <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="compra-vencimiento"
                        type="date"
                        value={activeTicket.fechaVencimiento || ''}
                        onChange={(e) => updateActiveTicket({ fechaVencimiento: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {/* Anticipo si es crédito */}
                  {activeTicket.condicionesPago === 'credito' && (
                    <div className="compras-form-group">
                      <label htmlFor="compra-anticipo">Anticipo / Pago Inicial ($)</label>
                      <input
                        id="compra-anticipo"
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalCompra}
                        value={activeTicket.montoPagadoCredito || 0}
                        onChange={(e) => updateActiveTicket({ montoPagadoCredito: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  {/* Observaciones */}
                  <div className="compras-form-group full">
                    <label htmlFor="compra-observaciones">Observaciones o Notas</label>
                    <textarea
                      id="compra-observaciones"
                      rows={2}
                      value={activeTicket.observaciones || ''}
                      onChange={(e) => updateActiveTicket({ observaciones: e.target.value })}
                      placeholder="Información adicional de la compra, factura o remisión..."
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Productos y Líneas de Compra */}
              <div className="compras-form-section">
                <span className="compras-section-title">2. Productos y Existencias a Ingresar</span>
                <div className="compras-product-picker">
                  {/* Selector de Producto */}
                  <div className="compras-form-group" style={{ margin: 0 }}>
                    <label>Producto a Abastecer</label>
                    <select
                      value={productoSeleccionadoId}
                      onChange={handleSelectProducto}
                    >
                      <option value="">-- Seleccionar producto --</option>
                      {productos.map((p) => (
                        <option key={p.id_producto} value={p.id_producto}>
                          {p.nombre} ({p.codigo || 'S/C'}) [Stock actual: {p.stock ?? 0}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad */}
                  <div className="compras-form-group" style={{ margin: 0 }}>
                    <label>Cantidad a Ingresar</label>
                    <input
                      type="number"
                      min="1"
                      value={cantidadInput}
                      onChange={(e) => setCantidadInput(e.target.value)}
                    />
                  </div>

                  {/* Costo Unitario */}
                  <div className="compras-form-group" style={{ margin: 0 }}>
                    <label>Costo Unitario Compra ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costoInput}
                      onChange={(e) => setCostoInput(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Botón Agregar */}
                  <button
                    type="button"
                    className="compras-btn-add"
                    onClick={handleAddItem}
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>

                {/* Tabla de ítems de la compra */}
                {activeTicket.items && activeTicket.items.length > 0 ? (
                  <table className="compras-items-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Costo U.</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                        <th style={{ textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTicket.items.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.codigo || '—'}</strong></td>
                          <td>{it.nombre}</td>
                          <td>
                            <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#64748b' }}>
                              {it.tipo}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>+{it.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>${Number(it.costo_unitario).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(it.subtotal).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="compras-item-remove"
                              onClick={() => handleRemoveItem(idx)}
                              title="Quitar artículo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.88rem' }}>
                    No hay productos agregados en esta orden aún.
                  </div>
                )}
              </div>

              {/* Sección 3: Totales e Integración CxP */}
              {activeTicket.items && activeTicket.items.length > 0 && (
                <div className="compras-summary-box">
                  <div className="compras-summary-row">
                    <span>Subtotal de Compra</span>
                    <span>${totalCompra.toFixed(2)}</span>
                  </div>
                  <div className="compras-summary-row total">
                    <span>Total de la Compra</span>
                    <span>${totalCompra.toFixed(2)}</span>
                  </div>
                  <div className="compras-summary-row" style={{ color: '#16a34a' }}>
                    <span>Monto Pagado / Desembolsado</span>
                    <span>${montoPagado.toFixed(2)}</span>
                  </div>
                  {saldoPendiente > 0 && (
                    <div className="compras-summary-row" style={{ color: '#b91c1c', fontWeight: 600 }}>
                      <span>Saldo Pendiente de Pago (Crédito)</span>
                      <span>${saldoPendiente.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Alerta de Cuentas por Pagar */}
                  {(activeTicket.condicionesPago === 'credito' || saldoPendiente > 0) && (
                    <div className="compras-cxp-notice">
                      <CreditCard size={18} />
                      <div>
                        <strong>Integración con Cuentas por Pagar:</strong>
                        <br />
                        Se registrará automáticamente una <strong>Cuenta por Pagar</strong> por un saldo de{' '}
                        <strong>${saldoPendiente.toFixed(2)}</strong> a favor del proveedor seleccionado, con
                        vencimiento el <strong>{activeTicket.fechaVencimiento}</strong>.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="compras-modal-footer">
            <button
              type="button"
              className="compras-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="compras-btn-primary"
              disabled={loading || !activeTicket.items || activeTicket.items.length === 0 || loadingData}
            >
              {loading ? 'Procesando...' : `Confirmar y Registrar Compra (${activeTicket.nombre})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

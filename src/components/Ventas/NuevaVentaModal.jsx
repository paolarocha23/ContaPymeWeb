import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  CreditCard,
  Lock,
  Receipt,
  RotateCcw,
  Edit2
} from 'lucide-react';
import { api } from '../../services/api';

const obtenerStorageKey = () => {
  const user = api.getUser();
  return `contapyme_tickets_${user?.empresa_id || 'default'}`;
};

const crearTicketVacio = (numero = 1) => ({
  id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  nombre: `Ticket ${numero}`,
  creadoEn: new Date().toISOString(),
  idCliente: '',
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

export default function NuevaVentaModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Catálogos
  const [clientes, setClientes] = useState([]);
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
      console.error('Error al inicializar tickets desde localStorage:', e);
    }
    return [crearTicketVacio(1)];
  });

  const [activeTicketId, setActiveTicketId] = useState(() => {
    return tickets[0]?.id || '';
  });

  // Selector temporal de producto a agregar
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);

  // Guardar tickets en localStorage cada vez que cambien
  const guardarEnStorage = useCallback((nuevosTickets) => {
    try {
      localStorage.setItem(obtenerStorageKey(), JSON.stringify(nuevosTickets));
    } catch (e) {
      console.error('Error al guardar tickets en localStorage:', e);
    }
  }, []);

  // Cargar clientes, productos y folio
  useEffect(() => {
    if (!isOpen) return;

    let activo = true;
    async function cargarCatalogos() {
      setLoadingData(true);
      setError('');
      try {
        const [respClientes, respProductos, respFolio] = await Promise.all([
          api.getClients({ estatus: 'activo' }),
          api.getProducts({ estatus: 1 }),
          api.getSiguienteFolioVenta()
        ]);

        if (!activo) return;

        const listaClientes = respClientes.data?.items || respClientes.data || [];
        const listaProductos = respProductos.data?.items || respProductos.data || [];
        setClientes(listaClientes);
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

    // Refrescar tickets desde localStorage por si otra pestaña o evento los actualizó
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
    } catch (e) {
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

  // Actualizar campos del ticket activo y sincronizar con localStorage
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
  };

  const handleEliminarTicket = (ticketIdAEliminar, e) => {
    e.stopPropagation();
    if (tickets.length <= 1) {
      // Si solo queda uno, lo vaciamos en lugar de borrarlo
      const ticketReinicio = crearTicketVacio(1);
      setTickets([ticketReinicio]);
      setActiveTicketId(ticketReinicio.id);
      guardarEnStorage([ticketReinicio]);
      setProductoSeleccionadoId('');
      setCantidadInput(1);
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
    if (window.confirm(`¿Desea vaciar todos los productos del "${activeTicket.nombre}"?`)) {
      updateActiveTicket({
        items: [],
        montoPagadoCredito: 0
      });
      setProductoSeleccionadoId('');
      setCantidadInput(1);
    }
  };

  // Agregar producto al ticket activo
  const handleSelectProducto = (e) => {
    const id = e.target.value;
    setProductoSeleccionadoId(id);
    setCantidadInput(1);
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!productoSeleccionadoId) {
      alert('Seleccione un producto o servicio.');
      return;
    }

    const prod = productos.find((p) => String(p.id_producto) === String(productoSeleccionadoId));
    if (!prod) return;

    const cant = Number(cantidadInput);
    if (!cant || cant <= 0) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }

    // EL PRECIO SIEMPRE ES EL OFICIAL REGISTRADO EN EL PRODUCTO
    const precioOficial = Number(prod.precio_venta || 0);

    // Validar existencias si es un producto físico
    if (prod.tipo === 'producto') {
      const yaEnTicket = activeTicket.items.find((it) => String(it.id_producto) === String(prod.id_producto));
      const cantTotal = cant + (yaEnTicket ? yaEnTicket.cantidad : 0);
      const stockDisponible = Number(prod.stock || 0);

      if (cantTotal > stockDisponible) {
        alert(
          `Stock insuficiente para "${prod.nombre}". Disponible: ${stockDisponible}, solicitado: ${cantTotal}`
        );
        return;
      }
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
        precio_unitario: precioOficial,
        subtotal: Math.round(nuevaCantidad * precioOficial * 100) / 100
      };
    } else {
      itemsActuales.push({
        id_producto: prod.id_producto,
        codigo: prod.codigo,
        nombre: prod.nombre,
        tipo: prod.tipo,
        cantidad: cant,
        precio_unitario: precioOficial,
        subtotal: Math.round(cant * precioOficial * 100) / 100
      });
    }

    updateActiveTicket({ items: itemsActuales });
    setProductoSeleccionadoId('');
    setCantidadInput(1);
  };

  const handleRemoveItem = (index) => {
    const nuevosItems = activeTicket.items.filter((_, i) => i !== index);
    updateActiveTicket({ items: nuevosItems });
  };

  // Cálculos de totales del ticket activo
  const totalVenta = useMemo(() => {
    const sum = (activeTicket.items || []).reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [activeTicket.items]);

  const montoPagado = useMemo(() => {
    if (activeTicket.condicionesPago === 'contado') {
      return totalVenta;
    }
    const mp = Number(activeTicket.montoPagadoCredito) || 0;
    return Math.min(totalVenta, Math.max(0, mp));
  }, [activeTicket.condicionesPago, totalVenta, activeTicket.montoPagadoCredito]);

  const saldoPendiente = useMemo(() => {
    return Math.max(0, Math.round((totalVenta - montoPagado) * 100) / 100);
  }, [totalVenta, montoPagado]);

  // Envío y registro de venta
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (activeTicket.items.length === 0) {
      setError('El ticket actual no contiene productos o servicios.');
      return;
    }

    if (activeTicket.condicionesPago === 'credito' && !activeTicket.idCliente) {
      setError('Para ventas a crédito es obligatorio seleccionar un cliente registrado.');
      return;
    }

    const payload = {
      id_cliente: activeTicket.idCliente ? Number(activeTicket.idCliente) : null,
      forma_pago: activeTicket.formaPago,
      condiciones_pago: activeTicket.condicionesPago,
      fecha_vencimiento: activeTicket.condicionesPago === 'credito' ? activeTicket.fechaVencimiento : null,
      monto_pagado: montoPagado,
      observaciones: activeTicket.observaciones ? activeTicket.observaciones.trim() : undefined,
      items: activeTicket.items.map((it) => ({
        id_producto: it.id_producto,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario
      }))
    };

    setLoading(true);
    try {
      const resp = await api.createVenta(payload);
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
        setError(resp.message || 'No se pudo registrar la venta.');
      }
    } catch (err) {
      setError(err.message || 'Error al procesar la venta.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const prodSel = productos.find((p) => String(p.id_producto) === String(productoSeleccionadoId));

  return (
    <div className="ventas-modal-backdrop" onClick={onClose}>
      <div className="ventas-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="ventas-modal-header">
          <div>
            <h3>Punto de Venta / Nueva Venta</h3>
            {folioSiguiente && (
              <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                Folio estimado: {folioSiguiente}
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

        {/* Barra de Tickets / Borradores Temporales */}
        <div className="ventas-tickets-bar">
          {tickets.map((t) => {
            const numArts = (t.items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
            const totalTab = (t.items || []).reduce((acc, it) => acc + (it.subtotal || 0), 0);
            const isActive = t.id === activeTicket.id;

            return (
              <div
                key={t.id}
                className={`ventas-ticket-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTicketId(t.id);
                  setProductoSeleccionadoId('');
                  setCantidadInput(1);
                }}
                title={`Creado: ${new Date(t.creadoEn).toLocaleTimeString('es-MX')}`}
              >
                <Receipt size={14} />
                <span>{t.nombre}</span>
                <span className="ventas-ticket-tab-meta">
                  {numArts} arts • ${totalTab.toFixed(2)}
                </span>
                <button
                  type="button"
                  className="ventas-ticket-tab-close"
                  onClick={(e) => handleEliminarTicket(t.id, e)}
                  title="Cerrar/Eliminar ticket"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className="ventas-btn-new-ticket"
            onClick={handleCrearNuevoTicket}
            title="Crear un nuevo ticket borrador temporal"
          >
            <Plus size={14} />
            Nuevo Ticket
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} className="ventas-modal-body">
          {/* Barra de control del Ticket Activo */}
          <div className="ventas-ticket-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit2 size={14} color="#64748b" />
              <input
                type="text"
                className="ventas-ticket-name-input"
                value={activeTicket.nombre}
                onChange={(e) => updateActiveTicket({ nombre: e.target.value })}
                placeholder="Nombre del ticket..."
                title="Haga clic para renombrar este ticket (ej. Mesa 4, Mostrador, Pedido Juan)"
              />
            </div>
            {activeTicket.items.length > 0 && (
              <button
                type="button"
                className="ventas-btn-clear-ticket"
                onClick={handleVaciarTicketActual}
                title="Vaciar artículos de este ticket"
              >
                <RotateCcw size={13} />
                Vaciar Ticket
              </button>
            )}
          </div>

          {error && (
            <div
              className="ventas-cxc-notice"
              style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b' }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="ventas-loading">
              <div className="ventas-spinner" />
              <span>Cargando catálogo de productos y clientes...</span>
            </div>
          ) : (
            <>
              {/* Sección 1: Datos Generales */}
              <div className="ventas-form-section">
                <span className="ventas-section-title">1. Datos Generales de la Venta</span>
                <div className="ventas-form-grid">
                  {/* Cliente */}
                  <div className="ventas-form-group">
                    <label htmlFor="venta-cliente">
                      Cliente{' '}
                      {activeTicket.condicionesPago === 'credito' && (
                        <span style={{ color: '#ef4444' }}>*</span>
                      )}
                    </label>
                    <select
                      id="venta-cliente"
                      value={activeTicket.idCliente || ''}
                      onChange={(e) => updateActiveTicket({ idCliente: e.target.value })}
                      required={activeTicket.condicionesPago === 'credito'}
                    >
                      <option value="">-- Público en General --</option>
                      {clientes.map((c) => (
                        <option key={c.id_cliente} value={c.id_cliente}>
                          {c.nombre_completo || c.nombre} {c.rfc ? `(${c.rfc})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condición de Pago */}
                  <div className="ventas-form-group">
                    <label htmlFor="venta-condicion">Condición de Pago</label>
                    <select
                      id="venta-condicion"
                      value={activeTicket.condicionesPago || 'contado'}
                      onChange={(e) => updateActiveTicket({ condicionesPago: e.target.value })}
                    >
                      <option value="contado">Contado (Pago total)</option>
                      <option value="credito">Crédito (Cuenta por Cobrar)</option>
                    </select>
                  </div>

                  {/* Forma de Pago */}
                  <div className="ventas-form-group">
                    <label htmlFor="venta-forma">Forma de Pago</label>
                    <select
                      id="venta-forma"
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
                    <div className="ventas-form-group">
                      <label htmlFor="venta-vencimiento">
                        Fecha Vencimiento <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        id="venta-vencimiento"
                        type="date"
                        value={activeTicket.fechaVencimiento || ''}
                        onChange={(e) => updateActiveTicket({ fechaVencimiento: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {/* Anticipo si es crédito */}
                  {activeTicket.condicionesPago === 'credito' && (
                    <div className="ventas-form-group">
                      <label htmlFor="venta-anticipo">Anticipo / Pago Inicial ($)</label>
                      <input
                        id="venta-anticipo"
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalVenta}
                        value={activeTicket.montoPagadoCredito || 0}
                        onChange={(e) => updateActiveTicket({ montoPagadoCredito: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  {/* Observaciones */}
                  <div className="ventas-form-group full">
                    <label htmlFor="venta-observaciones">Observaciones o Notas</label>
                    <textarea
                      id="venta-observaciones"
                      rows={2}
                      value={activeTicket.observaciones || ''}
                      onChange={(e) => updateActiveTicket({ observaciones: e.target.value })}
                      placeholder="Información adicional sobre la venta..."
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Productos y Servicios */}
              <div className="ventas-form-section">
                <span className="ventas-section-title">2. Productos y Servicios</span>
                <div className="ventas-product-picker">
                  {/* Selector de Producto */}
                  <div className="ventas-form-group" style={{ margin: 0 }}>
                    <label>Producto / Servicio</label>
                    <select
                      value={productoSeleccionadoId}
                      onChange={handleSelectProducto}
                    >
                      <option value="">-- Seleccionar producto --</option>
                      {productos.map((p) => (
                        <option key={p.id_producto} value={p.id_producto}>
                          {p.nombre} ({p.codigo || 'S/C'}) - ${Number(p.precio_venta || 0).toFixed(2)}
                          {p.tipo === 'producto' ? ` [Stock: ${p.stock ?? 0}]` : ' [Servicio]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad */}
                  <div className="ventas-form-group" style={{ margin: 0 }}>
                    <label>
                      Cantidad {prodSel?.tipo === 'producto' && `(Máx: ${prodSel.stock})`}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={prodSel?.tipo === 'producto' ? prodSel.stock : undefined}
                      value={cantidadInput}
                      onChange={(e) => setCantidadInput(e.target.value)}
                    />
                  </div>

                  {/* Precio Unitario (BLOQUEADO / NO MODIFICABLE) */}
                  <div className="ventas-form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} color="#64748b" />
                      Precio Catálogo ($)
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      className="ventas-input-readonly"
                      value={prodSel ? `$${Number(prodSel.precio_venta || 0).toFixed(2)}` : '—'}
                      title="El precio no es modificable, se toma del catálogo de productos"
                    />
                  </div>

                  {/* Botón Agregar */}
                  <button
                    type="button"
                    className="ventas-btn-add"
                    onClick={handleAddItem}
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>

                {/* Tabla de ítems del ticket */}
                {activeTicket.items && activeTicket.items.length > 0 ? (
                  <table className="ventas-items-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'center' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Precio U.</th>
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
                          <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>${Number(it.precio_unitario).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(it.subtotal).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="ventas-item-remove"
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
                    No hay productos agregados en este ticket aún.
                  </div>
                )}
              </div>

              {/* Sección 3: Totales y CxC */}
              {activeTicket.items && activeTicket.items.length > 0 && (
                <div className="ventas-summary-box">
                  <div className="ventas-summary-row">
                    <span>Subtotal</span>
                    <span>${totalVenta.toFixed(2)}</span>
                  </div>
                  <div className="ventas-summary-row total">
                    <span>Total a Pagar</span>
                    <span>${totalVenta.toFixed(2)}</span>
                  </div>
                  <div className="ventas-summary-row" style={{ color: '#16a34a' }}>
                    <span>Monto Cobrado / Pagado</span>
                    <span>${montoPagado.toFixed(2)}</span>
                  </div>
                  {saldoPendiente > 0 && (
                    <div className="ventas-summary-row" style={{ color: '#b91c1c', fontWeight: 600 }}>
                      <span>Saldo Pendiente (Crédito)</span>
                      <span>${saldoPendiente.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Alerta de CxC */}
                  {(activeTicket.condicionesPago === 'credito' || saldoPendiente > 0) && (
                    <div className="ventas-cxc-notice">
                      <CreditCard size={18} />
                      <div>
                        <strong>Integración con Cuentas por Cobrar:</strong>
                        <br />
                        Se registrará automáticamente una <strong>Cuenta por Cobrar</strong> por un saldo de{' '}
                        <strong>${saldoPendiente.toFixed(2)}</strong> a nombre del cliente seleccionado, con
                        vencimiento el <strong>{activeTicket.fechaVencimiento}</strong>.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="ventas-modal-footer">
            <button
              type="button"
              className="ventas-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="ventas-btn-primary"
              disabled={loading || !activeTicket.items || activeTicket.items.length === 0 || loadingData}
            >
              {loading ? 'Procesando...' : `Cobrar / Confirmar Venta (${activeTicket.nombre})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Check, User, Banknote, CreditCard, Wallet, CalendarClock, Calendar, Info, Search,
  Plus, Minus, Trash2, Package, Wrench, CircleAlert, RotateCw, X
} from 'lucide-react';
import { api } from '../../services/api';
import { unMesDespues, construirTicket, guardarTicket, formatMoney } from '../../utils/ventasUtils';

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export default function NuevaVentaView({ onBack, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [folio, setFolio] = useState('');

  // Datos de la venta
  const [idCliente, setIdCliente] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [abiertoCliente, setAbiertoCliente] = useState(false);
  const [formaPago, setFormaPago] = useState('efectivo');
  const [condiciones, setCondiciones] = useState('contado');
  const [vencimiento, setVencimiento] = useState(unMesDespues());
  const [observaciones, setObservaciones] = useState('');
  const [anticipo, setAnticipo] = useState('');

  // Líneas y buscador
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [errBusqueda, setErrBusqueda] = useState('');

  const usuario = api.getUser?.() || {};
  const vendedor = usuario.nombre_completo || usuario.nombre || usuario.name || usuario.username || '—';
  const hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [rc, rp, rf] = await Promise.all([
          api.getClients({ estatus: 'activo' }),
          api.getProducts({ estatus: 1 }),
          api.getSiguienteFolioVenta()
        ]);
        if (!activo) return;
        setClientes(rc.data?.items || rc.data || []);
        setProductos(rp.data?.items || rp.data || []);
        setFolio(rf?.data?.folio || '');
      } catch (err) {
        if (activo) setError(err.message || 'Error al cargar los catálogos.');
      } finally {
        if (activo) setLoadingData(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // ---------- Totales ----------
  const total = useMemo(() => redondear(items.reduce((a, it) => a + it.cantidad * it.precio_unitario, 0)), [items]);
  const montoPagado = condiciones === 'contado'
    ? total
    : redondear(Math.min(total, Math.max(0, Number(anticipo) || 0)));
  const saldo = redondear(Math.max(0, total - montoPagado));
  const clienteObligatorio = condiciones === 'credito' || saldo > 0;

  // ---------- Validaciones ----------
  const excede = (it) => it.tipo === 'producto' && it.cantidad > it.stock;
  const errCliente = clienteObligatorio && !idCliente
    ? 'Las ventas con saldo pendiente requieren registrar al cliente.' : '';
  const errFecha = condiciones === 'credito' && !vencimiento ? 'Obligatoria a crédito.' : '';
  const hayStock = items.some(excede);
  const hayErrores = Boolean(errCliente || errFecha || hayStock);
  const invalido = items.length === 0 || hayErrores;

  let estatus = ['red', 'No se puede confirmar'];
  if (!invalido) {
    if (saldo === 0) estatus = ['green', 'Pagada'];
    else if (montoPagado > 0) estatus = ['blue', 'Pago parcial'];
    else estatus = ['amber', 'Pendiente de pago'];
  }

  // ---------- Clientes y buscador ----------
  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id_cliente) === String(idCliente)),
    [clientes, idCliente]
  );

  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter((c) => {
        const nom = (c.nombre_completo || `${c.nombre || c.nombre_cliente || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`).toLowerCase();
        const rfc = String(c.rfc || '').toLowerCase();
        const tel = String(c.telefono || '').toLowerCase();
        return nom.includes(q) || rfc.includes(q) || tel.includes(q);
      })
      .slice(0, 8);
  }, [clientes, busquedaCliente]);

  // ---------- Buscador ----------
  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos.slice(0, 8);
    return productos
      .filter((p) => `${p.nombre} ${p.codigo || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [productos, busqueda]);

  const elegir = (p) => {
    setSeleccionado(p);
    setBusqueda(p.nombre);
    setAbierto(false);
    setErrBusqueda('');
  };

  const agregar = () => {
    const prod = seleccionado || (busqueda.trim() && resultados.length === 1 ? resultados[0] : null);
    if (!prod) {
      setErrBusqueda('Selecciona un producto o servicio de la lista.');
      return;
    }
    setItems((prev) => {
      const existe = prev.find((it) => String(it.id_producto) === String(prod.id_producto));
      if (existe) {
        return prev.map((it) => (it === existe ? { ...it, cantidad: redondear(it.cantidad + 1) } : it));
      }
      return [
        ...prev,
        {
          id_producto: prod.id_producto,
          codigo: prod.codigo,
          nombre: prod.nombre,
          tipo: prod.tipo,
          stock: Number(prod.stock || 0),
          cantidad: 1,
          precio_unitario: Number(prod.precio_venta || 0)
        }
      ];
    });
    setSeleccionado(null);
    setBusqueda('');
    setErrBusqueda('');
  };

  const cambiarCantidad = (id, valor) => {
    const n = Number(valor);
    setItems((prev) =>
      prev.map((it) => (it.id_producto === id ? { ...it, cantidad: Number.isFinite(n) && n > 0 ? n : 1 } : it))
    );
  };
  const quitar = (id) => setItems((prev) => prev.filter((it) => it.id_producto !== id));

  // ---------- Confirmar ----------
  const confirmar = async () => {
    if (invalido) return;
    setError('');
    const payload = {
      id_cliente: idCliente ? Number(idCliente) : null,
      forma_pago: formaPago,
      condiciones_pago: condiciones,
      fecha_vencimiento: condiciones === 'credito' ? vencimiento : null,
      monto_pagado: montoPagado,
      observaciones: observaciones.trim() || undefined,
      items: items.map((it) => ({ id_producto: it.id_producto, cantidad: it.cantidad }))
    };

    setLoading(true);
    try {
      const resp = await api.createVenta(payload);
      if (!resp.success) {
        setError(resp.message || 'No se pudo registrar la venta.');
        return;
      }
      const ticket = construirTicket(resp.data);
      guardarTicket(ticket);
      onSuccess?.(resp.data, ticket);
    } catch (err) {
      setError(err.message || 'Error al procesar la venta.');
    } finally {
      setLoading(false);
    }
  };

  const cantidadPiezas = (it) => (it.stock === 1 ? '1 pieza' : `${it.stock} piezas`);

  return (
    <div className="ven">
      {/* Encabezado */}
      <div className="ven-title">
        <div className="ven-title-left">
          <button type="button" className="ven-back" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <h2>Nueva venta</h2>
        </div>
        <div className="ven-title-actions">
          <button type="button" className="ven-btn ven-btn-outline" onClick={onBack} disabled={loading}>Cancelar</button>
          <button
            type="button"
            className="ven-btn ven-btn-primary"
            onClick={confirmar}
            disabled={invalido || loading || loadingData}
          >
            {loading ? <RotateCw className="spinning" size={16} /> : <Check size={16} />}
            {loading ? 'Procesando...' : 'Confirmar venta'}
          </button>
        </div>
      </div>

      {error && (
        <div className="ven-alert"><CircleAlert size={18} />{error}</div>
      )}

      {loadingData ? (
        <div className="ven-card ven-lines-empty">
          <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
          <div style={{ marginTop: 10 }}>Cargando productos y clientes...</div>
        </div>
      ) : (
        <div className="ven-new">
          {/* ---------- Columna principal ---------- */}
          <div className="ven-new-main">
            <section className="ven-card">
              <div className="ven-card-head">
                <h3 className="ven-card-title">Datos de la venta</h3>
                <small><span style={{ color: '#C2362F' }}>*</span> obligatorio</small>
              </div>

              <div className="ven-grid-1">
                <div className="ven-field">
                  <label htmlFor="v-cliente">Cliente{clienteObligatorio && <i>*</i>}</label>
                  {clienteSeleccionado ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#EEF2FC',
                        border: '1px solid #C7D7FE',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <User size={18} style={{ color: '#142A95', flexShrink: 0 }} />
                        <div>
                          <b style={{ display: 'block', fontSize: '13px', color: '#0B132B' }}>
                            {clienteSeleccionado.nombre_completo || clienteSeleccionado.nombre || clienteSeleccionado.nombre_cliente}
                          </b>
                          <small style={{ fontSize: '11px', color: '#6B7280' }}>
                            {clienteSeleccionado.rfc ? `RFC: ${clienteSeleccionado.rfc} · ` : ''}
                            {clienteSeleccionado.telefono ? `Tel: ${clienteSeleccionado.telefono}` : 'Sin teléfono'}
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIdCliente('');
                          setBusquedaCliente('');
                          setAbiertoCliente(true);
                        }}
                        style={{
                          border: 'none',
                          background: '#fff',
                          color: '#6B7280',
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                        }}
                        title="Cambiar cliente"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div className={`ven-input${errCliente ? ' err' : ''}`}>
                        <Search size={16} />
                        <input
                          id="v-cliente"
                          value={busquedaCliente}
                          placeholder={clienteObligatorio ? "Buscar cliente por nombre, RFC o teléfono..." : "Buscar cliente o dejar en Público en general..."}
                          onChange={(e) => {
                            setBusquedaCliente(e.target.value);
                            setAbiertoCliente(true);
                          }}
                          onFocus={() => setAbiertoCliente(true)}
                          onBlur={() => setTimeout(() => setAbiertoCliente(false), 200)}
                        />
                        {busquedaCliente && (
                          <button
                            type="button"
                            onClick={() => setBusquedaCliente('')}
                            style={{ border: 'none', background: 'transparent', color: '#9AA1B8', cursor: 'pointer', padding: 4 }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {abiertoCliente && (
                        <div className="ven-results" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30 }}>
                          {!clienteObligatorio && (
                            <button
                              type="button"
                              className="ven-result"
                              onMouseDown={() => {
                                setIdCliente('');
                                setBusquedaCliente('');
                                setAbiertoCliente(false);
                              }}
                            >
                              <span className="ven-line-ico"><User size={16} /></span>
                              <span>
                                <b>Público en general</b>
                                <small>Venta directa sin asociar a cuenta de cliente</small>
                              </span>
                            </button>
                          )}
                          {clientesFiltrados.map((c) => {
                            const nom = c.nombre_completo || `${c.nombre || c.nombre_cliente || ''} ${c.apellido_paterno || ''}`.trim();
                            return (
                              <button
                                type="button"
                                key={c.id_cliente}
                                className="ven-result"
                                onMouseDown={() => {
                                  setIdCliente(String(c.id_cliente));
                                  setBusquedaCliente('');
                                  setAbiertoCliente(false);
                                }}
                              >
                                <span className="ven-line-ico"><User size={16} /></span>
                                <span>
                                  <b>{nom}</b>
                                  <small>
                                    {c.rfc ? `RFC: ${c.rfc} · ` : ''}
                                    {c.telefono ? `Tel: ${c.telefono}` : 'Sin teléfono'}
                                  </small>
                                </span>
                              </button>
                            );
                          })}
                          {clientesFiltrados.length === 0 && (
                            <div style={{ padding: '12px 14px', fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
                              No se encontraron clientes que coincidan con "{busquedaCliente}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {errCliente && <div className="ven-err"><CircleAlert size={13} />{errCliente}</div>}
                </div>

                <div className="ven-field">
                  <label>Forma de pago<i>*</i></label>
                  <div className="ven-seg">
                    <button type="button" className={formaPago === 'efectivo' ? 'on' : ''} onClick={() => setFormaPago('efectivo')}>
                      <Banknote size={15} /> Efectivo
                    </button>
                    <button type="button" className={formaPago === 'tarjeta' ? 'on' : ''} onClick={() => setFormaPago('tarjeta')}>
                      <CreditCard size={15} /> Tarjeta
                    </button>
                  </div>
                </div>

                <div className="ven-field">
                  <label>Condiciones<i>*</i></label>
                  <div className="ven-seg">
                    <button
                      type="button"
                      className={condiciones === 'contado' ? 'on' : ''}
                      onClick={() => { setCondiciones('contado'); setAnticipo(''); }}
                    >
                      <Wallet size={15} /> Contado
                    </button>
                    <button
                      type="button"
                      className={condiciones === 'credito' ? 'on' : ''}
                      onClick={() => { setCondiciones('credito'); setVencimiento(unMesDespues()); setAnticipo(''); }}
                    >
                      <CalendarClock size={15} /> Crédito
                    </button>
                  </div>
                </div>
              </div>

              <div className={`ven-grid-2${condiciones === 'credito' ? '' : ' solo'}`}>
                {condiciones === 'credito' && (
                  <div className="ven-field">
                    <label htmlFor="v-venc">Fecha de vencimiento<i>*</i></label>
                    <div className={`ven-input${errFecha ? ' err' : ''}`}>
                      <Calendar size={16} />
                      <input
                        id="v-venc"
                        type="date"
                        value={vencimiento}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setVencimiento(e.target.value)}
                      />
                    </div>
                    {errFecha && <div className="ven-err"><CircleAlert size={13} />{errFecha}</div>}
                  </div>
                )}

                <div className="ven-field">
                  <label htmlFor="v-obs">Observaciones</label>
                  <div className="ven-input">
                    <Info size={16} />
                    <input
                      id="v-obs"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Notas de la venta (opcional)"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="ven-card">
              <div className="ven-card-head">
                <h3 className="ven-card-title">Productos y servicios</h3>
                <small>{items.length} {items.length === 1 ? 'línea' : 'líneas'}</small>
              </div>

              <div className="ven-picker">
                <div className="ven-search">
                  <div className="ven-input">
                    <Search size={16} />
                    <input
                      value={busqueda}
                      placeholder="Buscar producto o servicio por nombre o código..."
                      onChange={(e) => { setBusqueda(e.target.value); setSeleccionado(null); setAbierto(true); setErrBusqueda(''); }}
                      onFocus={() => setAbierto(true)}
                      onBlur={() => setTimeout(() => setAbierto(false), 150)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
                    />
                  </div>
                  {abierto && resultados.length > 0 && (
                    <div className="ven-results">
                      {resultados.map((p) => (
                        <button type="button" key={p.id_producto} className="ven-result" onMouseDown={() => elegir(p)}>
                          <span className="ven-line-ico">{p.tipo === 'producto' ? <Package size={17} /> : <Wrench size={17} />}</span>
                          <span>
                            <b>{p.nombre}</b>
                            <small>
                              {p.codigo || 'S/C'} · {p.tipo === 'producto' ? `Stock: ${p.stock ?? 0}` : 'Servicio'}
                            </small>
                          </span>
                          <span className="ven-result-price">{formatMoney(p.precio_venta)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {errBusqueda && <div className="ven-err" style={{ marginTop: 6 }}><CircleAlert size={13} />{errBusqueda}</div>}
                </div>
                <button type="button" className="ven-btn ven-btn-outline" style={{ height: 44 }} onClick={agregar}>
                  <Plus size={16} /> Agregar
                </button>
              </div>

              {items.length === 0 ? (
                <div className="ven-lines-empty">Busca y agrega al menos un producto o servicio a la venta.</div>
              ) : (
                <>
                  <div className="ven-lines-head">
                    <span>Producto o servicio</span><span>Cantidad</span><span>Precio unit.</span><span>Subtotal</span><span />
                  </div>
                  {items.map((it) => {
                    const sinStock = excede(it);
                    return (
                      <div className="ven-line" key={it.id_producto}>
                        <div className="ven-line-prod">
                          <span className="ven-line-ico">{it.tipo === 'producto' ? <Package size={17} /> : <Wrench size={17} />}</span>
                          <div style={{ minWidth: 0 }}>
                            <b>{it.nombre}</b>
                            {it.tipo === 'producto'
                              ? <small className={sinStock ? 'err' : ''}>{sinStock ? 'Existencia disponible' : 'Disponible'}: {cantidadPiezas(it)}</small>
                              : <small>Servicio · sin inventario</small>}
                          </div>
                        </div>
                        <div className={`ven-stepper${sinStock ? ' err' : ''}`}>
                          <button type="button" aria-label="Disminuir" onClick={() => cambiarCantidad(it.id_producto, Math.max(1, it.cantidad - 1))}>
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={it.cantidad}
                            onChange={(e) => cambiarCantidad(it.id_producto, e.target.value)}
                          />
                          <button type="button" aria-label="Aumentar" onClick={() => cambiarCantidad(it.id_producto, it.cantidad + 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="ven-line-num strong">{formatMoney(it.precio_unitario)}</span>
                        <span className="ven-line-num strong">{formatMoney(it.cantidad * it.precio_unitario)}</span>
                        <button type="button" className="ven-trash" title="Quitar" onClick={() => quitar(it.id_producto)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </section>
          </div>

          {/* ---------- Columna lateral ---------- */}
          <aside className="ven-new-side">
            <section className="ven-card">
              <h3 className="ven-card-title" style={{ fontSize: 15 }}>Resumen</h3>
              <div className="ven-sum-row"><span>Subtotal</span><b>{formatMoney(total)}</b></div>
              <div className="ven-sum-row">
                <span>Monto pagado</span>
                {condiciones === 'credito' ? (
                  <label className="ven-sum-pay">
                    $
                    <input
                      type="number"
                      min="0"
                      max={total}
                      step="0.01"
                      placeholder="0.00"
                      value={anticipo}
                      onChange={(e) => setAnticipo(e.target.value)}
                    />
                  </label>
                ) : (
                  <b>{formatMoney(montoPagado)}</b>
                )}
              </div>
              <div className="ven-sum-row amber"><span>Saldo pendiente</span><b>{formatMoney(saldo)}</b></div>
              <div className="ven-sum-row">
                <span>Estatus resultante</span>
                <span className={`ven-pill ${estatus[0]}`}>{estatus[1]}</span>
              </div>
              <div className="ven-sum-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
            </section>

            <section className="ven-card">
              <h4 className="ven-auto-title">Asignado automáticamente</h4>
              <div className="ven-auto-row"><span>Código</span><b>{folio || '—'}</b></div>
              <div className="ven-auto-row"><span>Fecha</span><b>{hoy}</b></div>
              <div className="ven-auto-row"><span>Vendedor</span><b>{vendedor}</b></div>
            </section>

            {hayErrores ? (
              <div className="ven-note err">
                <CircleAlert size={16} />Corrige los campos marcados para confirmar la venta.
              </div>
            ) : items.length === 0 ? (
              <div className="ven-note"><Info size={16} />Agrega al menos un producto o servicio para confirmar la venta.</div>
            ) : (
              <div className="ven-note">
                <Info size={16} />
                Al confirmar, la venta descuenta el inventario y genera ingreso y cuenta por cobrar si queda saldo.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
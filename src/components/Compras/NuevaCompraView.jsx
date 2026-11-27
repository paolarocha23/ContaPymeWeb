import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Check, Search, Plus, Trash2, Truck, Calendar, Info, Package, Wrench,
  Banknote, CreditCard, Landmark, Wallet, CircleAlert, RotateCw, X
} from 'lucide-react';
import { api } from '../../services/api';
import { formatMoney, formatFechaCorta, formatFechaISO, redondear, unMesDespues, hoyISO } from '../../utils/opUtils';
import { Pill, Seg, Stepper } from '../Operaciones/Shared';
import '../Operaciones/Operaciones.css';

export default function NuevaCompraView({ onBack, onSuccess }) {
  const usuario = api.getUser();
  const nombreUsuario =
    usuario?.nombre_completo || [usuario?.nombre, usuario?.apellido_paterno].filter(Boolean).join(' ') || usuario?.nombre_usuario || '—';

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [folio, setFolio] = useState('');

  const [idProveedor, setIdProveedor] = useState('');
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [abiertoProveedor, setAbiertoProveedor] = useState(false);
  const [condiciones, setCondiciones] = useState('contado');
  const [fechaVenc, setFechaVenc] = useState(unMesDespues());
  const [formaPago, setFormaPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [anticipo, setAnticipo] = useState('');
  const [items, setItems] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [rp, rpr, rf] = await Promise.all([
          api.getSuppliers({ estatus: 1 }),
          api.getProducts({ estatus: 1 }),
          api.getSiguienteFolioCompra()
        ]);
        if (!activo) return;
        setProveedores(rp.data?.items || rp.data || []);
        setProductos(rpr.data?.items || rpr.data || []);
        setFolio(rf?.data?.siguiente_folio || rf?.data?.folio || '');
      } catch (err) {
        if (activo) setErrorCarga(err.message || 'No se pudieron cargar los catálogos.');
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  /* ---------- Cálculos ---------- */
  const esCredito = condiciones === 'credito';
  const total = redondear(items.reduce((a, it) => a + it.cantidad * it.costo, 0));
  const pagado = esCredito ? redondear(Math.min(total, Math.max(0, Number(anticipo) || 0))) : total;
  const saldo = redondear(Math.max(0, total - pagado));

  const errProveedor = items.length > 0 && !idProveedor ? 'Selecciona un proveedor.' : '';
  const errFecha = esCredito ? (!fechaVenc ? 'Obligatoria a crédito.' : fechaVenc < hoyISO() ? 'No puede ser anterior a hoy.' : '') : '';
  const errItem = (it) => !(it.cantidad > 0) || !(it.costo >= 0);
  const hayErrores = Boolean(errProveedor || errFecha || items.some(errItem));
  const puedeConfirmar = items.length > 0 && Boolean(idProveedor) && !hayErrores && total > 0 && !enviando;

  let tono = 'gray';
  let txt = '—';
  if (items.length > 0) {
    if (hayErrores) { tono = 'red'; txt = 'No se puede confirmar'; }
    else if (saldo === 0) { tono = 'green'; txt = 'Pagada'; }
    else if (pagado > 0) { tono = 'blue'; txt = 'Pago parcial'; }
    else { tono = 'amber'; txt = 'Pendiente de pago'; }
  }

  /* ---------- Proveedor ---------- */
  const proveedorSeleccionado = useMemo(() => {
    if (!idProveedor) return null;
    return proveedores.find((p) => String(p.id_proveedor ?? p.id) === String(idProveedor));
  }, [proveedores, idProveedor]);

  const proveedoresFiltrados = useMemo(() => {
    const qp = busquedaProveedor.trim().toLowerCase();
    if (!qp) return proveedores.slice(0, 8);
    return proveedores
      .filter((p) => {
        const empresa = (p.nombre_empresa || p.nombre || '').toLowerCase();
        const contacto = (p.nombre_contacto || '').toLowerCase();
        const rfc = String(p.rfc || '').toLowerCase();
        const tel = String(p.telefono || '').toLowerCase();
        return empresa.includes(qp) || contacto.includes(qp) || rfc.includes(qp) || tel.includes(qp);
      })
      .slice(0, 8);
  }, [proveedores, busquedaProveedor]);

  /* ---------- Productos ---------- */
  const q = busqueda.trim().toLowerCase();
  const coincidencias = useMemo(
    () => productos.filter((p) => !q || p.nombre?.toLowerCase().includes(q) || String(p.codigo || '').toLowerCase().includes(q)).slice(0, 8),
    [productos, q]
  );

  const agregar = () => {
    const p = seleccion || (q && coincidencias.length === 1 ? coincidencias[0] : null);
    if (!p) { setAbierto(true); return; }
    setItems((prev) => {
      const ex = prev.find((i) => String(i.id_producto) === String(p.id_producto));
      if (ex) return prev.map((i) => (i === ex ? { ...i, cantidad: redondear(i.cantidad + 1) } : i));
      return [...prev, {
        id_producto: p.id_producto, codigo: p.codigo, nombre: p.nombre, tipo: p.tipo,
        stock: Number(p.stock || 0), unidad: String(p.unidad_medida || 'piezas').toLowerCase(),
        costo: Number(p.precio_compra || 0), cantidad: 1
      }];
    });
    setSeleccion(null); setBusqueda(''); setAbierto(false);
  };

  const editar = (id, campos) => setItems((prev) => prev.map((i) => (i.id_producto === id ? { ...i, ...campos } : i)));
  const quitar = (id) => setItems((prev) => prev.filter((i) => i.id_producto !== id));

  /* ---------- Envío ---------- */
  const confirmar = async () => {
    if (!puedeConfirmar) return;
    setEnviando(true);
    setErrorEnvio('');
    try {
      const resp = await api.createCompra({
        id_proveedor: Number(idProveedor),
        forma_pago: formaPago,
        condiciones_pago: condiciones,
        fecha_vencimiento: esCredito ? fechaVenc : null,
        monto_pagado: pagado,
        observaciones: observaciones.trim() || undefined,
        items: items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad, costo_unitario: i.costo }))
      });
      if (!resp.success) { setErrorEnvio(resp.message || 'No se pudo registrar la compra.'); return; }
      window.dispatchEvent(new CustomEvent('contapyme_operacion_registrada'));
      onSuccess(resp.data);
    } catch (err) {
      setErrorEnvio(err.message || 'Error al procesar la compra.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="op"><div className="op-empty" style={{ padding: '80px 0' }}>
        <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
        <div style={{ marginTop: 10 }}>Cargando catálogos...</div>
      </div></div>
    );
  }

  return (
    <div className="op">
      <div className="op-title">
        <div className="op-headline">
          <button type="button" className="op-back" onClick={onBack} aria-label="Volver"><ArrowLeft size={20} /></button>
          <div>
            <h2>Nueva compra</h2>
            <p>Código {folio || 'OC-----'} · se asigna automáticamente</p>
          </div>
        </div>
        <div className="op-title-actions">
          <button type="button" className="btn btn-secondary op-round" onClick={onBack} disabled={enviando}>Cancelar</button>
          <button type="button" className="btn btn-primary op-round" onClick={confirmar} disabled={!puedeConfirmar}>
            <Check size={16} /> {enviando ? 'Procesando...' : 'Confirmar compra'}
          </button>
        </div>
      </div>

      {(errorCarga || errorEnvio) && (
        <div className="alert alert-error" style={{ marginBottom: 0 }}>
          <CircleAlert size={18} /><div style={{ flex: 1 }}>{errorCarga || errorEnvio}</div>
        </div>
      )}

      <div className="op-new">
        <div className="op-left">
          <div className="content-box op-card">
            <div className="op-prod-head"><h4>Datos de la compra</h4><span className="op-req-note">* obligatorio</span></div>
            <div className="op-grid">
              <div>
                <label className="op-label">Proveedor <i>*</i></label>
                {proveedorSeleccionado ? (
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
                      <Truck size={18} style={{ color: '#142A95', flexShrink: 0 }} />
                      <div>
                        <b style={{ display: 'block', fontSize: '13px', color: '#0B132B' }}>
                          {proveedorSeleccionado.nombre_empresa || proveedorSeleccionado.nombre}
                        </b>
                        <small style={{ fontSize: '11px', color: '#6B7280' }}>
                          {proveedorSeleccionado.nombre_contacto ? `Contacto: ${proveedorSeleccionado.nombre_contacto} · ` : ''}
                          {proveedorSeleccionado.telefono ? `Tel: ${proveedorSeleccionado.telefono}` : ''}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIdProveedor('');
                        setBusquedaProveedor('');
                        setAbiertoProveedor(true);
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
                      title="Cambiar proveedor"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="op-field" style={{ position: 'relative' }}>
                    <Search size={16} />
                    <input
                      className={`op-input${errProveedor ? ' err' : ''}`}
                      placeholder="Buscar proveedor por empresa o contacto..."
                      value={busquedaProveedor}
                      onFocus={() => setAbiertoProveedor(true)}
                      onBlur={() => setTimeout(() => setAbiertoProveedor(false), 200)}
                      onChange={(e) => {
                        setBusquedaProveedor(e.target.value);
                        setAbiertoProveedor(true);
                      }}
                    />
                    {busquedaProveedor && (
                      <button
                        type="button"
                        onClick={() => setBusquedaProveedor('')}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'transparent',
                          color: '#9AA1B8',
                          cursor: 'pointer',
                          padding: 2
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {abiertoProveedor && (
                      <div className="op-dd" onMouseDown={(e) => e.preventDefault()}>
                        {proveedoresFiltrados.length === 0 ? (
                          <div className="op-dd-empty">No se encontraron proveedores que coincidan con "{busquedaProveedor}".</div>
                        ) : (
                          proveedoresFiltrados.map((p) => {
                            const pid = p.id_proveedor ?? p.id;
                            const emp = p.nombre_empresa || p.nombre;
                            return (
                              <button
                                type="button"
                                key={pid}
                                onClick={() => {
                                  setIdProveedor(String(pid));
                                  setBusquedaProveedor('');
                                  setAbiertoProveedor(false);
                                }}
                              >
                                <span>
                                  <b>{emp}</b>
                                  <small>
                                    {p.nombre_contacto ? `Contacto: ${p.nombre_contacto} · ` : ''}
                                    {p.telefono || 'Sin teléfono'}
                                  </small>
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
                {errProveedor && <div className="op-err"><CircleAlert size={13} />{errProveedor}</div>}
              </div>

              <div>
                <label className="op-label">Condiciones de pago <i>*</i></label>
                <Seg
                  value={condiciones}
                  onChange={(v) => { setCondiciones(v); if (v === 'credito') setFechaVenc(unMesDespues()); else setAnticipo(''); }}
                  options={[
                    { value: 'contado', label: 'Contado', icon: <Wallet size={14} /> },
                    { value: 'credito', label: 'Crédito', icon: <CreditCard size={14} /> }
                  ]}
                />
              </div>

              <div>
                <label className="op-label">Fecha de vencimiento {esCredito && <i>*</i>}</label>
                <div className="op-field">
                  <Calendar size={16} />
                  <input type="date" className={`op-input${errFecha ? ' err' : ''}`} value={esCredito ? fechaVenc : ''} min={hoyISO()} disabled={!esCredito} onChange={(e) => setFechaVenc(e.target.value)} />
                </div>
                {errFecha && <div className="op-err"><CircleAlert size={13} />{errFecha}</div>}
              </div>

              <div>
                <label className="op-label">Forma de pago</label>
                <Seg
                  value={formaPago}
                  onChange={setFormaPago}
                  options={[
                    { value: 'efectivo', label: 'Efectivo', icon: <Banknote size={14} /> },
                    { value: 'tarjeta', label: 'Tarjeta', icon: <CreditCard size={14} /> }
                  ]}
                />
              </div>

              <div className="full">
                <label className="op-label">Observaciones</label>
                <div className="op-field">
                  <Info size={16} />
                  <input className="op-input" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Factura, remisión o notas (opcional)" />
                </div>
              </div>
            </div>
          </div>

          <div className="content-box op-card">
            <div className="op-prod-head"><h4>Productos</h4><span>{items.length} {items.length === 1 ? 'línea' : 'líneas'}</span></div>

            <div className="op-searchrow">
              <div className="op-field">
                <Search size={16} />
                <input
                  className="op-input" placeholder="Buscar producto por nombre o código..."
                  value={busqueda}
                  onFocus={() => setAbierto(true)}
                  onBlur={() => setAbierto(false)}
                  onChange={(e) => { setBusqueda(e.target.value); setSeleccion(null); setAbierto(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
                />
                {abierto && (
                  <div className="op-dd" onMouseDown={(e) => e.preventDefault()}>
                    {coincidencias.length === 0 ? <div className="op-dd-empty">Sin resultados.</div> : coincidencias.map((p) => (
                      <button type="button" key={p.id_producto} onClick={() => { setSeleccion(p); setBusqueda(p.nombre); setAbierto(false); }}>
                        <span>{p.nombre}<small>{p.codigo || 'S/C'} · Existencia: {p.stock ?? 0}</small></span>
                        <b>{formatMoney(p.precio_compra)}</b>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-secondary op-round" onClick={agregar}><Plus size={16} /> Agregar</button>
            </div>

            <div className="table-container-clean">
              <table className="table-clean">
                <thead><tr><th>PRODUCTO</th><th>CANTIDAD</th><th>COSTO UNITARIO</th><th>SUBTOTAL</th><th /></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id_producto}>
                      <td>
                        <div className="op-prod">
                          <span className="op-prod-ico">{it.tipo === 'servicio' ? <Wrench size={18} /> : <Package size={18} />}</span>
                          <div>
                            <b>{it.nombre}</b>
                            <small>
                              {it.tipo === 'servicio' ? 'Servicio · sin inventario' : `Existencia actual: ${it.stock} ${it.unidad} → ${redondear(it.stock + it.cantidad)}`}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td><Stepper value={it.cantidad} onChange={(v) => editar(it.id_producto, { cantidad: v })} error={!(it.cantidad > 0)} /></td>
                      <td>
                        <input
                          type="number" min="0" step="0.01" className="op-cost" value={it.costo}
                          onChange={(e) => editar(it.id_producto, { costo: Number(e.target.value) })}
                          title="Costo unitario (editable)"
                        />
                      </td>
                      <td><b>{formatMoney(it.cantidad * it.costo)}</b></td>
                      <td style={{ textAlign: 'right' }}><button type="button" className="op-trash" onClick={() => quitar(it.id_producto)} title="Quitar"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && <div className="op-lines-empty">Busca y agrega los productos que compraste al proveedor.</div>}
            </div>
          </div>
        </div>

        <div className="op-side">
          <div className="content-box op-card">
            <h4 className="op-card-title">Resumen</h4>
            <div className="op-sum-row"><span>Subtotal</span><b>{formatMoney(total)}</b></div>
            <div className="op-sum-row"><span>Condiciones de pago</span><b>{esCredito ? 'Crédito' : 'Contado'}</b></div>
            <div className="op-sum-row"><span>Vencimiento</span><b>{esCredito && fechaVenc ? formatFechaISO(fechaVenc) : '—'}</b></div>
            {esCredito && (
              <div className="op-sum-row">
                <span>Anticipo</span>
                <input type="number" min="0" step="0.01" max={total} className="op-input noicon" placeholder="$0.00" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} />
              </div>
            )}
            <div className="op-sum-row" style={{ borderBottom: 'none' }}><span>Estatus resultante</span><Pill tone={tono}>{txt}</Pill></div>
            <div className="op-sum-total" style={{ borderTop: '1px solid #EEF2FB' }}><span>Total</span><strong>{formatMoney(total)}</strong></div>
            <div className="op-sum-row" style={{ borderBottom: 'none', paddingTop: 8, marginTop: 4, borderTop: '1px dashed #dbe2f4' }}>
              <span style={{ fontWeight: 600, color: saldo > 0 ? '#b45309' : '#15803d' }}>Saldo pendiente</span>
              <b style={{ fontSize: '15px', color: saldo > 0 ? '#b45309' : '#15803d' }}>{formatMoney(saldo)}</b>
            </div>
          </div>

          <div className="content-box op-card op-auto">
            <small>Asignado automáticamente</small>
            <div className="op-sum-row"><span>Código</span><b>{folio || '—'}</b></div>
            <div className="op-sum-row"><span>Fecha</span><b>{formatFechaCorta(new Date())}</b></div>
            <div className="op-sum-row" style={{ borderBottom: 'none' }}><span>Usuario</span><b>{nombreUsuario}</b></div>
          </div>

          {hayErrores
            ? <div className="op-note err"><CircleAlert size={16} />Corrige los campos marcados para confirmar la compra.</div>
            : <div className="op-note"><Info size={16} />Al confirmar, la compra aumenta el inventario y genera la cuenta por pagar si queda saldo.</div>}
        </div>
      </div>
    </div>
  );
}
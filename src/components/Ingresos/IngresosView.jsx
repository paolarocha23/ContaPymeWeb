import React, { useState, useEffect } from 'react';

import {
  Plus, Search, Pencil, Eye, Ban, ChevronLeft, ChevronRight, X, RotateCw,
  HandCoins, Banknote, CreditCard, CircleAlert, CircleCheck
} from 'lucide-react';

import { useIngresos } from '../../hooks/useIngresos';

import {
  formatoPrecio, formatoIdIngreso, fechaCorta, nombreOrigen, nombreFormaPago,
  esActivo, puedeEditar, opcionesMes, paginasVisibles
} from './ingresoMapper';

import {
  POR_PAGINA, ORIGENES_FILTRO, FORMAS_PAGO_FILTRO, FILTROS_INICIALES
} from './constants';

import IngresoFormModal from './IngresoFormModal';
import IngresoCancelModal from './IngresoCancelModal';
import IngresoDetailView from './IngresoDetailView';

import '../Clientes/Clientes.css';
import './Ingresos.css';

function FiltroSelect({ label, value, onChange, children }) {
  return (
    <label className="ing-filter">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </label>
  );
}

export default function IngresosView({ onNavigate }) {

  const {
    ingresos,
    categorias,
    stats,
    filtros,
    loading,
    feedback,
    setFeedback,
    actualizarFiltro,
    limpiarFiltros,
    crear,
    actualizar,
    cancelar
  } = useIngresos();

  const [pagina, setPagina] = useState(1);
  const [formModal, setFormModal] = useState(null);       // 'nuevo' | ingreso
  const [cancelModal, setCancelModal] = useState(null);   // ingreso (confirmar cancelación)
  const [bloqueoModal, setBloqueoModal] = useState(null); // { ingreso, accion }
  const [detalleId, setDetalleId] = useState(null);

  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(ingresos.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = ingresos.slice(inicio, inicio + POR_PAGINA);

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES);

  // El detalle se lee de la lista para que se refresque tras editar o cancelar
  const detalle = detalleId
    ? ingresos.find(i => i.id_ingreso === detalleId)
    : null;

  // RDF1102: solo ingresos manuales y activos se modifican; los demás muestran el aviso
  const pedirModificar = (ingreso) => {
    if (puedeEditar(ingreso)) setFormModal(ingreso);
    else setBloqueoModal({ ingreso, accion: 'modificar' });
  };

  // Los ingresos de venta o cobro se cancelan cancelando la operación de origen
  const pedirCancelar = (ingreso) => {
    if (!esActivo(ingreso)) return;
    if (ingreso.origen !== 'otro') setBloqueoModal({ ingreso, accion: 'cancelar' });
    else setCancelModal(ingreso);
  };

  const guardar = async (form) => {
    if (formModal === 'nuevo') {
      await crear(form);
    } else {
      await actualizar(formModal.id_ingreso, form);
    }

    setFormModal(null);
  };

  const confirmarCancelar = async (ingreso, motivo) => {
    await cancelar(ingreso.id_ingreso, motivo);
    setCancelModal(null);
  };

  const irAVenta = () => {
    setBloqueoModal(null);
    if (onNavigate) onNavigate('ventas');
  };

  const aviso = feedback && (
    <div className={`alert alert-${feedback.type}`}>
      {feedback.type === 'success'
        ? <CircleCheck size={18} />
        : <CircleAlert size={18} />}

      <div style={{ flex: 1 }}>{feedback.message}</div>

      <button
        type="button"
        onClick={() => setFeedback(null)}
        aria-label="Cerrar aviso"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
      >
        <X size={16} />
      </button>
    </div>
  );

  return (
    <div className="cli">

      {detalle ? (
        <>
          {aviso}
          <IngresoDetailView
            ingreso={detalle}
            onBack={() => setDetalleId(null)}
            onEdit={pedirModificar}
            onCancel={pedirCancelar}
            onIrVenta={irAVenta}
          />
        </>
      ) : (
        <>
          <div className="cli-title">
            <div>
              <h2>Ingresos</h2>
              <p>Registra y consulta las entradas de dinero de tu empresa, incluidas las ventas y cobros.</p>
            </div>

            <button type="button" className="btn btn-primary" onClick={() => setFormModal('nuevo')}>
              <Plus size={18} />
              Agregar ingreso
            </button>
          </div>

          {aviso}

          <div className="ing-stats">
            <div className="stat-card">
              <div className="stat-icon-wrapper"><HandCoins size={22} /></div>
              <div><div className="stat-label">Ingresos del mes</div><div className="stat-value">{formatoPrecio(stats.total_mes)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper"><Banknote size={22} /></div>
              <div><div className="stat-label">En efectivo</div><div className="stat-value">{formatoPrecio(stats.efectivo_mes)}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper"><CreditCard size={22} /></div>
              <div><div className="stat-label">Con tarjeta</div><div className="stat-value">{formatoPrecio(stats.tarjeta_mes)}</div></div>
            </div>
            <div className="stat-card ing-stat-warn">
              <div className="stat-icon-wrapper"><Ban size={22} /></div>
              <div><div className="stat-label">Cancelados</div><div className="stat-value">{stats.cancelados}</div></div>
            </div>
          </div>

          <div className="content-box ing-content">

            <div className="table-filter-bar ing-filtros">
              <div className="table-search-input">
                <div className="input-with-icon">
                  <Search className="input-icon" size={18} />
                  <input
                    className="form-input form-input-pill"
                    placeholder="Concepto o código..."
                    value={filtros.q}
                    onChange={(e) => actualizarFiltro('q', e.target.value)}
                  />
                </div>
              </div>

              <FiltroSelect label="Fecha" value={filtros.mes} onChange={(v) => actualizarFiltro('mes', v)}>
                {opcionesMes().map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FiltroSelect>

              <FiltroSelect label="Categoría" value={filtros.id_categoria} onChange={(v) => actualizarFiltro('id_categoria', v)}>
                <option value="">Todas</option>
                {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </FiltroSelect>

              <FiltroSelect label="Origen" value={filtros.origen} onChange={(v) => actualizarFiltro('origen', v)}>
                {ORIGENES_FILTRO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FiltroSelect>

              <FiltroSelect label="Forma de pago" value={filtros.forma_pago} onChange={(v) => actualizarFiltro('forma_pago', v)}>
                {FORMAS_PAGO_FILTRO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FiltroSelect>

              <button type="button" className="ing-limpiar" onClick={limpiarFiltros}>
                Limpiar
              </button>
            </div>

            <div className="table-container-clean">
              {loading ? (
                <div className="cli-empty">
                  <RotateCw className="animate-spin" size={28} />
                  <div>Cargando ingresos...</div>
                </div>
              ) : (
                <table className="table-clean ing-table">
                  <thead>
                    <tr>
                      <th>CÓDIGO</th>
                      <th>FECHA</th>
                      <th>CONCEPTO</th>
                      <th>CATEGORÍA</th>
                      <th>ORIGEN</th>
                      <th>FORMA DE PAGO</th>
                      <th>MONTO</th>
                      <th>ESTATUS</th>
                      <th style={{ textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibles.map(i => {
                      const activo = esActivo(i);
                      const FormaIcono = i.forma_pago === 'tarjeta' ? CreditCard : Banknote;

                      return (
                        <tr key={i.id_ingreso}>
                          <td><b className="ing-codigo">{formatoIdIngreso(i.id_ingreso)}</b></td>
                          <td>{fechaCorta(i.fecha)}</td>
                          <td><b className="ing-concepto">{i.concepto}</b></td>
                          <td>{i.nombre_categoria}</td>

                          <td>
                            <span className={`ing-origen ${i.origen}`}>{nombreOrigen(i.origen)}</span>
                          </td>

                          <td>
                            <span className="ing-forma">
                              <FormaIcono size={16} />
                              <b>{nombreFormaPago(i.forma_pago)}</b>
                            </span>
                          </td>

                          <td><b>{formatoPrecio(i.monto)}</b></td>

                          <td>
                            <span className={`ing-estatus ${i.estatus}`}>{activo ? 'Activo' : 'Cancelado'}</span>
                          </td>

                          <td>
                            <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                              <button type="button" className="action-circle-btn" title="Ver detalle"
                                onClick={() => setDetalleId(i.id_ingreso)}>
                                <Eye size={15} />
                              </button>
                              <button type="button"
                                className={`action-circle-btn ing-edit${puedeEditar(i) ? '' : ' is-bloqueado'}`}
                                title={puedeEditar(i) ? 'Modificar' : 'No se puede modificar'}
                                onClick={() => pedirModificar(i)}>
                                <Pencil size={15} />
                              </button>
                              <button type="button" className="action-circle-btn ing-ban"
                                title={activo ? 'Cancelar ingreso' : 'Ingreso cancelado'}
                                disabled={!activo}
                                onClick={() => pedirCancelar(i)}>
                                <Ban size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {visibles.length === 0 && (
                      <tr>
                        <td colSpan={9} className="cli-empty">
                          {hayFiltros
                            ? 'No se encontraron ingresos con esos filtros.'
                            : 'Aún no hay ingresos registrados.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && ingresos.length > 0 && (
              <div className="table-pagination-footer">
                <span>
                  Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, ingresos.length)} de {ingresos.length} ingresos
                </span>

                <div className="pagination-controls">
                  <button type="button" className="pagination-btn" disabled={paginaActual === 1}
                    onClick={() => setPagina(paginaActual - 1)}>
                    <ChevronLeft size={16} />
                  </button>

                  {paginasVisibles(totalPaginas, paginaActual).map((n, idx) => (
                    n === '…'
                      ? <span key={`gap-${idx}`} className="ing-gap">…</span>
                      : (
                        <button type="button" key={n}
                          className={`pagination-btn${n === paginaActual ? ' active' : ''}`}
                          onClick={() => setPagina(n)}>
                          {n}
                        </button>
                      )
                  ))}

                  <button type="button" className="pagination-btn" disabled={paginaActual === totalPaginas}
                    onClick={() => setPagina(paginaActual + 1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {formModal && (
        <IngresoFormModal
          ingreso={formModal === 'nuevo' ? null : formModal}
          categorias={categorias}
          onClose={() => setFormModal(null)}
          onSave={guardar}
        />
      )}

      {cancelModal && (
        <IngresoCancelModal
          ingreso={cancelModal}
          onClose={() => setCancelModal(null)}
          onConfirm={confirmarCancelar}
        />
      )}

      {bloqueoModal && (
        <IngresoCancelModal
          ingreso={bloqueoModal.ingreso}
          modo="bloqueado"
          accion={bloqueoModal.accion}
          onClose={() => setBloqueoModal(null)}
          onIrVenta={irAVenta}
        />
      )}

    </div>
  );
}
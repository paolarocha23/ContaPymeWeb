import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Eye, Pencil, ChevronLeft, ChevronRight, X, RotateCw,
  ContactRound, UserCheck, UserX, CircleAlert, CircleCheck
} from 'lucide-react';
import { useClientes } from '../../hooks/useClientes';
import { nombreCompleto, iniciales, formatoTelefono } from './helpers';
import { POR_PAGINA } from './constants';
import ClienteFormModal from './ClienteFormModal';
import ClienteDeactivateModal from './ClienteDeactivateModal';
import ClienteDetailView from './ClienteDetailView';
import './Clientes.css';

export default function ClientesView() {
  const {
    clientes, stats, opciones, filtros, loading, feedback,
    setFeedback, actualizarFiltro, limpiarFiltros, crear, actualizar, cambiarEstatus
  } = useClientes();

  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState(null);        // cliente abierto en detalle
  const [formModal, setFormModal] = useState(null);    // null | 'nuevo' | cliente
  const [toggleModal, setToggleModal] = useState(null);

  // Al cambiar los filtros se vuelve a la primera página
  useEffect(() => { setPagina(1); }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(clientes.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = clientes.slice(inicio, inicio + POR_PAGINA);

  const hayFiltros = Object.values(filtros).some(Boolean);

  const guardar = async (form) => {
    if (formModal === 'nuevo') {
      await crear(form);
    } else {
      const actualizado = await actualizar(formModal.id, form, form.activo, formModal.activo);
      if (detalle?.id === formModal.id) setDetalle(actualizado);
    }
    setFormModal(null);
  };

  const confirmarToggle = async (cliente) => {
    const actualizado = await cambiarEstatus(cliente);
    if (detalle?.id === cliente.id) setDetalle(actualizado);
    setToggleModal(null);
  };

  const modales = (
    <>
      {formModal && (
        <ClienteFormModal
          cliente={formModal === 'nuevo' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSave={guardar}
        />
      )}
      {toggleModal && (
        <ClienteDeactivateModal
          cliente={toggleModal}
          onClose={() => setToggleModal(null)}
          onConfirm={confirmarToggle}
        />
      )}
    </>
  );

  if (detalle) {
    return (
      <>
        <ClienteDetailView
          cliente={detalle}
          onBack={() => setDetalle(null)}
          onEdit={() => setFormModal(detalle)}
          onToggle={() => setToggleModal(detalle)}
        />
        {modales}
      </>
    );
  }

  return (
    <div className="cli">
      {/* Encabezado */}
      <div className="cli-title">
        <div>
          <h2>Clientes</h2>
          <p>Gestiona tus clientes y consulta su historial de operaciones.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormModal('nuevo')}>
          <Plus size={18} /> Agregar cliente
        </button>
      </div>

      {/* Notificaciones / Avisos */}
      {feedback && (
        <div className={`alert alert-${feedback.type}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
          <div style={{ flex: 1 }}>{feedback.message}</div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setFeedback(null)}
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="stat-card-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><ContactRound size={22} /></div>
          <div>
            <div className="stat-label">Total de clientes</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><UserCheck size={22} /></div>
          <div>
            <div className="stat-label">Clientes activos</div>
            <div className="stat-value">{stats.activos}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><UserX size={22} /></div>
          <div>
            <div className="stat-label">Clientes inactivos</div>
            <div className="stat-value">{stats.inactivos}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#FDF3E1', color: '#B26A00' }}>
            <CircleAlert size={22} />
          </div>
          <div>
            <div className="stat-label">Con adeudo</div>
            <div className="stat-value" style={{ color: '#B26A00' }}>{stats.con_adeudo}</div>
          </div>
        </div>
      </div>

      {/* Contenedor de la tabla y filtros */}
      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid #E4E8F5' }}>
          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                className="form-input form-input-pill"
                placeholder="Buscar cliente por nombre..."
                value={filtros.q}
                onChange={(e) => actualizarFiltro('q', e.target.value)}
              />
            </div>
          </div>

          <select
            className="table-pill-select"
            value={filtros.estatus}
            onChange={(e) => actualizarFiltro('estatus', e.target.value)}
          >
            <option value="">Estatus: Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>

          <select
            className="table-pill-select"
            value={filtros.ciudad}
            onChange={(e) => actualizarFiltro('ciudad', e.target.value)}
          >
            <option value="">Ciudad: Todas</option>
            {opciones.ciudades.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="table-pill-select"
            value={filtros.estado}
            onChange={(e) => actualizarFiltro('estado', e.target.value)}
          >
            <option value="">Estado: Todos</option>
            {opciones.estados.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="table-pill-select"
            value={filtros.colonia}
            onChange={(e) => actualizarFiltro('colonia', e.target.value)}
          >
            <option value="">Colonia: Todas</option>
            {opciones.colonias.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select
            className="table-pill-select"
            value={filtros.adeudo}
            onChange={(e) => actualizarFiltro('adeudo', e.target.value)}
          >
            <option value="">Adeudo: Todos</option>
            <option value="con">Con adeudo</option>
            <option value="sin">Sin adeudo</option>
          </select>

          {hayFiltros && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#142A95', marginLeft: 'auto', fontWeight: 600 }}
              onClick={limpiarFiltros}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Tabla de clientes */}
        <div className="table-container-clean">
          {loading ? (
            <div className="cli-empty" style={{ padding: '60px 0' }}>
              <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
              <div style={{ marginTop: 10 }}>Cargando clientes...</div>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NOMBRE COMPLETO</th>
                  <th>CIUDAD Y ESTADO</th>
                  <th>TELÉFONO</th>
                  <th>CORREO</th>
                  <th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: '#142A95', fontWeight: 700 }}>{c.codigo}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="user-avatar-initials" style={{ background: '#E8ECFB', color: '#142A95' }}>
                          {iniciales(c)}
                        </span>
                        <b>{nombreCompleto(c)}</b>
                        {c.saldo > 0 && <span className="cli-adeudo"><CircleAlert size={12} />Adeudo</span>}
                      </div>
                    </td>
                    <td>
                      <div>{c.ciudad}</div>
                      <div className="cli-small">{c.estado}</div>
                    </td>
                    <td>{formatoTelefono(c.telefono)}</td>
                    <td>{c.correo}</td>
                    <td>
                      <button
                        type="button"
                        className="switch-toggle"
                        onClick={() => setToggleModal(c)}
                        title={c.activo ? 'Desactivar cliente' : 'Activar cliente'}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <span className={`switch-track${c.activo ? ' active' : ''}`}>
                          <span className="switch-thumb" />
                        </span>
                        <span className={c.activo ? 'status-label-active' : 'status-label-inactive'} style={{ fontSize: '0.82rem' }}>
                          {c.activo ? '• Activo' : '• Inactivo'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="action-circle-btn"
                          title="Ver detalle"
                          onClick={() => setDetalle(c)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className="action-circle-btn"
                          title="Modificar"
                          onClick={() => setFormModal(c)}
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="cli-empty">
                      {hayFiltros ? 'No se encontraron clientes con esos filtros.' : 'Aún no hay clientes registrados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginador */}
        {!loading && clientes.length > 0 && (
          <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
            <span>
              Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, clientes.length)} de {clientes.length} clientes
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                disabled={paginaActual === 1}
                onClick={() => setPagina(paginaActual - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`pagination-btn${n === paginaActual ? ' active' : ''}`}
                  onClick={() => setPagina(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="pagination-btn"
                disabled={paginaActual === totalPaginas}
                onClick={() => setPagina(paginaActual + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modales}
    </div>
  );
}

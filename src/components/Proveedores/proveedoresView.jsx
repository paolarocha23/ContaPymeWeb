import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Pencil, ChevronLeft, ChevronRight, X, RotateCw,
  Truck, UserCheck, UserX, CircleAlert, CircleCheck
} from 'lucide-react';
import { useProveedores } from '../../hooks/useProveedores';
import { formatoTelefono } from '../Clientes/helpers';
import { inicialesEmpresa } from './proveedorMapper';
import { POR_PAGINA } from './constants';
import ProveedorFormModal from './ProveedorFormModal';
import ProveedorDeactivateModal from './ProveedorDeactivateModal';
import '../Clientes/Clientes.css'; // reutiliza los estilos .cli-*

export default function ProveedoresView() {
  const {
    proveedores, stats, filtros, loading, feedback,
    setFeedback, actualizarFiltro, limpiarFiltros, crear, actualizar, cambiarEstatus
  } = useProveedores();

  const [pagina, setPagina] = useState(1);
  const [formModal, setFormModal] = useState(null);   // null | 'nuevo' | proveedor
  const [toggleModal, setToggleModal] = useState(null);

  useEffect(() => { setPagina(1); }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(proveedores.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = proveedores.slice(inicio, inicio + POR_PAGINA);
  const hayFiltros = Object.values(filtros).some(Boolean);

  const guardar = async (form) => {
    if (formModal === 'nuevo') await crear(form);
    else await actualizar(formModal.id, form, form.activo, formModal.activo);
    setFormModal(null);
  };

  // RDF0502: si el backend rechaza la desactivación (tiene compras), se muestra el aviso.
  const confirmarToggle = async (proveedor) => {
    try {
      await cambiarEstatus(proveedor);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setToggleModal(null);
    }
  };

  return (
    <div className="cli">
      <div className="cli-title">
        <div>
          <h2>Proveedores</h2>
          <p>Administra las personas o empresas que suministran productos a tu negocio.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormModal('nuevo')}>
          <Plus size={18} /> Agregar proveedor
        </button>
      </div>

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

      <div className="stat-card-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><Truck size={22} /></div>
          <div><div className="stat-label">Total de proveedores</div><div className="stat-value">{stats.total}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><UserCheck size={22} /></div>
          <div><div className="stat-label">Proveedores activos</div><div className="stat-value">{stats.activos}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><UserX size={22} /></div>
          <div><div className="stat-label">Proveedores inactivos</div><div className="stat-value">{stats.inactivos}</div></div>
        </div>
      </div>

      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid #E4E8F5' }}>
          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                className="form-input form-input-pill"
                placeholder="Buscar por empresa o contacto..."
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

        <div className="table-container-clean">
          {loading ? (
            <div className="cli-empty" style={{ padding: '60px 0' }}>
              <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
              <div style={{ marginTop: 10 }}>Cargando proveedores...</div>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>CONTACTO</th>
                  <th>CIUDAD Y ESTADO</th>
                  <th>TELÉFONO</th>
                  <th>CORREO</th>
                  <th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="user-avatar-initials" style={{ background: '#E8ECFB', color: '#142A95' }}>
                          {inicialesEmpresa(p)}
                        </span>
                        <b>{p.nombreEmpresa}</b>
                      </div>
                    </td>
                    <td>{p.nombreContacto}</td>
                    <td>
                      <div>{p.ciudad}</div>
                      <div className="cli-small">{p.estado}</div>
                    </td>
                    <td>{formatoTelefono(p.telefono)}</td>
                    <td>{p.correo}</td>
                    <td>
                      <button
                        type="button"
                        className="switch-toggle"
                        onClick={() => setToggleModal(p)}
                        title={p.activo ? 'Desactivar proveedor' : 'Activar proveedor'}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <span className={`switch-track${p.activo ? ' active' : ''}`}>
                          <span className="switch-thumb" />
                        </span>
                        <span className={p.activo ? 'status-label-active' : 'status-label-inactive'} style={{ fontSize: '0.82rem' }}>
                          {p.activo ? '• Activo' : '• Inactivo'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="action-circle-btn" title="Modificar" onClick={() => setFormModal(p)}>
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="cli-empty">
                      {hayFiltros ? 'No se encontraron proveedores con esos filtros.' : 'Aún no hay proveedores registrados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && proveedores.length > 0 && (
          <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
            <span>
              Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, proveedores.length)} de {proveedores.length} proveedores
            </span>
            <div className="pagination-controls">
              <button type="button" className="pagination-btn" disabled={paginaActual === 1}
                onClick={() => setPagina(paginaActual - 1)}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button type="button" key={n}
                  className={`pagination-btn${n === paginaActual ? ' active' : ''}`}
                  onClick={() => setPagina(n)}>
                  {n}
                </button>
              ))}
              <button type="button" className="pagination-btn" disabled={paginaActual === totalPaginas}
                onClick={() => setPagina(paginaActual + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {formModal && (
        <ProveedorFormModal
          proveedor={formModal === 'nuevo' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSave={guardar}
        />
      )}
      {toggleModal && (
        <ProveedorDeactivateModal
          proveedor={toggleModal}
          onClose={() => setToggleModal(null)}
          onConfirm={confirmarToggle}
        />
      )}
    </div>
  );
}

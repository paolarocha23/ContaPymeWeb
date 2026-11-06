import React, { useState, useEffect } from 'react';
import {
  Tags, Search, Plus, Pencil, X, CheckCircle2, AlertCircle, Power,
  RotateCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useCategorias } from '../../hooks/useCategorias';
import { POR_PAGINA } from './constants';
import CategoriaFormModal from './CategoriaFormModal';
import CategoriaDeactivateModal from './CategoriaDeactivateModal';
import '../Clientes/Clientes.css';

export default function CategoriasView() {
  const {
    categorias, stats, filtros, loading, feedback,
    setFeedback, actualizarFiltro, limpiarFiltros, crear, actualizar, cambiarEstatus
  } = useCategorias();

  const [pagina, setPagina] = useState(1);
  const [formModal, setFormModal] = useState(null);   // null | 'nuevo' | categoria
  const [toggleModal, setToggleModal] = useState(null);

  useEffect(() => { setPagina(1); }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(categorias.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = categorias.slice(inicio, inicio + POR_PAGINA);
  const hayFiltros = Object.values(filtros).some(Boolean);

  const guardar = async (form) => {
    if (formModal === 'nuevo') await crear(form);
    else await actualizar(formModal.id, form);
    setFormModal(null);
  };

  const confirmarToggle = async (categoria) => {
    try {
      await cambiarEstatus(categoria);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setToggleModal(null);
    }
  };

  return (
    <div className="cli">
      {/* Encabezado */}
      <div className="cli-title">
        <div>
          <h2>Categorías</h2>
          <p>Clasifica tus productos y servicios para mantener el inventario ordenado.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormModal('nuevo')}>
          <Plus size={18} /> Agregar categoría
        </button>
      </div>

      {/* Avisos */}
      {feedback && (
        <div className={`alert alert-${feedback.type}`} style={{ marginBottom: 0 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
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
          <div className="stat-icon-wrapper"><Tags size={22} /></div>
          <div><div className="stat-label">Total de categorías</div><div className="stat-value">{stats.total}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><CheckCircle2 size={22} /></div>
          <div><div className="stat-label">Categorías activas</div><div className="stat-value">{stats.activos}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper"><Power size={22} /></div>
          <div><div className="stat-label">Categorías inactivas</div><div className="stat-value">{stats.inactivos}</div></div>
        </div>
      </div>

      {/* Tabla y filtros */}
      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0, borderBottom: '1px solid #E4E8F5' }}>
          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                className="form-input form-input-pill"
                placeholder="Buscar categoría por nombre..."
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
            <option value="">Estatus: Todas</option>
            <option value="1">Activas</option>
            <option value="0">Inactivas</option>
          </select>

          {hayFiltros && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#142A95', marginLeft: 'auto', fontWeight: 600 }}
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="table-container-clean">
          {loading ? (
            <div className="cli-empty" style={{ padding: '60px 0' }}>
              <RotateCw className="spinning" size={28} style={{ color: '#183b9c' }} />
              <div style={{ marginTop: 10 }}>Cargando categorías...</div>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>DESCRIPCIÓN</th>
                  <th>ASOCIADOS</th>
                  <th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>EDITAR</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span
                          className="user-avatar-initials"
                          style={{ background: '#E8ECFB', color: '#142A95', width: 36, height: 36, fontSize: '0.85rem' }}
                        >
                          <Tags size={16} />
                        </span>
                        <b>{c.nombre}</b>
                      </div>
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.88rem' }}>{c.descripcion || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        background: c.asociados > 0 ? '#E8ECFB' : '#F1F5F9',
                        color: c.asociados > 0 ? '#142A95' : '#94A3B8',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        padding: '4px 12px',
                        borderRadius: 9999
                      }}>
                        {c.asociados} asociados
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="switch-toggle"
                        onClick={() => setToggleModal(c)}
                        title={c.activo ? 'Desactivar categoría' : 'Activar categoría'}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <span className={`switch-track${c.activo ? ' active' : ''}`}>
                          <span className="switch-thumb" />
                        </span>
                        <span className={c.activo ? 'status-label-active' : 'status-label-inactive'} style={{ fontSize: '0.82rem' }}>
                          {c.activo ? '• Activa' : '• Inactiva'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="action-circle-btn" title="Modificar categoría" onClick={() => setFormModal(c)}>
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="cli-empty">
                      {hayFiltros ? 'No se encontraron categorías con esos filtros.' : 'Aún no hay categorías registradas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {!loading && categorias.length > 0 && (
          <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
            <span>
              Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, categorias.length)} de {categorias.length} categorías
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

      {/* Modales */}
      {formModal && (
        <CategoriaFormModal
          categoria={formModal === 'nuevo' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSave={guardar}
        />
      )}
      {toggleModal && (
        <CategoriaDeactivateModal
          categoria={toggleModal}
          onClose={() => setToggleModal(null)}
          onConfirm={confirmarToggle}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Tags,
  Search,
  Plus,
  Edit3,
  Power,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { categoriasApi as api } from '../services/categoriasApi';

const MAX_NOMBRE = 80;
const EMPTY_FORM = { nombre: '', descripcion: '' };

export default function CategoryCatalog() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const [filters, setFilters] = useState({ search: '', estatus: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [statusConfirm, setStatusConfirm] = useState(null);
  const [statusToggling, setStatusToggling] = useState(false);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const res = await api.getCategorias(filters);
      setCategorias(res.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar las categorías.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
    setCurrentPage(1);
  }, [filters]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedCategoria(null);
    setForm(EMPTY_FORM);
    setModalError('');
  };

  const handleOpenEdit = (categoria) => {
    setModalMode('edit');
    setSelectedCategoria(categoria);
    setForm({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ''
    });
    setModalError('');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedCategoria(null);
    setModalError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const nombre = form.nombre.trim();
    if (!nombre) {
      setModalError('El nombre de la categoría es obligatorio.');
      return;
    }
    if (nombre.length > MAX_NOMBRE) {
      setModalError(`El nombre no puede tener más de ${MAX_NOMBRE} caracteres.`);
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const payload = { nombre, descripcion: form.descripcion.trim() };
      const res = modalMode === 'create'
        ? await api.createCategoria(payload)
        : await api.updateCategoria(selectedCategoria.id_categoria, payload);

      setFeedback({ type: 'success', message: res.message });
      handleCloseModal();
      fetchCategorias();
    } catch (err) {
      setModalError(err.message || 'Error al guardar la categoría.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirm) return;
    setStatusToggling(true);
    const newStatus = statusConfirm.estatus === 1 ? 0 : 1;
    try {
      const res = await api.toggleCategoriaStatus(statusConfirm.id_categoria, newStatus);
      setFeedback({ type: 'success', message: res.message });
      fetchCategorias();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error al cambiar el estatus de la categoría.' });
    } finally {
      setStatusToggling(false);
      setStatusConfirm(null);
    }
  };

  const formatCategoryId = (id) => `CAT-${String(id || 0).padStart(4, '0')}`;

  const totalCategorias = categorias.length;
  const activas = categorias.filter(c => c.estatus === 1).length;
  const inactivas = categorias.filter(c => c.estatus === 0).length;

  const totalPages = Math.ceil(categorias.length / pageSize) || 1;
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * pageSize;
  const paginatedCategorias = categorias.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#0f172a',
            lineHeight: 1.2
          }}>
            Categorías
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '2px' }}>
            Administra las categorías para clasificar productos y servicios.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreate}
          style={{ padding: '11px 24px', fontSize: '0.92rem' }}
        >
          <Plus size={18} />
          Agregar categoría
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <div style={{ flex: 1 }}>{feedback.message}</div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setFeedback(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Tags size={22} />
          </div>
          <div>
            <div className="stat-label">Total de categorías</div>
            <div className="stat-value">{totalCategorias}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-label">Categorías activas</div>
            <div className="stat-value">{activas}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Power size={22} />
          </div>
          <div>
            <div className="stat-label">Categorías inactivas</div>
            <div className="stat-value">{inactivas}</div>
          </div>
        </div>
      </div>

      <div className="content-box">
        <div className="table-filter-bar">
          <div className="input-with-icon table-search-input">
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar categoría por nombre..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>

          <div>
            <select
              className="table-pill-select"
              value={filters.estatus}
              onChange={(e) => setFilters({ ...filters, estatus: e.target.value })}
            >
              <option value="">Estatus: Todos</option>
              <option value="1">Activas</option>
              <option value="0">Inactivas</option>
            </select>
          </div>

          {(filters.search || filters.estatus) && (
            <button
              type="button"
              onClick={() => setFilters({ search: '', estatus: '' })}
              style={{
                background: 'none',
                border: 'none',
                color: '#183b9c',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="table-container-clean">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <RotateCw className="animate-spin" size={32} style={{ margin: '0 auto 12px', color: '#183b9c' }} />
              <div>Cargando categorías...</div>
            </div>
          ) : categorias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
              <Tags size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                No se encontraron categorías
              </p>
              <p style={{ fontSize: '0.85rem' }}>Prueba ajustando los filtros de búsqueda.</p>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>NOMBRE</th>
                  <th>DESCRIPCIÓN</th>
                  <th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategorias.map(c => {
                  const isActive = c.estatus === 1;

                  return (
                    <tr key={c.id_categoria}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.nombre}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                          {formatCategoryId(c.id_categoria)}
                        </div>
                      </td>

                      <td style={{ color: '#475569', fontSize: '0.88rem' }}>
                        {c.descripcion || '—'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="switch-toggle"
                          onClick={() => setStatusConfirm(c)}
                          title={`Click para ${isActive ? 'desactivar' : 'activar'}`}
                        >
                          <span className={`switch-track ${isActive ? 'active' : ''}`}>
                            <span className="switch-thumb" />
                          </span>
                          <span className={isActive ? 'status-label-active' : 'status-label-inactive'}>
                            ● {isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </button>
                      </td>

                      <td>
                        <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="action-circle-btn"
                            onClick={() => handleOpenEdit(c)}
                            title="Modificar categoría"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {categorias.length > 0 && (
          <div className="table-pagination-footer">
            <div>
              Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, categorias.length)} de {categorias.length} categorías
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(page - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`pagination-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(page + 1, totalPages))}
                disabled={page === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>{modalMode === 'create' ? 'Agregar categoría' : 'Modificar categoría'}</h3>
                <p>
                  {modalMode === 'create'
                    ? 'Registra una nueva categoría para clasificar productos y servicios.'
                    : 'Actualiza el nombre y la descripción. El identificador no se puede cambiar.'}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert alert-error">
                    <AlertCircle size={18} />
                    <div style={{ flex: 1 }}>{modalError}</div>
                  </div>
                )}

                {modalMode === 'edit' && selectedCategoria && (
                  <div className="form-group">
                    <label className="form-label">ID DE CATEGORÍA</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formatCategoryId(selectedCategoria.id_categoria)}
                      disabled
                      style={{ fontWeight: '700', color: '#1e3a8a' }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">NOMBRE</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Mercancía"
                    value={form.nombre}
                    maxLength={MAX_NOMBRE}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    autoFocus
                  />
                  <div className="form-helper">Debe ser único. Máximo {MAX_NOMBRE} caracteres.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">DESCRIPCIÓN</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe para qué se usa esta categoría"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    style={{ resize: 'vertical', minHeight: '84px', fontFamily: 'inherit' }}
                  />
                  <div className="form-helper">Opcional.</div>
                </div>

                {modalMode === 'create' && (
                  <div className="modal-alert-green">
                    <CheckCircle2 size={18} color="#059669" />
                    <span>La categoría se creará con estatus Activa.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? <RotateCw className="animate-spin" size={16} />
                    : (modalMode === 'create' ? <Plus size={16} /> : null)}
                  {modalMode === 'create' ? 'Guardar categoría' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusConfirm && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="modal-body" style={{ padding: '36px 32px 28px 32px', alignItems: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: statusConfirm.estatus === 1 ? '#fef3c7' : '#ecfdf5',
                color: statusConfirm.estatus === 1 ? '#d97706' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Power size={32} />
              </div>

              <h3 style={{
                fontSize: '1.35rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '10px'
              }}>
                {statusConfirm.estatus === 1
                  ? `¿Desactivar "${statusConfirm.nombre}"?`
                  : `¿Activar "${statusConfirm.nombre}"?`}
              </h3>

              <p style={{
                color: '#64748b',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: '24px'
              }}>
                {statusConfirm.estatus === 1
                  ? 'Solo se puede desactivar si no tiene productos o servicios asociados. Podrás activarla de nuevo cuando quieras.'
                  : 'La categoría volverá a estar activa.'}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%'
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '10px 20px' }}
                  onClick={() => setStatusConfirm(null)}
                  disabled={statusToggling}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={handleConfirmToggleStatus}
                  disabled={statusToggling}
                >
                  {statusToggling ? <RotateCw className="animate-spin" size={16} /> : <Power size={16} />}
                  {statusConfirm.estatus === 1 ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
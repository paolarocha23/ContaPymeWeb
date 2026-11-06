import React, { useState, useEffect } from 'react';

import {
  Plus, Search, Pencil, Eye, Trash2, ChevronLeft, ChevronRight,
  X, RotateCw, Layers, Package, Wrench, TriangleAlert, CircleAlert, CircleCheck
} from 'lucide-react';

import { useProductos } from '../../hooks/useProductos';

import {
  formatoPrecio, nombreTipo, formatoStock, esStockBajo, paginasVisibles
} from './productoMapper';

import { POR_PAGINA } from './constants';

import ProductoFormModal from './ProductoFormModal';
import ProductoDeactivateModal from './ProductoDeactivateModal';
import ProductoDetailView from './ProductoDetailView';

import '../Clientes/Clientes.css';
import './Productos.css';

export default function ProductosView() {

  const {
    productos,
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
    cambiarEstatus,
    eliminar
  } = useProductos();

  const [pagina, setPagina] = useState(1);
  const [formModal, setFormModal] = useState(null);
  const [toggleModal, setToggleModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [detalleId, setDetalleId] = useState(null);

  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(productos.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = productos.slice(inicio, inicio + POR_PAGINA);

  const hayFiltros = Object.values(filtros).some(Boolean);

  // El detalle se lee de la lista para que se refresque tras editar o cambiar estatus
  const detalle = detalleId
    ? productos.find(p => p.id_producto === detalleId)
    : null;

  const guardar = async (form) => {
    if (formModal === 'nuevo') {
      await crear(form);
    } else {
      await actualizar(formModal.id_producto, form);
    }

    setFormModal(null);
  };

  const confirmarToggle = async (producto) => {
    try {
      await cambiarEstatus(producto);
    } finally {
      setToggleModal(null);
    }
  };

  const confirmarEliminar = async (producto) => {
    const ok = await eliminar(producto.id_producto);
    if (ok && detalleId === producto.id_producto) setDetalleId(null);
    setDeleteModal(null);
  };

  // Desde el modal "No se puede eliminar" → desactivar en su lugar (RF0702)
  const desactivarEnVezDeEliminar = async (producto) => {
    setDeleteModal(null);
    await cambiarEstatus(producto);
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
          <ProductoDetailView
            producto={detalle}
            onBack={() => setDetalleId(null)}
            onEdit={setFormModal}
            onToggle={setToggleModal}
          />
        </>
      ) : (
        <>
          <div className="cli-title">
            <div>
              <h2>Productos y servicios</h2>
              <p>Administra lo que vende tu negocio: precios, categorías e inventario.</p>
            </div>

            <button type="button" className="btn btn-primary" onClick={() => setFormModal('nuevo')}>
              <Plus size={18} />
              Agregar producto o servicio
            </button>
          </div>

          {aviso}

          <div className="prd-stats">
            <div className="stat-card">
              <div className="stat-icon-wrapper"><Layers size={22} /></div>
              <div><div className="stat-label">Total de registros</div><div className="stat-value">{stats.total}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper"><Package size={22} /></div>
              <div><div className="stat-label">Productos</div><div className="stat-value">{stats.productos}</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper"><Wrench size={22} /></div>
              <div><div className="stat-label">Servicios</div><div className="stat-value">{stats.servicios}</div></div>
            </div>
            <div className="stat-card prd-stat-warn">
              <div className="stat-icon-wrapper"><TriangleAlert size={22} /></div>
              <div><div className="stat-label">Con stock bajo</div><div className="stat-value">{stats.stock_bajo}</div></div>
            </div>
          </div>

          <div className="content-box productos-content">

            <div className="table-filter-bar productos-filtros">
              <div className="table-search-input">
                <div className="input-with-icon">
                  <Search className="input-icon" size={18} />
                  <input
                    className="form-input form-input-pill"
                    placeholder="Buscar por nombre o código..."
                    value={filtros.q}
                    onChange={(e) => actualizarFiltro('q', e.target.value)}
                  />
                </div>
              </div>

              <select
                className="table-pill-select"
                value={filtros.id_categoria}
                onChange={(e) => actualizarFiltro('id_categoria', e.target.value)}
              >
                <option value="">Categoría: Todas</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>

              <select
                className="table-pill-select"
                value={filtros.tipo}
                onChange={(e) => actualizarFiltro('tipo', e.target.value)}
              >
                <option value="">Tipo: Todos</option>
                <option value="producto">Productos</option>
                <option value="servicio">Servicios</option>
              </select>

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
                <button type="button" className="prd-limpiar" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="table-container-clean">
              {loading ? (
                <div className="cli-empty">
                  <RotateCw className="animate-spin" size={28} />
                  <div>Cargando productos y servicios...</div>
                </div>
              ) : (
                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>CÓDIGO</th>
                      <th>NOMBRE</th>
                      <th>CATEGORÍA</th>
                      <th>TIPO</th>
                      <th>UNIDAD</th>
                      <th>PRECIO VENTA</th>
                      <th>STOCK</th>
                      <th>ESTATUS</th>
                      <th style={{ textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibles.map(p => {
                      const activo = Number(p.estatus) === 1;
                      const bajo = esStockBajo(p);

                      return (
                        <tr key={p.id_producto}>
                          <td><b className="producto-codigo">{p.codigo}</b></td>

                          <td>
                            <div className="producto-identidad">
                              <span className="prd-ico">
                                {p.tipo === 'producto' ? <Package size={16} /> : <Wrench size={16} />}
                              </span>
                              <b>{p.nombre}</b>
                            </div>
                          </td>

                          <td>{p.nombre_categoria}</td>

                          <td>
                            <span className={`producto-tipo ${p.tipo}`}>{nombreTipo(p.tipo)}</span>
                          </td>

                          <td>{p.unidad_medida}</td>
                          <td><b>{formatoPrecio(p.precio_venta)}</b></td>

                          <td>
                            <span className="prd-stock">
                              {formatoStock(p)}
                              {bajo && <span className="prd-bajo">Bajo</span>}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="switch-toggle"
                              onClick={() => setToggleModal(p)}
                              title={activo ? 'Desactivar' : 'Activar'}
                            >
                              <span className={`switch-track${activo ? ' active' : ''}`}>
                                <span className="switch-thumb" />
                              </span>
                              <span className={activo ? 'status-label-active' : 'status-label-inactive'}>
                                ● {activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </button>
                          </td>

                          <td>
                            <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                              <button type="button" className="action-circle-btn" title="Ver detalle"
                                onClick={() => setDetalleId(p.id_producto)}>
                                <Eye size={15} />
                              </button>
                              <button type="button" className="action-circle-btn" title="Modificar"
                                onClick={() => setFormModal(p)}>
                                <Pencil size={15} />
                              </button>
                              <button type="button" className="action-circle-btn prd-danger" title="Eliminar"
                                onClick={() => setDeleteModal(p)}>
                                <Trash2 size={15} />
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
                            ? 'No se encontraron registros con esos filtros.'
                            : 'Aún no hay productos o servicios registrados.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && productos.length > 0 && (
              <div className="table-pagination-footer">
                <span>
                  Mostrando {inicio + 1}-{Math.min(inicio + POR_PAGINA, productos.length)} de {productos.length} registros
                </span>

                <div className="pagination-controls">
                  <button type="button" className="pagination-btn" disabled={paginaActual === 1}
                    onClick={() => setPagina(paginaActual - 1)}>
                    <ChevronLeft size={16} />
                  </button>

                  {paginasVisibles(totalPaginas, paginaActual).map((n, i) => (
                    n === '…'
                      ? <span key={`gap-${i}`} className="prd-gap">…</span>
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
        <ProductoFormModal
          producto={formModal === 'nuevo' ? null : formModal}
          categorias={categorias}
          onClose={() => setFormModal(null)}
          onSave={guardar}
        />
      )}

      {toggleModal && (
        <ProductoDeactivateModal
          producto={toggleModal}
          onClose={() => setToggleModal(null)}
          onConfirm={confirmarToggle}
        />
      )}

      {deleteModal && (
        <ProductoDeactivateModal
          producto={deleteModal}
          modo="eliminar"
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmarEliminar}
          onDesactivar={desactivarEnVezDeEliminar}
        />
      )}

    </div>
  );
}

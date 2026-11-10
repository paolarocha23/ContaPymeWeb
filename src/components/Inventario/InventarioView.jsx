import React, { useMemo, useState } from 'react';
import { useInventario } from '../../hooks/useInventario';
import MovimientoModal from './MovimientoModal';
import { diferenciaMovimiento, estadoExistencia } from './inventarioMapper';
import './Inventario.css';

const formato = (n) => new Intl.NumberFormat('es-MX').format(Number(n || 0));

const fechaLarga = (valor) => {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const hora = (valor) => {
  if (!valor) return '';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const tipoTexto = (tipo) => ({
  entrada: '↙ Entrada',
  salida: '↗ Salida',
  ajuste: '☷ Ajuste'
}[tipo] || tipo || '—');

function StatCard({ icon, label, value, warning = false, suffix = '' }) {
  return (
    <article className={`inv-stat ${warning ? 'inv-stat-warn' : ''}`}>
      <span className="inv-stat-icon">{icon}</span>
      <div className="inv-stat-copy">
        <small>{label}</small>
        <strong>{formato(value)}{suffix}</strong>
      </div>
    </article>
  );
}

function ProductIcon({ tipo }) {
  const icons = {
    laptop: '▱',
    monitor: '▣',
    mouse: '◉',
    tablet: '▯',
    cable: '♧',
    printer: '▤',
    disk: '▱',
    network: '⌁'
  };
  return <span className="inv-product-icon">{icons[tipo] || '◇'}</span>;
}

export default function InventarioView() {
  const {
    vista,
    cambiarVista,
    existencias,
    movimientos,
    stockBajo,
    categorias,
    stats,
    statsMovimientos,
    totalMovimientos,
    filtros,
    loading,
    saving,
    feedback,
    setFeedback,
    actualizarFiltro,
    limpiarFiltros,
    registrar
  } = useInventario();

  const [modal, setModal] = useState(null);

  const listaStockBajo = useMemo(() => {
    const q = (filtros.q || '').trim().toLowerCase();
    return stockBajo.filter((p) => {
      const texto = `${p.nombre || ''} ${p.codigo || ''}`.toLowerCase();
      const coincideTexto = !q || texto.includes(q);
      const coincideCategoria = !filtros.id_categoria ||
        String(p.id_categoria) === String(filtros.id_categoria);
      return coincideTexto && coincideCategoria;
    });
  }, [stockBajo, filtros.q, filtros.id_categoria]);

  const listaExistencias = useMemo(() => existencias, [existencias]);
  const fuente = vista === 'stock-bajo' ? listaStockBajo : listaExistencias;
  const totalRegistros = vista === 'movimientos' ? totalMovimientos : fuente.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / filtros.limite));

  const filas = vista === 'movimientos'
    ? movimientos
    : fuente.slice((filtros.pagina - 1) * filtros.limite, filtros.pagina * filtros.limite);

  const abrirModal = (tipo, producto = null) => setModal({ tipo, producto });
  const guardarMovimiento = (datos) => registrar(modal.tipo, datos);

  const tituloSecundario = vista === 'movimientos'
    ? 'Historial de cada entrada, salida y ajuste con su existencia anterior y resultante.'
    : vista === 'stock-bajo'
      ? 'Productos que están en su stock mínimo o por debajo de él.'
      : 'Controla las existencias de tus productos y registra cada movimiento.';

  return (
    <section className="inventario-view">
      <div className="inv-page-heading">
        <div>
          <h1>Inventario</h1>
          <p>{tituloSecundario}</p>
        </div>

        <div className="inv-top-actions">
          <button type="button" className="inv-action inv-action-outline" onClick={() => abrirModal('entrada')}>
            <span>↓</span> Registrar entrada
          </button>
          <button type="button" className="inv-action inv-action-outline" onClick={() => abrirModal('salida')}>
            <span>↑</span> Registrar salida
          </button>
          <button type="button" className="inv-action inv-action-primary" onClick={() => abrirModal('ajuste')}>
            <span>☷</span> Ajustar inventario
          </button>
        </div>
      </div>

      <div className="inv-stats-grid">
        {vista === 'movimientos' ? (
          <>
            <StatCard icon="↓" label="Entradas (30 días)" value={statsMovimientos.entradas} suffix=" pzs" />
            <StatCard icon="↑" label="Salidas (30 días)" value={statsMovimientos.salidas} suffix=" pzs" />
            <StatCard icon="☷" label="Ajustes (30 días)" value={statsMovimientos.ajustes} warning />
            <StatCard icon="◷" label="Movimientos registrados" value={statsMovimientos.total} />
          </>
        ) : (
          <>
            <StatCard icon="◇" label="Productos con inventario" value={stats.total_productos} />
            <StatCard icon="▦" label="Unidades en existencia" value={stats.unidades} />
            <StatCard icon="!" label="Con stock bajo" value={stats.stock_bajo} warning />
            <StatCard icon="⊗" label="Sin existencia" value={stats.sin_stock} />
          </>
        )}
      </div>

      <section className="inv-table-card">
        <div className="inv-toolbar">
          <nav className="inv-tabs" aria-label="Secciones de inventario">
            <button className={vista === 'existencias' ? 'active' : ''} onClick={() => cambiarVista('existencias')}>Existencias</button>
            <button className={vista === 'movimientos' ? 'active' : ''} onClick={() => cambiarVista('movimientos')}>Movimientos</button>
            <button className={vista === 'stock-bajo' ? 'active' : ''} onClick={() => cambiarVista('stock-bajo')}>Stock bajo</button>
          </nav>

          <label className="inv-search-wrap">
            <span>⌕</span>
            <input
              value={filtros.q}
              onChange={(e) => actualizarFiltro('q', e.target.value)}
              placeholder={vista === 'movimientos' ? 'Buscar producto...' : 'Buscar por nombre o código...'}
            />
          </label>

          {vista !== 'movimientos' ? (
            <>
              <select className="inv-select" value={filtros.id_categoria} onChange={(e) => actualizarFiltro('id_categoria', e.target.value)}>
                <option value="">Categoría: Todas</option>
                {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
              </select>
              {vista === 'existencias' && (
                <select className="inv-select" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
                  <option value="">Disponibilidad: Todas</option>
                  <option value="disponible">Disponible</option>
                  <option value="bajo">Stock bajo</option>
                  <option value="sin_stock">Sin existencia</option>
                </select>
              )}
            </>
          ) : (
            <>
              <select className="inv-select" value={filtros.tipo_movimiento} onChange={(e) => actualizarFiltro('tipo_movimiento', e.target.value)}>
                <option value="">Tipo: Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="ajuste">Ajuste</option>
              </select>
              <label className="inv-date-filter"><span>Desde</span><input type="date" value={filtros.desde} onChange={(e) => actualizarFiltro('desde', e.target.value)} /></label>
              <label className="inv-date-filter"><span>Hasta</span><input type="date" value={filtros.hasta} onChange={(e) => actualizarFiltro('hasta', e.target.value)} /></label>
            </>
          )}

          <button type="button" className="inv-clear" onClick={limpiarFiltros}>Limpiar</button>
        </div>

        <div className="inv-table-scroll">
          {vista === 'movimientos' ? (
            <table className="inv-table inv-movements-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cant.</th>
                  <th>Anterior</th><th>Resultante</th><th>Motivo</th><th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((m) => {
                  const delta = diferenciaMovimiento(m);
                  return (
                    <tr key={m.id_movimiento}>
                      <td className="inv-date-cell"><strong>{fechaLarga(m.fecha)}</strong><small>{hora(m.fecha)}</small></td>
                      <td className="inv-td-strong">{m.nombre_producto}</td>
                      <td><span className={`inv-movement-pill ${m.tipo_movimiento}`}>{tipoTexto(m.tipo_movimiento)}</span></td>
                      <td className={delta >= 0 ? 'inv-positive' : 'inv-negative'}>{delta > 0 ? '+' : ''}{formato(delta)}</td>
                      <td>{formato(m.existencia_antes)}</td>
                      <td className="inv-td-strong">{formato(m.existencia_despues)}</td>
                      <td>{m.motivo || '—'}</td>
                      <td>{m.nombre_usuario || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="inv-table">
              <thead>
                {vista === 'stock-bajo' ? (
                  <tr>
                    <th>Código</th><th>Producto</th><th>Existencia</th><th>Stock mín.</th>
                    <th>Faltan</th><th>Nivel</th><th>Reponer</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Código</th><th>Producto</th><th>Categoría</th><th>Existencia</th>
                    <th>Stock mín.</th><th>Disponibilidad</th><th>Registrar</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filas.map((p) => {
                  const stock = Number(p.stock || 0);
                  const minimo = Number(p.stock_minimo || 0);
                  const nivel = minimo > 0 ? Math.min(100, Math.round((stock / minimo) * 100)) : 100;
                  const estado = estadoExistencia(p);

                  return (
                    <tr key={p.id_producto}>
                      <td className="inv-code">{p.codigo}</td>
                      <td>
                        <div className="inv-product-name">
                          <ProductIcon tipo={p.icono} />
                          <strong>{p.nombre}</strong>
                        </div>
                      </td>

                      {vista === 'stock-bajo' ? (
                        <>
                          <td className={stock <= 0 ? 'inv-negative' : 'inv-warning'}>{formato(stock)}</td>
                          <td>{formato(minimo)}</td>
                          <td className="inv-td-strong">{formato(Math.max(0, minimo - stock))}</td>
                          <td>
                            <div className="inv-level">
                              <span><i className={nivel === 0 ? 'empty' : ''} style={{ width: `${nivel}%` }} /></span>
                              <small>{nivel}%</small>
                            </div>
                          </td>
                          <td><button type="button" className="inv-restock" onClick={() => abrirModal('entrada', p)}>⊕ Entrada</button></td>
                        </>
                      ) : (
                        <>
                          <td>{p.nombre_categoria || '—'}</td>
                          <td className={stock <= 0 ? 'inv-negative' : estado === 'bajo' ? 'inv-warning' : 'inv-td-strong'}>
                            {formato(stock)} <small>{p.unidad_medida || 'piezas'}</small>
                          </td>
                          <td>{formato(minimo)}</td>
                          <td><span className={`inv-status ${estado}`}>● {estado === 'disponible' ? 'Disponible' : estado === 'bajo' ? 'Stock bajo' : 'Sin existencia'}</span></td>
                          <td>
                            <div className="inv-row-actions">
                              <button type="button" title="Registrar entrada" onClick={() => abrirModal('entrada', p)}>＋</button>
                              <button type="button" title="Registrar salida" onClick={() => abrirModal('salida', p)}>−</button>
                              <button type="button" title="Ajustar inventario" onClick={() => abrirModal('ajuste', p)}>☷</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && filas.length === 0 && <div className="inv-empty">No se encontraron registros.</div>}
          {loading && <div className="inv-loading">Cargando información…</div>}
        </div>

        <footer className="inv-pagination">
          <span>
            Mostrando {filas.length ? (filtros.pagina - 1) * filtros.limite + 1 : 0}–
            {(filtros.pagina - 1) * filtros.limite + filas.length} de {formato(totalRegistros)} {vista === 'movimientos' ? 'movimientos' : 'productos'}
          </span>
          <div className="inv-page-controls">
            <button type="button" disabled={filtros.pagina <= 1} onClick={() => actualizarFiltro('pagina', filtros.pagina - 1)}>‹</button>
            <strong>{filtros.pagina}</strong>
            <button type="button" disabled={filtros.pagina >= totalPaginas} onClick={() => actualizarFiltro('pagina', filtros.pagina + 1)}>›</button>
          </div>
        </footer>
      </section>

      {feedback && (
        <div className={`inv-toast ${feedback.type}`} role="status">
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)}>×</button>
        </div>
      )}

      {modal && (
        <MovimientoModal
          tipo={modal.tipo}
          productos={modal.producto
            ? [modal.producto, ...existencias.filter((p) => p.id_producto !== modal.producto.id_producto)]
            : existencias}
          productoInicial={modal.producto}
          onClose={() => setModal(null)}
          onSave={guardarMovimiento}
          saving={saving}
        />
      )}
    </section>
  );
}

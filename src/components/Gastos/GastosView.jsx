import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus, Search, Pencil, Ban, RotateCw, Receipt,
  Wallet, DollarSign, X, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import GastoFormModal from './GastoFormModal';
import GastoCancelModal from './GastoCancelModal';
import { moneda, fechaFormato, codigoGasto } from './gastosHelpers';
import './Gastos.css';

const POR_PAGINA = 8;

export default function GastosView() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [estatus, setEstatus] = useState('');
  const [pagina, setPagina] = useState(1);

  const [modalFormulario, setModalFormulario] = useState(false);
  const [gastoEditar, setGastoEditar] = useState(null);
  const [gastoCancelar, setGastoCancelar] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');

      const [respuestaGastos, respuestaCategorias, respuestaResumen] =
        await Promise.all([
          api.getGastos(),
          api.getCategoriasGastos(),
          api.getResumenGastos()
        ]);

      setGastos(respuestaGastos.data || []);
      setCategorias(respuestaCategorias.data || []);
      setResumen(respuestaResumen.data || {});
    } catch (err) {
      setError(err.message || 'No fue posible cargar los gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoriaFiltro, estatus]);

  const abrirNuevo = () => {
    setGastoEditar(null);
    setModalFormulario(true);
  };

  const abrirEditar = (gasto) => {
    setGastoEditar(gasto);
    setModalFormulario(true);
  };

  const guardarGasto = async (datos) => {
    if (gastoEditar) {
      await api.actualizarGasto(gastoEditar.id_gasto, datos);
      setFeedback({ type: 'success', message: 'Gasto actualizado correctamente.' });
    } else {
      await api.crearGasto(datos);
      setFeedback({ type: 'success', message: 'Gasto registrado correctamente.' });
    }
    setModalFormulario(false);
    setGastoEditar(null);
    await cargarDatos();
  };

  const confirmarCancelacion = async (gasto) => {
    await api.cancelarGasto(gasto.id_gasto);
    setFeedback({ type: 'success', message: `Gasto ${codigoGasto(gasto.id_gasto)} cancelado correctamente.` });
    setGastoCancelar(null);
    await cargarDatos();
  };

  const gastosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return gastos.filter((gasto) => {
      const matchQ = !q ||
        (gasto.concepto && gasto.concepto.toLowerCase().includes(q)) ||
        (gasto.categoria && gasto.categoria.toLowerCase().includes(q)) ||
        String(gasto.id_gasto).includes(q);

      const matchEstatus = !estatus || gasto.estatus === estatus;
      const matchCat = !categoriaFiltro || String(gasto.id_categoria) === String(categoriaFiltro);

      return matchQ && matchEstatus && matchCat;
    });
  }, [gastos, busqueda, estatus, categoriaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(gastosFiltrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const visibles = gastosFiltrados.slice(inicio, inicio + POR_PAGINA);

  const hayFiltros = busqueda || estatus || categoriaFiltro;
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstatus('');
    setCategoriaFiltro('');
  };

  // Calcular métricas
  const totalActivos = gastos.filter((g) => g.estatus === 'activo');
  const montoActivo = totalActivos.reduce((s, g) => s + Number(g.monto || 0), 0);
  const enEfectivo = totalActivos
    .filter((g) => String(g.forma_pago || '').toLowerCase() === 'efectivo')
    .reduce((s, g) => s + Number(g.monto || 0), 0);
  const canceladosCount = gastos.filter((g) => g.estatus === 'cancelado').length;

  return (
    <div className="gastos">
      {/* Encabezado con tipografía y estilo de Ventas */}
      <div className="ven-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0B132B', letterSpacing: '-0.01em' }}>
            Gastos
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
            Control de gastos de operación del negocio y salidas de efectivo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ borderRadius: 9999, padding: '10px 22px', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
            onClick={abrirNuevo}
          >
            <Plus size={18} /> Registrar gasto
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`} style={{ borderRadius: 14 }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1, fontWeight: 600 }}>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ borderRadius: 14 }}>
          <AlertCircle size={18} />
          <span style={{ flex: 1, fontWeight: 600 }}>{error}</span>
          <button type="button" className="btn btn-secondary" style={{ borderRadius: 9999 }} onClick={cargarDatos}>
            Reintentar
          </button>
        </div>
      )}

      {/* 4 Stat Cards congruentes con Ventas */}
      <div className="stat-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#E8ECFB', color: '#142A95' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div className="stat-label">Total de gastos</div>
            <div className="stat-value">{resumen.total_gastos || gastos.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#E3F5EE', color: '#12805C' }}>
            <Wallet size={22} />
          </div>
          <div>
            <div className="stat-label">Monto total activo</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>
              {moneda(montoActivo || resumen.monto_total)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#FDF3E1', color: '#B26A00' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="stat-label">En efectivo (Caja)</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>
              {moneda(enEfectivo)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#FCEDEC', color: '#C2362F' }}>
            <Ban size={22} />
          </div>
          <div>
            <div className="stat-label">Gastos cancelados</div>
            <div className="stat-value">{canceladosCount || resumen.gastos_cancelados || 0}</div>
          </div>
        </div>
      </div>

      {/* Contenedor de tabla con estilo de Ventas */}
      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '16px 22px', margin: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <div className="table-search-input" style={{ flex: '0 1 260px' }}>
            <div className="input-with-icon">
              <Search className="input-icon" size={17} style={{ color: '#6B7280' }} />
              <input
                className="form-input form-input-pill"
                placeholder="Buscar concepto o folio..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <select
            className="table-pill-select"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="">Categoría: Todas</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            className="table-pill-select"
            value={estatus}
            onChange={(e) => setEstatus(e.target.value)}
          >
            <option value="">Estatus: Todos</option>
            <option value="activo">Activos</option>
            <option value="cancelado">Cancelados</option>
          </select>

          {hayFiltros && (
            <button
              type="button"
              className="gas-limpiar"
              onClick={limpiarFiltros}
              style={{ background: 'none', border: 'none', color: '#142A95', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: '6px 10px' }}
            >
              Limpiar filtros
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderRadius: 9999, padding: '7px 16px', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={cargarDatos}
            disabled={loading}
          >
            <RotateCw size={15} className={loading ? 'spinning' : ''} /> Actualizar
          </button>
        </div>

        <div className="table-container-clean">
          {loading ? (
            <div className="cli-empty" style={{ padding: 60, textAlign: 'center' }}>
              <RotateCw className="spinning" size={28} style={{ color: '#142A95' }} />
              <p style={{ marginTop: 12, color: '#6B7280', fontWeight: 500 }}>Cargando gastos...</p>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>FOLIO</th>
                  <th>FECHA</th>
                  <th>CONCEPTO</th>
                  <th>CATEGORÍA</th>
                  <th>MONTO</th>
                  <th>FORMA DE PAGO</th>
                  <th>ESTATUS</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {visibles.map((gasto) => (
                  <tr key={gasto.id_gasto}>
                    <td style={{ color: '#142A95', fontWeight: 700 }}>
                      {codigoGasto(gasto.id_gasto)}
                    </td>
                    <td>{fechaFormato(gasto.fecha)}</td>
                    <td>
                      <strong style={{ color: '#0B132B' }}>{gasto.concepto}</strong>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: 2 }}>
                        {gasto.nombre_usuario || 'Sistema'} {gasto.apellido_paterno || ''}
                      </div>
                    </td>
                    <td>
                      <span className="ven-pill blue" style={{ background: '#E8ECFB', color: '#142A95' }}>
                        {gasto.categoria || 'General'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0B132B' }}>
                      {moneda(gasto.monto)}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {gasto.forma_pago || 'efectivo'}
                    </td>
                    <td>
                      <span className={`ven-pill ${gasto.estatus === 'activo' ? 'green' : 'red'}`}>
                        {gasto.estatus === 'activo' ? 'Activo' : 'Cancelado'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        {gasto.estatus === 'activo' ? (
                          <>
                            <button
                              type="button"
                              className="action-circle-btn"
                              title="Modificar gasto"
                              onClick={() => abrirEditar(gasto)}
                              style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8ECFB', color: '#142A95', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="action-circle-btn"
                              title="Cancelar gasto"
                              onClick={() => setGastoCancelar(gasto)}
                              style={{ width: 32, height: 32, borderRadius: '50%', background: '#FCEDEC', color: '#C2362F', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Ban size={14} />
                            </button>
                          </>
                        ) : (
                          <span style={{ color: '#9AA1B8', fontSize: 12 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={8} className="cli-empty" style={{ textAlign: 'center', padding: '48px 16px', color: '#6B7280' }}>
                      {hayFiltros
                        ? 'No se encontraron gastos con esos filtros.'
                        : 'Aún no hay gastos registrados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación estilo Ventas */}
        <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E4E8F5' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>
            Mostrando {visibles.length} de {gastosFiltrados.length} gastos
          </span>

          {totalPaginas > 1 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ borderRadius: 9999, padding: '6px 12px', fontSize: 12 }}
                disabled={paginaActual <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0B132B', padding: '0 8px' }}>
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ borderRadius: 9999, padding: '6px 12px', fontSize: 12 }}
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modales modernos */}
      {modalFormulario && (
        <GastoFormModal
          gasto={gastoEditar}
          categorias={categorias}
          onClose={() => {
            setModalFormulario(false);
            setGastoEditar(null);
          }}
          onSave={guardarGasto}
        />
      )}

      {gastoCancelar && (
        <GastoCancelModal
          gasto={gastoCancelar}
          onClose={() => setGastoCancelar(null)}
          onConfirm={confirmarCancelacion}
        />
      )}
    </div>
  );
}

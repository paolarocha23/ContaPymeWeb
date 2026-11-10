
import React, { useEffect, useState } from 'react';
import {
  Plus, Search, Pencil, X, RotateCw, Receipt,
  Wallet, CircleCheck, CircleAlert, Ban
} from 'lucide-react';
import { api } from '../../services/api';
import './Gastos.css';

const moneda = (valor) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(valor || 0));

const fechaFormato = (fecha) => {
  if (!fecha) return '—';

  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const FORM_VACIO = {
  fecha: new Date().toISOString().slice(0, 10),
  concepto: '',
  id_categoria: '1',
  monto: '',
  forma_pago: 'efectivo',
  observaciones: ''
};

export default function GastosView() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estatus, setEstatus] = useState('');
  const [modal, setModal] = useState(false);
  const [gastoEditar, setGastoEditar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
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

  const abrirNuevo = () => {
    setGastoEditar(null);
    setForm(FORM_VACIO);
    setModal(true);
  };

  const abrirEditar = (gasto) => {
    setGastoEditar(gasto);
    setForm({
      fecha: gasto.fecha?.slice(0, 10) || '',
      concepto: gasto.concepto,
      id_categoria: String(gasto.id_categoria),
      monto: gasto.monto,
      forma_pago: gasto.forma_pago,
      observaciones: gasto.observaciones || ''
    });
    setModal(true);
  };

  const cambiarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const guardarGasto = async (ev) => {
    ev.preventDefault();

    if (!form.concepto.trim() || !form.monto || Number(form.monto) <= 0) {
      setFeedback({
        type: 'error',
        message: 'Completa el concepto y captura un monto válido.'
      });
      return;
    }

    try {
      setGuardando(true);

      const datos = {
        ...form,
        monto: Number(form.monto),
        id_categoria: Number(form.id_categoria)
      };

      if (gastoEditar) {
        await api.actualizarGasto(gastoEditar.id_gasto, datos);
        setFeedback({ type: 'success', message: 'Gasto actualizado correctamente.' });
      } else {
        await api.crearGasto(datos);
        setFeedback({ type: 'success', message: 'Gasto registrado correctamente.' });
      }

      setModal(false);
      await cargarDatos();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'No fue posible guardar el gasto.'
      });
    } finally {
      setGuardando(false);
    }
  };

  const cancelarGasto = async (gasto) => {
    const confirmar = window.confirm(
      `¿Deseas cancelar el gasto "${gasto.concepto}"?`
    );

    if (!confirmar) return;

    try {
      await api.cancelarGasto(gasto.id_gasto);
      setFeedback({ type: 'success', message: 'Gasto cancelado correctamente.' });
      await cargarDatos();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'No fue posible cancelar el gasto.'
      });
    }
  };

  const gastosFiltrados = gastos.filter((gasto) => {
    const coincideBusqueda = gasto.concepto
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideEstatus = !estatus || gasto.estatus === estatus;

    return coincideBusqueda && coincideEstatus;
  });

  return (
    <div className="gastos">
      <div className="cli-title">
        <div>
          <h2>Gastos</h2>
          <p>Registra y administra los gastos de operación del negocio.</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={abrirNuevo}>
          <Plus size={18} /> Registrar gasto
        </button>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`}>
          {feedback.type === 'success'
            ? <CircleCheck size={18} />
            : <CircleAlert size={18} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <CircleAlert size={18} />
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={cargarDatos}>
            Reintentar
          </button>
        </div>
      )}

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper"><Receipt size={22} /></div>
          <div>
            <div className="stat-label">Total de gastos</div>
            <div className="stat-value">{resumen.total_gastos || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper"><Wallet size={22} /></div>
          <div>
            <div className="stat-label">Monto total</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>
              {moneda(resumen.monto_total)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#FCEDEC', color: '#C2362F' }}>
            <Ban size={22} />
          </div>
          <div>
            <div className="stat-label">Gastos cancelados</div>
            <div className="stat-value">{resumen.gastos_cancelados || 0}</div>
          </div>
        </div>
      </div>

      <div className="content-box" style={{ padding: 0, marginBottom: 0, overflow: 'hidden' }}>
        <div className="table-filter-bar" style={{ padding: '18px 22px', margin: 0 }}>
          <div className="table-search-input">
            <div className="input-with-icon">
              <Search className="input-icon" size={18} />
              <input
                className="form-input form-input-pill"
                placeholder="Buscar por concepto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <select
            className="table-pill-select"
            value={estatus}
            onChange={(e) => setEstatus(e.target.value)}
          >
            <option value="">Estatus: Todos</option>
            <option value="activo">Activos</option>
            <option value="cancelado">Cancelados</option>
          </select>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={cargarDatos}
            disabled={loading}
          >
            <RotateCw size={16} /> Actualizar
          </button>
        </div>

        <div className="table-container-clean">
          {loading ? (
            <div className="cli-empty" style={{ padding: 60 }}>
              <RotateCw className="spinning" size={28} />
              <p>Cargando gastos...</p>
            </div>
          ) : (
            <table className="table-clean">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>FECHA</th>
                  <th>CONCEPTO</th>
                  <th>CATEGORÍA</th>
                  <th>MONTO</th>
                  <th>FORMA DE PAGO</th>
                  <th>ESTATUS</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {gastosFiltrados.map((gasto) => (
                  <tr key={gasto.id_gasto}>
                    <td>{gasto.id_gasto}</td>
                    <td>{fechaFormato(gasto.fecha)}</td>
                    <td>
                      <strong>{gasto.concepto}</strong>
                      <div className="gastos-small">
                        {gasto.nombre_usuario} {gasto.apellido_paterno}
                      </div>
                    </td>
                    <td>{gasto.categoria}</td>
                    <td style={{ fontWeight: 700 }}>{moneda(gasto.monto)}</td>
                    <td>{gasto.forma_pago}</td>
                    <td>
                      <span className={`badge ${gasto.estatus === 'activo' ? 'badge-active' : 'badge-inactive'}`}>
                        {gasto.estatus === 'activo' ? 'Activo' : 'Cancelado'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-group">
                        {gasto.estatus === 'activo' && (
                          <>
                            <button
                              type="button"
                              className="action-circle-btn"
                              title="Modificar"
                              onClick={() => abrirEditar(gasto)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-circle-btn"
                              title="Cancelar"
                              onClick={() => cancelarGasto(gasto)}
                            >
                              <Ban size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {gastosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={8} className="cli-empty">
                      {busqueda || estatus
                        ? 'No se encontraron gastos con esos filtros.'
                        : 'Aún no hay gastos registrados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-pagination-footer" style={{ margin: 0, padding: '16px 22px' }}>
          <span>{gastosFiltrados.length} gastos encontrados</span>
          <span style={{ color: '#94a3b8' }}>Gastos · ContaPyme</span>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop">
          <form className="modal-content gastos-modal" onSubmit={guardarGasto}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>{gastoEditar ? 'Modificar gasto' : 'Registrar gasto'}</h3>
                <p>Completa la información del gasto.</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="gastos-form-grid">
                <div className="form-group">
                  <label className="form-label">Fecha *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.fecha}
                    onChange={(e) => cambiarCampo('fecha', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-select"
                    value={form.id_categoria}
                    onChange={(e) => cambiarCampo('id_categoria', e.target.value)}
                    required
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria.id_categoria} value={categoria.id_categoria}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group gastos-full">
                  <label className="form-label">Concepto *</label>
                  <input
                    className="form-input"
                    value={form.concepto}
                    onChange={(e) => cambiarCampo('concepto', e.target.value)}
                    placeholder="Ej. Pago de servicio de internet"
                    maxLength={255}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Monto *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.monto}
                    onChange={(e) => cambiarCampo('monto', e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Forma de pago *</label>
                  <select
                    className="form-select"
                    value={form.forma_pago}
                    onChange={(e) => cambiarCampo('forma_pago', e.target.value)}
                    required
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>

                <div className="form-group gastos-full">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={form.observaciones}
                    onChange={(e) => cambiarCampo('observaciones', e.target.value)}
                    placeholder="Información adicional (opcional)"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModal(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : gastoEditar ? 'Guardar cambios' : 'Registrar gasto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

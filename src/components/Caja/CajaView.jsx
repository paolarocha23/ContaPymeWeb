import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import './Caja.css';

const formatoMoneda = (cantidad) =>
  Number(cantidad || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });

const fechaActual = () => {
  const ahora = new Date();
  const zonaLocal = new Date(
    ahora.getTime() - ahora.getTimezoneOffset() * 60000
  );

  return zonaLocal.toISOString().slice(0, 16);
};

const fechaLegible = (fecha) => {
  if (!fecha) return '—';

  return new Date(fecha).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

function CajaView() {
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState({
    total_entradas: 0,
    total_salidas: 0,
    saldo: 0
  });

  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    tipo: '',
    concepto: ''
  });

  const [formulario, setFormulario] = useState({
    fecha: fechaActual(),
    tipo: 'entrada',
    concepto: '',
    monto: ''
  });

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      const parametros = Object.fromEntries(
        Object.entries(filtros).filter(([, valor]) => valor !== '')
      );

      const [respuestaMovimientos, respuestaResumen] = await Promise.all([
        api.getMovimientosCaja(parametros),
        api.getResumenCaja(parametros)
      ]);

      setMovimientos(
        respuestaMovimientos.data ?? respuestaMovimientos ?? []
      );

      setResumen(
        respuestaResumen.data ?? respuestaResumen ?? {
          total_entradas: 0,
          total_salidas: 0,
          saldo: 0
        }
      );
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los movimientos');
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const cambiarFiltro = (e) => {
    const { name, value } = e.target;

    setFiltros((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const cambiarFormulario = (e) => {
    const { name, value } = e.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fecha_inicio: '',
      fecha_fin: '',
      tipo: '',
      concepto: ''
    });
  };

  const abrirFormulario = (tipo) => {
    setFormulario({
      fecha: fechaActual(),
      tipo,
      concepto: '',
      monto: ''
    });

    setMensaje('');
    setError('');
    setMostrarFormulario(true);
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();

    if (!formulario.concepto.trim()) {
      setError('Escribe el concepto del movimiento');
      return;
    }

    if (!formulario.monto || Number(formulario.monto) <= 0) {
      setError('El monto debe ser mayor que cero');
      return;
    }

    try {
      setGuardando(true);
      setError('');
      setMensaje('');

      const datos = {
        ...formulario,
        concepto: formulario.concepto.trim(),
        monto: Number(formulario.monto),
        fecha: formulario.fecha
          ? formulario.fecha.replace('T', ' ') + ':00'
          : null
      };

      const respuesta = await api.crearMovimientoCaja(datos);

      if (respuesta.success === false) {
        throw new Error(respuesta.message || 'No se pudo registrar el movimiento');
      }

      setMostrarFormulario(false);
      setMensaje('Movimiento registrado correctamente');

      await cargarDatos();
    } catch (err) {
      setError(err.message || 'Ocurrió un error al registrar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="caja-container">
      <div className="caja-header">
        <div>
          <h1>Caja / Efectivo</h1>
          <p>Control de entradas, salidas y saldo disponible.</p>
        </div>

        <button
          className="caja-btn caja-btn-primary"
          onClick={() => abrirFormulario('entrada')}
        >
           Registrar movimiento
        </button>
      </div>

      {error && (
        <div className="caja-alert caja-alert-error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="caja-alert caja-alert-success">
          {mensaje}
        </div>
      )}

      <div className="caja-resumen">
        <div className="caja-card caja-card-saldo">
          <span>Saldo de Caja</span>
          <strong>{formatoMoneda(resumen.saldo)}</strong>
          <small>Resultado del periodo seleccionado</small>
        </div>

        <div className="caja-card">
          <span>Total de entradas</span>
          <strong className="caja-entrada">
            {formatoMoneda(resumen.total_entradas)}
          </strong>
          <small>Dinero recibido</small>
        </div>

        <div className="caja-card">
          <span>Total de salidas</span>
          <strong className="caja-salida">
            {formatoMoneda(resumen.total_salidas)}
          </strong>
          <small>Dinero utilizado</small>
        </div>
      </div>

      <div className="caja-acciones">
        <button
          className="caja-btn caja-btn-entrada"
          onClick={() => abrirFormulario('entrada')}
        >
          Entrada de efectivo
        </button>

        <button
          className="caja-btn caja-btn-salida"
          onClick={() => abrirFormulario('salida')}
        >
           Salida de efectivo
        </button>
      </div>

      <section className="caja-seccion">
        <div className="caja-seccion-header">
          <div>
            <h2>Historial de movimientos</h2>
            <p>Consulta los movimientos registrados en Caja.</p>
          </div>
        </div>

        <div className="caja-filtros">
          <div>
            <label>Fecha inicial</label>
            <input
              type="date"
              name="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={cambiarFiltro}
            />
          </div>

          <div>
            <label>Fecha final</label>
            <input
              type="date"
              name="fecha_fin"
              value={filtros.fecha_fin}
              onChange={cambiarFiltro}
            />
          </div>

          <div>
            <label>Tipo de movimiento</label>
            <select
              name="tipo"
              value={filtros.tipo}
              onChange={cambiarFiltro}
            >
              <option value="">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
            </select>
          </div>

          <div>
            <label>Buscar concepto</label>
            <input
              type="text"
              name="concepto"
              placeholder="Escribe un concepto"
              value={filtros.concepto}
              onChange={cambiarFiltro}
            />
          </div>

          <button
            className="caja-btn caja-btn-secondary"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="caja-tabla-contenedor">
          {cargando ? (
            <p className="caja-vacio">Cargando movimientos...</p>
          ) : movimientos.length === 0 ? (
            <p className="caja-vacio">No se encontraron movimientos.</p>
          ) : (
            <table className="caja-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Usuario</th>
                  <th>Monto</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id_movimiento}>
                    <td>{fechaLegible(movimiento.fecha)}</td>
                    <td>{movimiento.concepto}</td>
                    <td>
                      <span className={`caja-etiqueta ${movimiento.tipo}`}>
                        {movimiento.tipo}
                      </span>
                    </td>
                    <td>{movimiento.origen}</td>
                    <td>
                      {movimiento.nombre_usuario || '—'}{' '}
                      {movimiento.apellido_paterno || ''}
                    </td>
                    <td className={movimiento.tipo === 'entrada'
                      ? 'caja-entrada'
                      : 'caja-salida'
                    }>
                      {movimiento.tipo === 'entrada' ? '+' : '-'}
                      {formatoMoneda(movimiento.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {mostrarFormulario && (
        <div className="caja-modal-fondo">
          <div className="caja-modal">
            <div className="caja-modal-header">
              <div>
                <h2>
                  {formulario.tipo === 'entrada'
                    ? 'Registrar entrada'
                    : 'Registrar salida'}
                </h2>
                <p>Ingresa los datos del movimiento.</p>
              </div>

              <button
                type="button"
                className="caja-cerrar"
                onClick={() => setMostrarFormulario(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarMovimiento}>
              <div className="caja-campo">
                <label>Tipo de movimiento</label>
                <select
                  name="tipo"
                  value={formulario.tipo}
                  onChange={cambiarFormulario}
                  required
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>

              <div className="caja-campo">
                <label>Fecha y hora</label>
                <input
                  type="datetime-local"
                  name="fecha"
                  value={formulario.fecha}
                  onChange={cambiarFormulario}
                  required
                />
              </div>

              <div className="caja-campo">
                <label>Concepto</label>
                <input
                  type="text"
                  name="concepto"
                  value={formulario.concepto}
                  onChange={cambiarFormulario}
                  placeholder="Ej. Fondo inicial de caja"
                  maxLength={255}
                  required
                />
              </div>

              <div className="caja-campo">
                <label>Monto</label>
                <input
                  type="number"
                  name="monto"
                  value={formulario.monto}
                  onChange={cambiarFormulario}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="caja-modal-acciones">
                <button
                  type="button"
                  className="caja-btn caja-btn-secondary"
                  onClick={() => setMostrarFormulario(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="caja-btn caja-btn-primary"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CajaView;

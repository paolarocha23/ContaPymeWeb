import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, List, Search, ChevronDown, Plus, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import ModalEntradaCaja from './ModalEntradaCaja';
import ModalSalidaCaja from './ModalSalidaCaja';
import {
  formatoMoneda, fechaActual, fechaCorta, mesActual, rangoDeMes, capitalizar, nombreUsuarioActual
} from './cajaUtils';
import './Caja.css';

const POR_PAGINA = 8;
const RESUMEN_VACIO = { total_entradas: 0, total_salidas: 0, saldo: 0 };

function CajaView({ usuario }) {
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState(RESUMEN_VACIO);

  // Filtros que viajan al backend (mismos parámetros de antes: fecha_inicio, fecha_fin, tipo, concepto)
  const [filtros, setFiltros] = useState({ mes: mesActual(), tipo: '', concepto: '' });
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState(''); // filtro local
  const [pagina, setPagina] = useState(1);

  const [formulario, setFormulario] = useState({ fecha: fechaActual(), tipo: 'entrada', concepto: '', monto: '' });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const nombreUsuario = usuario || nombreUsuarioActual();

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      const { mes, ...resto } = filtros;
      const parametros = Object.fromEntries(
        Object.entries({ ...rangoDeMes(mes), ...resto }).filter(([, v]) => v !== '')
      );

      const [resMov, resRes] = await Promise.all([
        api.getMovimientosCaja(parametros),
        api.getResumenCaja(parametros)
      ]);

      setMovimientos(resMov.data ?? resMov ?? []);
      setResumen(resRes.data ?? resRes ?? RESUMEN_VACIO);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los movimientos');
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Actualización automática al registrar compras, cobros, gastos o al volver a la pestaña
  useEffect(() => {
    const handleActualizacion = () => cargarDatos();
    window.addEventListener('contapyme_operacion_registrada', handleActualizacion);
    window.addEventListener('focus', handleActualizacion);
    return () => {
      window.removeEventListener('contapyme_operacion_registrada', handleActualizacion);
      window.removeEventListener('focus', handleActualizacion);
    };
  }, [cargarDatos]);

  // Búsqueda con pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.concepto === busqueda ? f : { ...f, concepto: busqueda })), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [filtros, origen]);

  const cambiarFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const limpiarFiltros = () => {
    setFiltros({ mes: mesActual(), tipo: '', concepto: '' });
    setBusqueda('');
    setOrigen('');
  };

  const cambiarFormulario = (e) => {
    const { name, value } = e.target;
    setFormulario((f) => ({ ...f, [name]: value }));
  };

  const abrirFormulario = (tipo) => {
    setFormulario({ fecha: fechaActual(), tipo, concepto: '', monto: '' });
    setMensaje('');
    setError('');
    setMostrarFormulario(true);
  };

  // Cambia entre entrada/salida dentro del modal sin perder lo capturado
  const cambiarTipo = (tipo) => setFormulario((f) => ({ ...f, tipo }));

  const cerrarFormulario = () => {
    if (guardando) return;
    setMostrarFormulario(false);
    setError('');
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();

    if (!formulario.concepto.trim()) { setError('Escribe el concepto del movimiento'); return; }
    if (!formulario.monto || Number(formulario.monto) <= 0) { setError('El monto debe ser mayor que cero'); return; }

    try {
      setGuardando(true);
      setError('');
      setMensaje('');

      const datos = {
        ...formulario,
        concepto: formulario.concepto.trim(),
        monto: Number(formulario.monto),
        fecha: formulario.fecha ? formulario.fecha.replace('T', ' ') + ':00' : null
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

  // ── derivados ──
  const origenes = useMemo(
    () => [...new Set(movimientos.map((m) => m.origen).filter(Boolean))],
    [movimientos]
  );

  const visibles = useMemo(
    () => (origen ? movimientos.filter((m) => m.origen === origen) : movimientos),
    [movimientos, origen]
  );

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const filas = visibles.slice(desde, desde + POR_PAGINA);

  const etiquetaPeriodo = filtros.mes ? 'del mes' : 'totales';
  const propsModal = {
    formulario,
    onChange: cambiarFormulario,
    onCambiarTipo: cambiarTipo,
    onSubmit: guardarMovimiento,
    onClose: cerrarFormulario,
    guardando,
    error,
    saldoActual: Number(resumen.saldo || 0),
    usuario: nombreUsuario
  };

  return (
    <div className="caja">
      {/* ── Encabezado ── */}
      <div className="caja-title">
        <div>
          <h2>Caja / Efectivo</h2>
          <p>Controla las entradas y salidas de efectivo y consulta el saldo disponible en caja.</p>
        </div>
        <button type="button" className="caja-btn caja-btn-primary" onClick={() => abrirFormulario('entrada')}>
          <Wallet size={16} /> Registrar movimiento
        </button>
      </div>

      {error && !mostrarFormulario && (
        <div className="caja-alert err" role="alert"><AlertCircle size={16} /> {error}</div>
      )}
      {mensaje && <div className="caja-alert ok" role="status">{mensaje}</div>}

      {/* ── Tarjetas de resumen ── */}
      <div className="caja-stats">
        <div className="caja-stat">
          <span className="caja-stat-ico green"><ArrowDownToLine size={20} /></span>
          <div><small>Entradas {etiquetaPeriodo}</small><strong className="pos">{formatoMoneda(resumen.total_entradas)}</strong></div>
        </div>
        <div className="caja-stat">
          <span className="caja-stat-ico red"><ArrowUpFromLine size={20} /></span>
          <div><small>Salidas {etiquetaPeriodo}</small><strong className="neg">{formatoMoneda(resumen.total_salidas)}</strong></div>
        </div>
        <div className="caja-stat">
          <span className="caja-stat-ico blue"><List size={20} /></span>
          <div><small>Movimientos {etiquetaPeriodo}</small><strong>{movimientos.length}</strong></div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="caja-filters">
        <div className="caja-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Concepto o referencia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <label className="caja-pillsel">
          <span>Tipo:</span>
          <select name="tipo" value={filtros.tipo} onChange={cambiarFiltro}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
          <ChevronDown size={14} />
        </label>

        <label className="caja-pillsel">
          <span>Origen:</span>
          <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="">Todos</option>
            {origenes.map((o) => <option key={o} value={o}>{capitalizar(o)}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>

        <label className="caja-pillsel caja-pillsel-date">
          <span>Fecha:</span>
          <input type="month" name="mes" value={filtros.mes} onChange={cambiarFiltro} />
        </label>

        <button type="button" className="caja-clear" onClick={limpiarFiltros}>Limpiar</button>
      </div>

      {/* ── Tabla ── */}
      <div className="caja-box">
        <div className="caja-table-wrap">
          {cargando ? (
            <p className="caja-empty">Cargando movimientos...</p>
          ) : visibles.length === 0 ? (
            <p className="caja-empty">No se encontraron movimientos.</p>
          ) : (
            <table className="caja-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Monto</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((m, i) => (
                  <tr key={m.id_movimiento} style={{ '--i': i }}>
                    <td className="caja-muted">{fechaCorta(m.fecha)}</td>
                    <td className="caja-concept">{m.concepto}</td>
                    <td>
                      <span className={`caja-pill ${m.tipo === 'entrada' ? 'green' : 'red'}`}>{capitalizar(m.tipo)}</span>
                    </td>
                    <td className="caja-muted">{capitalizar(m.origen) || '—'}</td>
                    <td className={m.tipo === 'entrada' ? 'caja-amt pos' : 'caja-amt neg'}>
                      {m.tipo === 'entrada' ? '+' : '-'}{formatoMoneda(m.monto)}
                    </td>
                    <td className="caja-muted">
                      {[m.nombre_usuario, m.apellido_paterno].filter(Boolean).join(' ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!cargando && visibles.length > 0 && (
          <div className="caja-foot">
            <span>
              Mostrando {desde + 1}-{Math.min(desde + POR_PAGINA, visibles.length)} de {visibles.length} movimientos
            </span>
            <div className="caja-pager">
              <button type="button" disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} aria-label="Anterior">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={n === paginaActual ? 'on' : ''} onClick={() => setPagina(n)}>{n}</button>
              ))}
              <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)} aria-label="Siguiente">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {mostrarFormulario && formulario.tipo === 'entrada' && <ModalEntradaCaja {...propsModal} />}
      {mostrarFormulario && formulario.tipo === 'salida' && <ModalSalidaCaja {...propsModal} />}
    </div>
  );
}

export default CajaView;
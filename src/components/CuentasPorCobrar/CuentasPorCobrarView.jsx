import React, { useState } from 'react';
import {
  Search,
  RotateCw,
  Wallet,
  FileText,
  Clock,
  AlertTriangle,
  CircleCheck,
  CircleDollarSign,
  CreditCard,
  History,
  X
} from 'lucide-react';

import { useCuentasPorCobrar } from '../../hooks/useCuentasPorCobrar';
import { api } from '../../services/api';
import './CuentasPorCobrar.css';

const moneda = (valor) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(valor || 0));

const fecha = (valor) => {
  if (!valor) return '—';

  const texto = String(valor).slice(0, 10);
  const partes = texto.split('-');

  if (partes.length !== 3) return '—';

  return new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  ).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const obtenerEstado = (cuenta) => {
  const estado = normalizar(cuenta.estado_calculado || cuenta.estatus);
  const saldo = Number(cuenta.saldo_pendiente || 0);

  if (estado === 'cancelada') return 'Cancelada';
  if (saldo <= 0 || ['saldada', 'pagada'].includes(estado)) return 'Saldada';
  if (estado === 'vencida') return 'Vencida';
  if (estado === 'parcial') return 'Parcial';

  return 'Pendiente';
};

const claseEstado = (estado) => ({
  Saldada: 'cxc-status-paid',
  Pendiente: 'cxc-status-pending',
  Parcial: 'cxc-status-partial',
  Vencida: 'cxc-status-overdue',
  Cancelada: 'cxc-status-cancelled'
}[estado] || 'cxc-status-pending');

export default function CuentasPorCobrarView() {
  const {
    cuentas,
    resumen,
    loading,
    error,
    filtros,
    actualizarFiltros,
    recargar
  } = useCuentasPorCobrar();

  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(null);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [mensaje, setMensaje] = useState('');

  const abrirPago = (cuenta) => {
    setCuentaSeleccionada(cuenta);
    setMonto('');
    setFormaPago('efectivo');
    setObservaciones('');
    setErrorModal('');
    setModal('pago');
  };

  const abrirHistorial = async (cuenta) => {
    setCuentaSeleccionada(cuenta);
    setHistorial([]);
    setErrorModal('');
    setModal('historial');
    setCargandoHistorial(true);

    try {
      const respuesta = await api.getPagosCxc(cuenta.id_cxc);
      setHistorial(respuesta.data || []);
    } catch (err) {
      setErrorModal(err.message || 'No se pudo cargar el historial.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModal(null);
    setCuentaSeleccionada(null);
    setErrorModal('');
  };

  const guardarCobro = async (evento) => {
    evento.preventDefault();

    if (!cuentaSeleccionada || guardando) return;

    const importe = Number(monto);
    const saldo = Number(cuentaSeleccionada.saldo_pendiente);

    if (
      !monto.trim() ||
      !Number.isFinite(importe) ||
      importe <= 0 ||
      Math.abs(importe * 100 - Math.round(importe * 100)) > 1e-7 ||
      importe > saldo
    ) {
      setErrorModal(
        'Ingresa un monto válido, con máximo dos decimales, que no supere el saldo pendiente.'
      );
      return;
    }

    setGuardando(true);
    setErrorModal('');

    try {
      await api.registrarCobroCxc(cuentaSeleccionada.id_cxc, {
        monto: importe,
        forma_pago: formaPago,
        observaciones: observaciones.trim()
      });

      setModal(null);
      setCuentaSeleccionada(null);
      setMensaje('El cobro se registró correctamente.');
      await recargar();
    } catch (err) {
      setErrorModal(err.message || 'No se pudo registrar el cobro.');
    } finally {
      setGuardando(false);
    }
  };

  const cuentasFiltradas = cuentas.filter((cuenta) => {
    const texto = normalizar(busqueda);

    if (!texto) return true;

    const cliente = normalizar(
      `${cuenta.nombre_cliente || ''} ${cuenta.apellidos || ''}`
    );
    const venta = normalizar(cuenta.codigo_venta);
    const id = String(cuenta.id_cxc || '');

    return cliente.includes(texto) || venta.includes(texto) || id.includes(texto);
  });

  const indicadores = [
    {
      titulo: 'Total de cuentas',
      valor: resumen?.total_cuentas ?? 0,
      icono: FileText
    },
    {
      titulo: 'Cuentas pendientes',
      valor: resumen?.cuentas_pendientes ?? 0,
      icono: Clock
    },
    {
      titulo: 'Cuentas vencidas',
      valor: resumen?.cuentas_vencidas ?? 0,
      icono: AlertTriangle
    },
    {
      titulo: 'Saldo pendiente',
      valor: moneda(resumen?.saldo_pendiente),
      icono: Wallet,
      dinero: true
    },
    {
      titulo: 'Saldo vencido',
      valor: moneda(resumen?.saldo_vencido),
      icono: CircleDollarSign,
      dinero: true
    }
  ];

  return (
    <div className="cxc">
      <div className="cxc-header">
        <div>
          <h2>Cuentas por cobrar</h2>
          <p>Consulta los saldos pendientes y registra los cobros de tus clientes.</p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={recargar}
          disabled={loading}
        >
          <RotateCw size={17} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="cxc-alert cxc-alert-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {mensaje && (
        <div className="cxc-alert cxc-alert-success">
          <CircleCheck size={18} />
          {mensaje}
          <button type="button" onClick={() => setMensaje('')}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="cxc-stats">
        {indicadores.map((item) => {
          const Icono = item.icono;

          return (
            <article className="cxc-stat-card" key={item.titulo}>
              <div className="cxc-stat-icon">
                <Icono size={21} />
              </div>
              <div>
                <span>{item.titulo}</span>
                <strong>{item.valor}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <section className="cxc-panel">
        <div className="cxc-toolbar">
          <div className="cxc-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar cliente, venta o cuenta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <select
            value={filtros.estatus}
            onChange={(e) => actualizarFiltros({ estatus: e.target.value })}
            aria-label="Filtrar por estatus"
          >
            <option value="todas">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Parciales</option>
            <option value="vencida">Vencidas</option>
            <option value="saldada">Saldadas</option>
          </select>
        </div>

        {loading ? (
          <div className="cxc-empty">Cargando cuentas por cobrar...</div>
        ) : cuentasFiltradas.length === 0 ? (
          <div className="cxc-empty">
            <FileText size={34} />
            <strong>No se encontraron cuentas</strong>
            <span>No hay cuentas que coincidan con la búsqueda o el filtro.</span>
          </div>
        ) : (
          <div className="cxc-table-wrapper">
            <table className="cxc-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Venta</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th>Monto original</th>
                  <th>Saldo pendiente</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cuentasFiltradas.map((cuenta) => {
                  const estado = obtenerEstado(cuenta);
                  const saldo = Number(cuenta.saldo_pendiente || 0);

                  return (
                    <tr key={cuenta.id_cxc}>
                      <td>
                        <strong>
                          {cuenta.nombre_cliente} {cuenta.apellidos}
                        </strong>
                        <small>Cuenta #{cuenta.id_cxc}</small>
                      </td>
                      <td>{cuenta.codigo_venta || `Venta #${cuenta.id_venta}`}</td>
                      <td>{fecha(cuenta.fecha_emision)}</td>
                      <td>{fecha(cuenta.fecha_vencimiento)}</td>
                      <td>{moneda(cuenta.monto_original)}</td>
                      <td className="cxc-balance">{moneda(saldo)}</td>
                      <td>
                        <span className={`cxc-status ${claseEstado(estado)}`}>
                          {estado}
                        </span>
                      </td>
                      <td>
                        <div className="cxc-actions">
                          {saldo > 0 && estado !== 'Cancelada' && (
                            <button
                              type="button"
                              className="cxc-action-primary"
                              onClick={() => abrirPago(cuenta)}
                            >
                              <CreditCard size={15} />
                              Cobrar
                            </button>
                          )}

                          <button
                            type="button"
                            className="cxc-action-secondary"
                            onClick={() => abrirHistorial(cuenta)}
                            title="Ver historial de cobros"
                          >
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && cuentaSeleccionada && (
        <div className="cxc-modal-overlay" onMouseDown={cerrarModal}>
          <section
            className="cxc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cxc-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="cxc-modal-header">
              <div>
                <h3 id="cxc-modal-title">
                  {modal === 'pago' ? 'Registrar cobro' : 'Historial de cobros'}
                </h3>
                <p>
                  {cuentaSeleccionada.nombre_cliente}{' '}
                  {cuentaSeleccionada.apellidos}
                </p>
              </div>

              <button type="button" onClick={cerrarModal} disabled={guardando}>
                <X size={20} />
              </button>
            </div>

            <div className="cxc-modal-content">
              <div className="cxc-account-summary">
                <span>Venta: {cuentaSeleccionada.codigo_venta || cuentaSeleccionada.id_venta}</span>
                <span>
                  Monto original: {moneda(cuentaSeleccionada.monto_original)}
                </span>
                <strong>
                  Saldo pendiente: {moneda(cuentaSeleccionada.saldo_pendiente)}
                </strong>
              </div>

              {errorModal && (
                <div className="cxc-alert cxc-alert-error" role="alert">
                  {errorModal}
                </div>
              )}

              {modal === 'pago' && (
                <form onSubmit={guardarCobro}>
                  <label htmlFor="cxc-monto">Monto del cobro</label>
                  <input
                    id="cxc-monto"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={cuentaSeleccionada.saldo_pendiente}
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />

                  <label htmlFor="cxc-forma">Forma de pago</label>
                  <select
                    id="cxc-forma"
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                  </select>

                  <label htmlFor="cxc-observaciones">Observaciones</label>
                  <textarea
                    id="cxc-observaciones"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones opcionales..."
                  />

                  <div className="cxc-modal-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cerrarModal}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={guardando}
                    >
                      {guardando ? 'Registrando...' : 'Confirmar cobro'}
                    </button>
                  </div>
                </form>
              )}

              {modal === 'historial' && (
                <div className="cxc-history">
                  {cargandoHistorial ? (
                    <p>Cargando historial...</p>
                  ) : historial.length === 0 ? (
                    <p className="cxc-empty-history">
                      Esta cuenta todavía no tiene cobros registrados.
                    </p>
                  ) : (
                    historial.map((pago) => (
                      <article className="cxc-history-item" key={pago.id_cobro}>
                        <div>
                          <strong>{moneda(pago.monto)}</strong>
                          <span>{fecha(pago.fecha)}</span>
                        </div>
                        <p>Forma de pago: {pago.forma_pago}</p>
                        <p>
                          Registrado por:{' '}
                          {[pago.nombre_usuario, pago.apellidos_usuario]
                            .filter(Boolean)
                            .join(' ') || '—'}
                        </p>
                        {pago.observaciones && <p>{pago.observaciones}</p>}
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

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
import { useCuentasPorPagar } from '../../hooks/useCuentasPorPagar';
import { api } from '../../services/api';

const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(valor || 0));

const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return '—';

    return valor.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};


const obtenerEstado = (cuenta) => {
    const estado = String(cuenta.estatus || '').toLowerCase();
    const saldo = Number(cuenta.saldo_pendiente || 0);

    // Cuenta completamente pagada
    if (saldo <= 0 || estado === 'pagada') {
        return 'Pagada';
    }

    // Comprobar si la fecha de vencimiento ya pasó
    if (cuenta.fecha_vencimiento) {
        const fecha = String(cuenta.fecha_vencimiento).slice(0, 10);

        const hoy = new Date();
        const fechaHoy = [
            hoy.getFullYear(),
            String(hoy.getMonth() + 1).padStart(2, '0'),
            String(hoy.getDate()).padStart(2, '0')
        ].join('-');

        if (fecha < fechaHoy) {
            return 'Vencida';
        }
    }

    // Cuenta con pagos parciales
    if (estado === 'parcial') {
        return 'Parcial';
    }

    // Cuenta pendiente de pago
    return 'Pendiente';
};


const claseEstado = (estado) => {
    const clases = {
        Pagada: 'badge-active',
        Pendiente: 'badge-custom',
        Parcial: 'badge-encargado',
        Vencida: 'badge-inactive'
    };

    return clases[estado] || 'badge-inactive';
};

export default function CuentasPorPagarView() {
    const {
        cuentas,
        resumen,
        loading,
        error,
        filtros,
        actualizarFiltros,
        recargar
    } = useCuentasPorPagar();

    const [busqueda, setBusqueda] = useState('');

    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [modalActivo, setModalActivo] = useState(null);
    const [montoPago, setMontoPago] = useState('');
    const [formaPago, setFormaPago] = useState('efectivo');
    const [observaciones, setObservaciones] = useState('');
    const [guardandoPago, setGuardandoPago] = useState(false);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [historialPagos, setHistorialPagos] = useState([]);
    const [errorModal, setErrorModal] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    const cerrarModal = () => {
        if (guardandoPago) return;

        setModalActivo(null);
        setCuentaSeleccionada(null);
        setErrorModal('');
    };

    const abrirPago = (cuenta) => {
        setCuentaSeleccionada(cuenta);
        setMontoPago('');
        setFormaPago('efectivo');
        setObservaciones('');
        setErrorModal('');
        setMensajeExito('');
        setModalActivo('pago');
    };

    const abrirHistorial = async (cuenta) => {
        setCuentaSeleccionada(cuenta);
        setHistorialPagos([]);
        setErrorModal('');
        setModalActivo('historial');
        setCargandoHistorial(true);

        try {
            const respuesta = await api.getPagosCxp(cuenta.id_cxp);
            setHistorialPagos(respuesta.data || []);
        } catch (error) {
            setErrorModal(error.message || 'No se pudo cargar el historial.');
        } finally {
            setCargandoHistorial(false);
        }
    };

    const guardarPago = async (evento) => {
        evento.preventDefault();

        if (!cuentaSeleccionada || guardandoPago) return;

        const monto = Number(montoPago);
        const saldo = Number(cuentaSeleccionada.saldo_pendiente);

        if (
            montoPago.trim() === '' ||
            !Number.isFinite(monto) ||
            monto <= 0 ||
            !Number.isSafeInteger(Math.round(monto * 100)) ||
            Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-7 ||
            monto > saldo
        ) {
            setErrorModal(
                'Ingresa un monto válido, con máximo dos decimales, que no supere el saldo pendiente.'
            );
            return;
        }

        setGuardandoPago(true);
        setErrorModal('');

        try {
            await api.registrarPagoCxp(cuentaSeleccionada.id_cxp, {
                monto,
                forma_pago: formaPago,
                observaciones: observaciones.trim()
            });

            setMensajeExito('El pago se registró correctamente.');
            setModalActivo(null);
            setCuentaSeleccionada(null);
            await recargar();
        } catch (error) {
            setErrorModal(
                error.message || 'No se pudo registrar el pago.'
            );
        } finally {
            setGuardandoPago(false);
        }
    };

    const normalizarTexto = (texto) =>
        String(texto ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

    const cuentasFiltradas = cuentas.filter((cuenta) => {
        const texto = normalizarTexto(busqueda);

        if (!texto) return true;

        const proveedor = normalizarTexto(cuenta.proveedor);
        const codigo = normalizarTexto(cuenta.codigo_compra);
        const numeroCuenta = String(cuenta.id_cxp ?? '');

        return (
            proveedor.includes(texto) ||
            codigo.includes(texto) ||
            numeroCuenta.includes(texto)
        );
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
            icono: AlertTriangle,
            alerta: true
        },
        {
            titulo: 'Saldo pendiente',
            valor: formatoMoneda(resumen?.saldo_pendiente),
            icono: Wallet,
            moneda: true
        },
        {
            titulo: 'Saldo vencido',
            valor: formatoMoneda(resumen?.saldo_vencido),
            icono: CircleDollarSign,
            moneda: true,
            alerta: true
        }
    ];

    return (
        <div className="cxp">

            {/* Encabezado */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 24
                }}
            >
                <div>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                        Cuentas por pagar
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Consulta y controla los pagos pendientes con tus proveedores.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={recargar}
                    disabled={loading}
                >
                    <RotateCw
                        size={17}
                        className={loading ? 'animate-spin' : ''}
                    />
                    Actualizar
                </button>
            </div>

            {/* Mensaje de error */}
            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Indicadores */}
            <div className="stat-card-grid">
                {indicadores.map((item) => {
                    const Icono = item.icono;

                    return (
                        <div className="stat-card" key={item.titulo}>
                            <div
                                className="stat-icon-wrapper"
                                style={
                                    item.alerta
                                        ? {
                                            background: '#fff1f2',
                                            color: '#e11d48'
                                        }
                                        : {}
                                }
                            >
                                <Icono size={22} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                                <div className="stat-label">{item.titulo}</div>
                                <div
                                    className="stat-value"
                                    style={{
                                        fontSize: item.moneda ? '1.25rem' : '1.75rem',
                                        color: item.alerta ? '#e11d48' : undefined,
                                        overflowWrap: 'anywhere'
                                    }}
                                >
                                    {item.valor}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tabla y filtros */}
            <div
                className="content-box"
                style={{
                    padding: 0,
                    marginBottom: 0,
                    overflow: 'hidden'
                }}
            >
                <div
                    className="table-filter-bar"
                    style={{
                        padding: '18px 22px',
                        margin: 0,
                        borderBottom: '1px solid #E4E8F5'
                    }}
                >
                    <div className="table-search-input">
                        <div className="input-with-icon">
                            <Search className="input-icon" size={18} />
                            <input
                                type="text"
                                className="form-input form-input-pill"
                                placeholder="Buscar proveedor, compra o cuenta..."
                                value={busqueda}
                                onInput={(e) => {
                                    setBusqueda(e.currentTarget.value);
                                }}
                            />
                        </div>
                    </div>

                    <select
                        className="table-pill-select"
                        value={filtros.estatus || ''}
                        onChange={(e) =>
                            actualizarFiltros({ estatus: e.target.value })
                        }
                    >
                        <option value="">Estatus: Todos</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="parcial">Parciales</option>
                        <option value="pagada">Pagadas</option>
                        <option value="vencida">Vencidas</option>
                    </select>
                </div>

                {/* Tabla */}
                <div className="table-container-clean">
                    {loading ? (
                        <div
                            style={{
                                padding: '60px 20px',
                                textAlign: 'center',
                                color: '#64748b'
                            }}
                        >
                            <RotateCw
                                className="animate-spin"
                                size={28}
                                style={{ color: '#183b9c', marginBottom: 10 }}
                            />
                            <p>Cargando cuentas por pagar...</p>
                        </div>
                    ) : (
                        <table className="table-clean">
                            <thead>
                                <tr>
                                    <th>PROVEEDOR</th>
                                    <th>COMPRA</th>
                                    <th>FECHA DE EMISIÓN</th>
                                    <th>VENCIMIENTO</th>
                                    <th>MONTO ORIGINAL</th>
                                    <th>SALDO PENDIENTE</th>
                                    <th>ESTATUS</th>
                                    <th>ACCIONES</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cuentasFiltradas.map((cuenta) => {
                                    const estado = obtenerEstado(cuenta);

                                    return (
                                        <tr key={cuenta.id_cxp}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>
                                                    {cuenta.proveedor || 'Proveedor'}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        color: '#94a3b8'
                                                    }}
                                                >
                                                    Cuenta #{cuenta.id_cxp}
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    style={{
                                                        color: '#183b9c',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {cuenta.codigo_compra || '—'}
                                                </span>
                                            </td>

                                            <td>{formatoFecha(cuenta.fecha_emision)}</td>

                                            <td>
                                                <span
                                                    style={{
                                                        color: estado === 'Vencida' ? '#e11d48' : '#475569',
                                                        fontWeight: estado === 'Vencida' ? 700 : 500
                                                    }}
                                                >
                                                    {formatoFecha(cuenta.fecha_vencimiento)}
                                                </span>
                                            </td>

                                            <td style={{ fontWeight: 600 }}>
                                                {formatoMoneda(cuenta.monto_original)}
                                            </td>

                                            <td style={{ fontWeight: 700 }}>
                                                {formatoMoneda(cuenta.saldo_pendiente)}
                                            </td>

                                            <td>
                                                <span className={`badge ${claseEstado(estado)}`}>
                                                    {estado === 'Pagada' && <CircleCheck size={13} />}
                                                    {estado === 'Vencida' && <AlertTriangle size={13} />}
                                                    {estado}
                                                </span>
                                            </td>

                                            <td>
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 8,
                                                    flexWrap: 'wrap'
                                                }}>
                                                    {Number(cuenta.saldo_pendiente) > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary"
                                                            onClick={() => abrirPago(cuenta)}
                                                            style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                                        >
                                                            <CreditCard size={15} />
                                                            Registrar pago
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => abrirHistorial(cuenta)}
                                                        style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                                                    >
                                                        <History size={15} />
                                                        Historial
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {cuentasFiltradas.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            style={{
                                                textAlign: 'center',
                                                padding: '55px 20px',
                                                color: '#64748b'
                                            }}
                                        >
                                            <FileText
                                                size={32}
                                                style={{
                                                    color: '#cbd5e1',
                                                    marginBottom: 10
                                                }}
                                            />
                                            <div style={{ fontWeight: 600, color: '#475569' }}>
                                                No hay cuentas por pagar
                                            </div>
                                            <div style={{ fontSize: '0.84rem', marginTop: 4 }}>
                                                {busqueda || filtros.estatus
                                                    ? 'No se encontraron cuentas con los filtros seleccionados.'
                                                    : 'Cuando registres compras a crédito, aparecerán aquí.'}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pie de tabla */}
                {!loading && (
                    <div
                        className="table-pagination-footer"
                        style={{
                            margin: 0,
                            padding: '16px 22px'
                        }}
                    >
                        <span>
                            {cuentasFiltradas.length === 1
                                ? '1 cuenta encontrada'
                                : `${cuentasFiltradas.length} cuentas encontradas`}
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                            Cuentas por pagar · ContaPyme
                        </span>
                    </div>
                )}
            </div>


            {mensajeExito && (
                <div
                    role="status"
                    style={{
                        padding: 12,
                        marginTop: 16,
                        borderRadius: 8,
                        background: '#ecfdf5',
                        color: '#047857'
                    }}
                >
                    {mensajeExito}
                </div>
            )}

            {modalActivo && cuentaSeleccionada && (
                <div
                    role="presentation"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={
                            modalActivo === 'pago'
                                ? 'Registrar pago'
                                : 'Historial de pagos'
                        }
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            padding: 24,
                            width: '100%',
                            maxWidth: 520,
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20
                        }}>
                            <h3 style={{ margin: 0 }}>
                                {modalActivo === 'pago'
                                    ? 'Registrar pago'
                                    : 'Historial de pagos'}
                            </h3>

                            <button
                                type="button"
                                onClick={cerrarModal}
                                disabled={guardandoPago}
                                aria-label="Cerrar"
                                style={{
                                    border: 0,
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{
                            padding: 16,
                            background: '#f8fafc',
                            borderRadius: 10,
                            marginBottom: 20
                        }}>
                            <strong>
                                {cuentaSeleccionada.proveedor}
                            </strong>

                            <p style={{ margin: '6px 0', color: '#64748b' }}>
                                Compra: {cuentaSeleccionada.codigo_compra}
                            </p>

                            <strong>
                                Saldo pendiente:{' '}
                                {formatoMoneda(cuentaSeleccionada.saldo_pendiente)}
                            </strong>
                        </div>

                        {errorModal && (
                            <div
                                role="alert"
                                style={{
                                    padding: 12,
                                    background: '#fff1f2',
                                    color: '#be123c',
                                    borderRadius: 8,
                                    marginBottom: 16
                                }}
                            >
                                {errorModal}
                            </div>
                        )}

                        {modalActivo === 'pago' && (
                            <form onSubmit={guardarPago}>
                                <div style={{ marginBottom: 16 }}>
                                    <label htmlFor="cxp-monto">
                                        Monto del pago
                                    </label>
                                    <input
                                        id="cxp-monto"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        max={cuentaSeleccionada.saldo_pendiente}
                                        className="form-input"
                                        value={montoPago}
                                        onInput={(e) =>
                                            setMontoPago(e.currentTarget.value)
                                        }
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label htmlFor="cxp-forma">
                                        Forma de pago
                                    </label>
                                    <select
                                        id="cxp-forma"
                                        className="form-input"
                                        value={formaPago}
                                        onChange={(e) =>
                                            setFormaPago(e.target.value)
                                        }
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="transfer">Transferencia</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label htmlFor="cxp-observaciones">
                                        Observaciones
                                    </label>
                                    <textarea
                                        id="cxp-observaciones"
                                        className="form-input"
                                        rows={3}
                                        value={observaciones}
                                        onChange={(e) =>
                                            setObservaciones(e.target.value)
                                        }
                                        placeholder="Observaciones opcionales..."
                                    />
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: 10
                                }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={cerrarModal}
                                        disabled={guardandoPago}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={guardandoPago}
                                    >
                                        {guardandoPago
                                            ? 'Registrando...'
                                            : 'Confirmar pago'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {modalActivo === 'historial' && (
                            <div>
                                {cargandoHistorial ? (
                                    <p>Cargando historial...</p>
                                ) : historialPagos.length === 0 && !errorModal ? (
                                    <p style={{ color: '#64748b' }}>
                                        Esta cuenta todavía no tiene pagos registrados.
                                    </p>
                                ) : (
                                    historialPagos.map((pago) => (
                                        <div
                                            key={pago.id_pago}
                                            style={{
                                                borderBottom: '1px solid #e2e8f0',
                                                padding: '12px 0'
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                gap: 12
                                            }}>
                                                <strong>
                                                    {formatoMoneda(pago.monto)}
                                                </strong>

                                                <span>
                                                    {formatoFecha(pago.fecha)}
                                                </span>
                                            </div>

                                            <div style={{
                                                color: '#64748b',
                                                fontSize: '0.85rem',
                                                marginTop: 6
                                            }}>
                                                Forma de pago: {pago.forma_pago}
                                            </div>

                                            <div style={{
                                                color: '#64748b',
                                                fontSize: '0.85rem'
                                            }}>
                                                Registrado por:{' '}
                                                {[
                                                    pago.nombre_usuario,
                                                    pago.apellidos_usuario
                                                ].filter(Boolean).join(' ') || '—'}
                                            </div>

                                            {pago.observaciones && (
                                                <p style={{ marginTop: 6 }}>
                                                    {pago.observaciones}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


import React from 'react';
import {
    Search,
    RotateCw,
    Wallet,
    FileText,
    Clock,
    AlertTriangle,
    CircleCheck,
    CircleDollarSign
} from 'lucide-react';
import { useCuentasPorPagar } from '../../hooks/useCuentasPorPagar';

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

    if (estado.includes('vencid')) return 'Vencida';
    if (estado.includes('pagad') || Number(cuenta.saldo_pendiente) <= 0) {
        return 'Pagada';
    }
    if (estado.includes('parcial')) return 'Parcial';

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
                                placeholder="Buscar proveedor o compra..."
                                value={filtros.busqueda || ''}
                                onChange={(e) =>
                                    actualizarFiltros({ busqueda: e.target.value })
                                }
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
                        <option value="Pendiente">Pendientes</option>
                        <option value="Parcial">Parciales</option>
                        <option value="Pagada">Pagadas</option>
                        <option value="Vencida">Vencidas</option>
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
                                </tr>
                            </thead>

                            <tbody>
                                {cuentas.map((cuenta) => {
                                    const estado = obtenerEstado(cuenta);

                                    return (
                                        <tr key={cuenta.id_cxp}>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>
                                                    {cuenta.nombre_empresa || 'Proveedor'}
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
                                                    {cuenta.codigo || '—'}
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
                                        </tr>
                                    );
                                })}

                                {cuentas.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
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
                                                {filtros.busqueda || filtros.estatus
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
                            {cuentas.length === 1
                                ? '1 cuenta registrada'
                                : `${cuentas.length} cuentas registradas`}
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                            Cuentas por pagar · ContaPyme
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

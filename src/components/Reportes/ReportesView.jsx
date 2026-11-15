import React from 'react';
import {
    FileBarChart,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    ShoppingBag,
    Wallet,
    CreditCard,
    Package,
    RotateCw,
    CalendarDays,
    AlertTriangle
} from 'lucide-react';

import { useReportes } from '../../hooks/useReportes';
import ReportesGraficas from './ReportesGraficas';
import ReportesTablas from './ReportesTablas';

const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(valor || 0));

const formatoNumero = (valor) =>
    new Intl.NumberFormat('es-MX').format(Number(valor || 0));

export default function ReportesView() {
    const {
        reportes,
        loading,
        error,
        filtros,
        actualizarFiltros,
        limpiarFiltros,
        recargar
    } = useReportes();

    const indicadores = reportes
        ? [
            {
                titulo: 'Ventas registradas',
                valor: formatoMoneda(reportes.ventas.monto_total),
                detalle: `${formatoNumero(reportes.ventas.total_ventas)} ventas`,
                icono: ShoppingCart,
                moneda: true
            },
            {
                titulo: 'Compras registradas',
                valor: formatoMoneda(reportes.compras.monto_total),
                detalle: `${formatoNumero(reportes.compras.total_compras)} compras`,
                icono: ShoppingBag,
                moneda: true
            },
            {
                titulo: 'Ingresos',
                valor: formatoMoneda(reportes.ingresos.monto_total),
                detalle: `${formatoNumero(reportes.ingresos.total_ingresos)} registros`,
                icono: TrendingUp,
                moneda: true
            },
            {
                titulo: 'Gastos',
                valor: formatoMoneda(reportes.gastos.monto_total),
                detalle: `${formatoNumero(reportes.gastos.total_gastos)} registros`,
                icono: TrendingDown,
                moneda: true
            },
            {
                titulo: 'Cuentas por cobrar',
                valor: formatoMoneda(
                    reportes.cuentas_por_cobrar.saldo_pendiente
                ),
                detalle: 'Saldo pendiente actual',
                icono: Wallet,
                moneda: true
            },
            {
                titulo: 'Cuentas por pagar',
                valor: formatoMoneda(
                    reportes.cuentas_por_pagar.saldo_pendiente
                ),
                detalle: 'Saldo pendiente actual',
                icono: CreditCard,
                moneda: true
            },
            {
                titulo: 'Valor del inventario',
                valor: formatoMoneda(reportes.inventario.valor_inventario),
                detalle: `${formatoNumero(
                    reportes.inventario.productos_stock_bajo
                )} productos con stock bajo`,
                icono: Package,
                moneda: true
            },
            {
                titulo: 'Balance de ingresos y gastos',
                valor: formatoMoneda(
                    reportes.indicadores.balance_ingresos_gastos
                ),
                detalle: 'Ingresos menos gastos registrados',
                icono: FileBarChart,
                moneda: true
            }
        ]
        : [];

    return (
        <div className="reportes">

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
                        Reportes
                    </h2>

                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Consulta los principales indicadores de tu negocio.
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

            {/* Filtros */}
            <div className="content-box">
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 18
                    }}
                >
                    <CalendarDays size={20} style={{ color: '#183b9c' }} />

                    <h3 style={{ fontSize: '1rem', margin: 0 }}>
                        Filtrar por periodo
                    </h3>
                </div>

                <div className="table-filter-bar">
                    <div style={{ flex: '1 1 200px' }}>
                        <label
                            htmlFor="reportes-fecha-inicio"
                            style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                marginBottom: 8
                            }}
                        >
                            Fecha de inicio
                        </label>

                        <input
                            id="reportes-fecha-inicio"
                            type="date"
                            className="form-input"
                            value={filtros.fecha_inicio}
                            max={filtros.fecha_fin || undefined}
                            onChange={(e) =>
                                actualizarFiltros({
                                    fecha_inicio: e.target.value
                                })
                            }
                        />
                    </div>

                    <div style={{ flex: '1 1 200px' }}>
                        <label
                            htmlFor="reportes-fecha-fin"
                            style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                marginBottom: 8
                            }}
                        >
                            Fecha final
                        </label>

                        <input
                            id="reportes-fecha-fin"
                            type="date"
                            className="form-input"
                            value={filtros.fecha_fin}
                            min={filtros.fecha_inicio || undefined}
                            onChange={(e) =>
                                actualizarFiltros({
                                    fecha_fin: e.target.value
                                })
                            }
                        />
                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={limpiarFiltros}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        Limpiar filtros
                    </button>
                </div>

                <p
                    style={{
                        color: '#64748b',
                        fontSize: '0.82rem',
                        margin: 0
                    }}
                >
                    Las fechas se aplican a ventas, compras, ingresos y gastos.
                    El inventario y los saldos pendientes muestran su estado actual.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-error" role="alert">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Carga */}
            {loading && (
                <div
                    className="content-box"
                    style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#64748b'
                    }}
                >
                    <RotateCw
                        size={28}
                        className="animate-spin"
                        style={{
                            color: '#183b9c',
                            marginBottom: 10
                        }}
                    />
                    <p>Cargando reportes...</p>
                </div>
            )}

            {/* Indicadores */}
            {!loading && !error && reportes && (
                <>
                    <div
                        style={{
                            marginBottom: 18
                        }}
                    >
                        <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>
                            Indicadores generales
                        </h3>

                        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            Resumen financiero y operativo de ContaPyme.
                        </p>
                    </div>

                    <div className="stat-card-grid">
                        {indicadores.map((item) => {
                            const Icono = item.icono;

                            return (
                                <div className="stat-card" key={item.titulo}>
                                    <div className="stat-icon-wrapper">
                                        <Icono size={22} />
                                    </div>

                                    <div style={{ minWidth: 0 }}>
                                        <div className="stat-label">
                                            {item.titulo}
                                        </div>

                                        <div
                                            className="stat-value"
                                            style={{
                                                fontSize: item.moneda
                                                    ? '1.25rem'
                                                    : '1.75rem',
                                                overflowWrap: 'anywhere'
                                            }}
                                        >
                                            {item.valor}
                                        </div>

                                        <div
                                            style={{
                                                color: '#94a3b8',
                                                fontSize: '0.78rem',
                                                marginTop: 7
                                            }}
                                        >
                                            {item.detalle}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Gráficas de reportes */}
                    <ReportesGraficas reportes={reportes} />
                    {/* Tablas detalladas de ventas y compras */}
                    <ReportesTablas filtros={filtros} />
                </>
            )}
        </div>
    );
}

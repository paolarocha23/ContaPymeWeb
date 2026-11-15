import React from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';

const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(valor || 0));

const formatoCompacto = (valor) =>
    new Intl.NumberFormat('es-MX', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(Number(valor || 0));

const colores = {
    ventas: '#183b9c',
    compras: '#64748b',
    ingresos: '#16a34a',
    gastos: '#dc2626',
    cobrar: '#2563eb',
    pagar: '#f59e0b'
};

function GraficaComparativa({ titulo, descripcion, datos }) {
    return (
        <div className="content-box" style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>
                {titulo}
            </h3>

            <p
                style={{
                    color: '#64748b',
                    fontSize: '0.85rem',
                    marginBottom: 20
                }}
            >
                {descripcion}
            </p>

            <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={datos}
                        margin={{
                            top: 10,
                            right: 12,
                            left: 0,
                            bottom: 5
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                        />

                        <XAxis
                            dataKey="nombre"
                            tick={{ fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <YAxis
                            tickFormatter={formatoCompacto}
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={55}
                        />

                        <Tooltip
                            formatter={(valor) => formatoMoneda(valor)}
                            contentStyle={{
                                borderRadius: 10,
                                border: '1px solid #e2e8f0'
                            }}
                        />

                        <Bar
                            dataKey="monto"
                            name="Monto (MXN)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={85}
                            isAnimationActive={false}
                        >
                            {datos.map((item) => (
                                <Cell
                                    key={item.nombre}
                                    fill={item.color}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginTop: 12
                }}
            >
                {datos.map((item) => (
                    <div key={item.nombre}>
                        <span
                            style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                borderRadius: 3,
                                backgroundColor: item.color,
                                marginRight: 6
                            }}
                        />

                        <span style={{ fontSize: '0.82rem' }}>
                            {item.nombre}: {formatoMoneda(item.monto)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ReportesGraficas({ reportes }) {
    if (!reportes) return null;

    const ventasCompras = [
        {
            nombre: 'Ventas',
            monto: Number(reportes.ventas.monto_total || 0),
            color: colores.ventas
        },
        {
            nombre: 'Compras',
            monto: Number(reportes.compras.monto_total || 0),
            color: colores.compras
        }
    ];

    const ingresosGastos = [
        {
            nombre: 'Ingresos',
            monto: Number(reportes.ingresos.monto_total || 0),
            color: colores.ingresos
        },
        {
            nombre: 'Gastos',
            monto: Number(reportes.gastos.monto_total || 0),
            color: colores.gastos
        }
    ];

    const cuentasPendientes = [
        {
            nombre: 'Por cobrar',
            monto: Number(
                reportes.cuentas_por_cobrar.saldo_pendiente || 0
            ),
            color: colores.cobrar
        },
        {
            nombre: 'Por pagar',
            monto: Number(
                reportes.cuentas_por_pagar.saldo_pendiente || 0
            ),
            color: colores.pagar
        }
    ];

    return (
        <div style={{ marginTop: 28 }}>
            <h3
                style={{
                    fontSize: '1.1rem',
                    marginBottom: 4
                }}
            >
                Gráficas de reportes
            </h3>

            <p
                style={{
                    color: '#64748b',
                    fontSize: '0.85rem',
                    marginBottom: 18
                }}
            >
                Comparación visual de los indicadores financieros.
            </p>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                    gap: 20
                }}
            >
                <GraficaComparativa
                    titulo="Ventas y compras"
                    descripcion="Importes registrados en el periodo seleccionado."
                    datos={ventasCompras}
                />

                <GraficaComparativa
                    titulo="Ingresos y gastos"
                    descripcion="Movimientos registrados en el periodo seleccionado."
                    datos={ingresosGastos}
                />

                <GraficaComparativa
                    titulo="Cuentas por cobrar y pagar"
                    descripcion="Saldos pendientes actuales, sin filtro de fechas."
                    datos={cuentasPendientes}
                />
            </div>
        </div>
    );
}

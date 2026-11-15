import React, { useEffect, useState } from 'react';
import {
    ShoppingCart,
    ShoppingBag,
    TrendingUp,
    TrendingDown,
    Package,
    AlertTriangle,
    Wallet
} from 'lucide-react';
import { api } from '../../services/api';

const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(valor || 0));

const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    const valor = String(fecha).slice(0, 10);
    const [anio, mes, dia] = valor.split('-');

    return anio && mes && dia
        ? `${dia}/${mes}/${anio}`
        : valor;
};

const formatoEstado = (estado) => {
    if (!estado) return 'Sin estado';

    const estados = {
        pendiente: 'Pendiente',
        pendiente_pago: 'Pendiente de pago',
        pagado: 'Pagado',
        pagada: 'Pagada',
        parcial: 'Parcial',
        completada: 'Completada',
        completado: 'Completado',
        cancelada: 'Cancelada',
        cancelado: 'Cancelado',
        activo: 'Activo',
        inactivo: 'Inactivo'
    };

    const clave = String(estado).toLowerCase();

    return estados[clave] ||
        clave
            .replace(/_/g, ' ')
            .replace(/^./, letra => letra.toUpperCase());
};

const tiposReporte = [
    {
        id: 'ventas',
        nombre: 'Ventas',
        icono: ShoppingCart,
        obtener: (filtros) => api.getReportesDetalleVentas(filtros)
    },
    {
        id: 'compras',
        nombre: 'Compras',
        icono: ShoppingBag,
        obtener: (filtros) => api.getReportesDetalleCompras(filtros)
    },
    {
        id: 'ingresos',
        nombre: 'Ingresos',
        icono: TrendingUp,
        obtener: (filtros) => api.getReportesDetalleIngresos(filtros)
    },
    {
        id: 'gastos',
        nombre: 'Gastos',
        icono: TrendingDown,
        obtener: (filtros) => api.getReportesDetalleGastos(filtros)
    },
    {
        id: 'inventario',
        nombre: 'Inventario',
        icono: Package,
        obtener: () => api.getReportesDetalleInventario()
    },
    {
        id: 'cuentas_por_cobrar',
        nombre: 'Cuentas por Cobrar',
        icono: Wallet,
        obtener: () => api.getReportesDetalleCuentasPorCobrar()
    },
    {
        id: 'cuentas_por_pagar',
        nombre: 'Cuentas por Pagar',
        icono: Wallet,
        obtener: () => api.getReportesDetalleCuentasPorPagar()
    }
];

export default function ReportesTablas({ filtros }) {
    const [tipo, setTipo] = useState('ventas');
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let activo = true;

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);
            setRegistros([]);

            try {
                const reporte = tiposReporte.find(
                    (item) => item.id === tipo
                );

                const respuesta = await reporte.obtener({
                    fecha_inicio: filtros.fecha_inicio,
                    fecha_fin: filtros.fecha_fin
                });

                if (!respuesta.success) {
                    throw new Error(
                        respuesta.message ||
                        'No se pudo cargar el reporte.'
                    );
                }

                const datos = tipo === 'inventario'
                    ? respuesta.data?.productos
                    : tipo === 'cuentas_por_cobrar'
                        ? respuesta.data?.cuentas_por_cobrar
                        : tipo === 'cuentas_por_pagar'
                            ? respuesta.data?.cuentas_por_pagar
                            : respuesta.data?.[tipo];

                if (activo) {
                    setRegistros(
                        Array.isArray(datos) ? datos : []
                    );
                }
            } catch (err) {
                if (activo) {
                    setError(
                        err.message ||
                        'Error al consultar los registros.'
                    );
                }
            } finally {
                if (activo) {
                    setLoading(false);
                }
            }
        };

        cargarDatos();

        return () => {
            activo = false;
        };
    }, [tipo, filtros.fecha_inicio, filtros.fecha_fin]);

    const esOperacion = tipo === 'ventas' || tipo === 'compras';
    const esMovimiento = tipo === 'ingresos' || tipo === 'gastos';
    const esInventario = tipo === 'inventario';
    const esCuentasPorCobrar = tipo === 'cuentas_por_cobrar';
    const esCuentasPorPagar = tipo === 'cuentas_por_pagar';
    const obtenerEstadoCompra = (item) => {
        if (item.id_cxp != null) {
            if (
                Number(item.saldo_pendiente) === 0 &&
                item.estado_cuenta_por_pagar === 'pagada'
            ) {
                return 'Pagada';
            }

            return formatoEstado(
                item.estado_cuenta_por_pagar || item.estatus
            );
        }

        return formatoEstado(item.estatus);
    };

    return (
        <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>
                Reportes detallados
            </h3>

            <p
                style={{
                    color: '#64748b',
                    fontSize: '0.85rem',
                    marginBottom: 18
                }}
            >
                {tipo === 'inventario'
                    ? 'Consulta las existencias actuales de los productos registrados.'
                    : 'Consulta las operaciones registradas en el periodo seleccionado.'}
            </p>

            <div className="content-box">
                <div
                    style={{
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 20
                    }}
                >
                    {tiposReporte.map((reporte) => {
                        const Icono = reporte.icono;

                        return (
                            <button
                                key={reporte.id}
                                type="button"
                                className={
                                    tipo === reporte.id
                                        ? 'btn btn-primary'
                                        : 'btn btn-secondary'
                                }
                                onClick={() => setTipo(reporte.id)}
                            >
                                <Icono size={17} />
                                {reporte.nombre}
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div className="alert alert-error" role="alert">
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {loading ? (
                    <p
                        style={{
                            textAlign: 'center',
                            padding: 28,
                            color: '#64748b'
                        }}
                    >
                        Cargando registros...
                    </p>
                ) : !error && registros.length === 0 ? (
                    <p
                        style={{
                            textAlign: 'center',
                            padding: 28,
                            color: '#64748b'
                        }}
                    >
                        {tipo === 'inventario'
                            ? 'No se encontraron productos activos en el inventario.'
                            : 'No se encontraron registros para el periodo seleccionado.'}
                    </p>
                ) : !error && (
                    <>
                        <p
                            style={{
                                fontSize: '0.85rem',
                                color: '#64748b',
                                marginBottom: 14
                            }}
                        >
                            Total de registros: {registros.length}
                        </p>

                        {esInventario ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        textAlign: 'left',
                                        fontSize: '0.88rem'
                                    }}
                                >
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: 12 }}>Producto</th>
                                            <th style={{ padding: 12 }}>Stock actual</th>
                                            <th style={{ padding: 12 }}>Stock mínimo</th>
                                            <th style={{ padding: 12 }}>Precio de compra</th>
                                            <th style={{ padding: 12 }}>Valor inventario</th>
                                            <th style={{ padding: 12 }}>Estado</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {registros.map((item) => (
                                            <tr
                                                key={item.id_producto}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9'
                                                }}
                                            >
                                                <td style={{ padding: 12 }}>
                                                    {item.nombre || 'Sin nombre'}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {item.stock}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {item.stock_minimo}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {formatoMoneda(item.precio_compra)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {formatoMoneda(item.valor_inventario)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    <span
                                                        style={{
                                                            color:
                                                                item.estado_stock === 'Stock bajo'
                                                                    ? '#dc2626'
                                                                    : '#16a34a',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {item.estado_stock}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        ) : esCuentasPorCobrar ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        textAlign: 'left',
                                        fontSize: '0.88rem'
                                    }}
                                >
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: 12 }}>Cliente</th>
                                            <th style={{ padding: 12 }}>Venta</th>
                                            <th style={{ padding: 12 }}>Fecha de emisión</th>
                                            <th style={{ padding: 12 }}>Fecha de vencimiento</th>
                                            <th style={{ padding: 12 }}>Monto original</th>
                                            <th style={{ padding: 12 }}>Saldo pendiente</th>
                                            <th style={{ padding: 12 }}>Estado</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {registros.map((cuenta) => (
                                            <tr
                                                key={cuenta.id_cxc}
                                                style={{ borderBottom: '1px solid #f1f5f9' }}
                                            >
                                                <td style={{ padding: 12 }}>
                                                    {cuenta.nombre_cliente || 'Sin cliente'}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {cuenta.codigo_venta || 'Sin venta'}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {formatoFecha(cuenta.fecha_emision)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {formatoFecha(cuenta.fecha_vencimiento)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {formatoMoneda(cuenta.monto_original)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    {formatoMoneda(cuenta.saldo_pendiente)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    <span
                                                        style={{
                                                            color:
                                                                cuenta.estado_cobro === 'Vencida'
                                                                    ? '#dc2626'
                                                                    : cuenta.estado_cobro === 'Pendiente'
                                                                        ? '#ca8a04'
                                                                        : '#16a34a',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {cuenta.estado_cobro}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : esCuentasPorPagar ? (
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        minWidth: 1100,
                                        borderCollapse: 'collapse',
                                        textAlign: 'left',
                                        fontSize: '0.88rem'
                                    }}
                                >
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            {[
                                                'Proveedor',
                                                'Compra',
                                                'Emisión',
                                                'Vencimiento',
                                                'Monto original',
                                                'Saldo pendiente',
                                                'Estado'
                                            ].map((columna) => (
                                                <th
                                                    key={columna}
                                                    style={{
                                                        padding: 12,
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {columna}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {registros.map((cuenta) => (
                                            <tr
                                                key={cuenta.id_cxp}
                                                style={{
                                                    borderBottom: '1px solid #f1f5f9'
                                                }}
                                            >
                                                <td style={{ padding: 12, minWidth: 200 }}>
                                                    {cuenta.nombre_proveedor || 'Sin proveedor'}
                                                </td>

                                                <td style={{
                                                    padding: 12,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {cuenta.codigo_compra || 'Sin código'}
                                                </td>

                                                <td style={{
                                                    padding: 12,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatoFecha(cuenta.fecha_emision)}
                                                </td>

                                                <td style={{
                                                    padding: 12,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatoFecha(cuenta.fecha_vencimiento)}
                                                </td>

                                                <td style={{
                                                    padding: 12,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatoMoneda(cuenta.monto_original)}
                                                </td>

                                                <td style={{
                                                    padding: 12,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {formatoMoneda(cuenta.saldo_pendiente)}
                                                </td>

                                                <td style={{ padding: 12 }}>
                                                    <span
                                                        style={{
                                                            color:
                                                                cuenta.estado_pago === 'Pagada'
                                                                    ? '#16a34a'
                                                                    : cuenta.estado_pago === 'Vencida'
                                                                        ? '#dc2626'
                                                                        : '#ca8a04',
                                                            fontWeight: 600,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {cuenta.estado_pago}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (

                            <div style={{ overflowX: 'auto' }}>
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        textAlign: 'left',
                                        fontSize: '0.88rem'
                                    }}
                                >
                                    <thead>
                                        <tr
                                            style={{
                                                borderBottom:
                                                    '1px solid #e2e8f0'
                                            }}
                                        >
                                            {esOperacion && (
                                                <th style={{ padding: 12 }}>
                                                    Código
                                                </th>
                                            )}

                                            {esMovimiento && (
                                                <th style={{ padding: 12 }}>
                                                    ID
                                                </th>
                                            )}

                                            <th style={{ padding: 12 }}>
                                                Fecha
                                            </th>

                                            {esOperacion && (
                                                <th style={{ padding: 12 }}>
                                                    {tipo === 'ventas'
                                                        ? 'Cliente'
                                                        : 'Proveedor'}
                                                </th>
                                            )}

                                            {esMovimiento && (
                                                <>
                                                    <th style={{ padding: 12 }}>
                                                        Concepto
                                                    </th>
                                                    <th style={{ padding: 12 }}>
                                                        Categoría
                                                    </th>
                                                </>
                                            )}

                                            <th style={{ padding: 12 }}>
                                                {esOperacion
                                                    ? 'Total'
                                                    : 'Monto'}
                                            </th>

                                            {tipo === 'ventas' && (
                                                <th style={{ padding: 12 }}>
                                                    Monto pagado
                                                </th>
                                            )}

                                            {esMovimiento && (
                                                <th style={{ padding: 12 }}>
                                                    Forma de pago
                                                </th>
                                            )}

                                            {tipo === 'ingresos' && (
                                                <th style={{ padding: 12 }}>
                                                    Origen
                                                </th>
                                            )}

                                            <th style={{ padding: 12 }}>
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {registros.map((item) => (
                                            <tr
                                                key={
                                                    tipo === 'ventas'
                                                        ? item.id_venta
                                                        : tipo === 'compras'
                                                            ? item.id_compra
                                                            : tipo === 'ingresos'
                                                                ? item.id_ingreso
                                                                : item.id_gasto
                                                }
                                                style={{
                                                    borderBottom:
                                                        '1px solid #f1f5f9'
                                                }}
                                            >
                                                {esOperacion && (
                                                    <td style={{ padding: 12 }}>
                                                        {item.codigo || '—'}
                                                    </td>
                                                )}

                                                {esMovimiento && (
                                                    <td style={{ padding: 12 }}>
                                                        {tipo === 'ingresos'
                                                            ? item.id_ingreso
                                                            : item.id_gasto}
                                                    </td>
                                                )}

                                                <td style={{ padding: 12 }}>
                                                    {formatoFecha(item.fecha)}
                                                </td>

                                                {esOperacion && (
                                                    <td style={{ padding: 12 }}>
                                                        {tipo === 'ventas'
                                                            ? item.nombre_cliente ||
                                                            'Sin nombre'
                                                            : item.nombre_proveedor ||
                                                            'Sin nombre'}
                                                    </td>
                                                )}

                                                {esMovimiento && (
                                                    <>
                                                        <td style={{ padding: 12 }}>
                                                            {item.concepto || '—'}
                                                        </td>
                                                        <td style={{ padding: 12 }}>
                                                            {item.nombre_categoria ||
                                                                'Sin categoría'}
                                                        </td>
                                                    </>
                                                )}

                                                <td style={{ padding: 12 }}>
                                                    {formatoMoneda(
                                                        esOperacion
                                                            ? item.total
                                                            : item.monto
                                                    )}
                                                </td>

                                                {tipo === 'ventas' && (
                                                    <td style={{ padding: 12 }}>
                                                        {formatoMoneda(
                                                            item.monto_pagado
                                                        )}
                                                    </td>
                                                )}

                                                {esMovimiento && (
                                                    <td style={{ padding: 12 }}>
                                                        {formatoEstado(
                                                            item.forma_pago
                                                        )}
                                                    </td>
                                                )}

                                                {tipo === 'ingresos' && (
                                                    <td style={{ padding: 12 }}>
                                                        {formatoEstado(
                                                            item.origen
                                                        )}
                                                    </td>
                                                )}

                                                <td style={{ padding: 12 }}>
                                                    {tipo === 'compras'
                                                        ? obtenerEstadoCompra(item)
                                                        : formatoEstado(
                                                            item.estatus
                                                        )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}

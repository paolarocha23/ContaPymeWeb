import React, { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, FileSpreadsheet, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { exportarTablaAExcel } from '../../utils/exportExcel';
import {
    formatoMoneda,
    formatoFecha,
    formatoFechaHora,
    formatoEstado
} from './reportesAnalisis';

const POR_PAGINA = 10;

const OBTENER = {
    ventas: (f) => api.getReportesDetalleVentas(f),
    compras: (f) => api.getReportesDetalleCompras(f),
    ingresos: (f) => api.getReportesDetalleIngresos(f),
    gastos: (f) => api.getReportesDetalleGastos(f),
    inventario: () => api.getReportesDetalleInventario(),
    movimientos_inventario: (f) => api.getReportesDetalleMovimientosInventario(f),
    cuentas_por_cobrar: () => api.getReportesDetalleCuentasPorCobrar(),
    cuentas_por_pagar: () => api.getReportesDetalleCuentasPorPagar()
};

const extraerDatos = (tipo, data) =>
    tipo === 'inventario'
        ? data?.productos
        : tipo === 'cuentas_por_cobrar'
        ? data?.cuentas_por_cobrar
        : tipo === 'cuentas_por_pagar'
        ? data?.cuentas_por_pagar
        : tipo === 'movimientos_inventario'
        ? data?.movimientos
        : data?.[tipo];

const CLAVES = {
    ventas: 'id_venta',
    compras: 'id_compra',
    ingresos: 'id_ingreso',
    gastos: 'id_gasto',
    inventario: 'id_producto',
    movimientos_inventario: 'id_movimiento',
    cuentas_por_cobrar: 'id_cxc',
    cuentas_por_pagar: 'id_cxp'
};

const TITULOS = {
    ventas: 'Detalle de ventas',
    compras: 'Detalle de compras',
    ingresos: 'Detalle de ingresos',
    gastos: 'Detalle de gastos',
    inventario: 'Existencias de inventario',
    movimientos_inventario: 'Movimientos de inventario',
    cuentas_por_cobrar: 'Cuentas por cobrar',
    cuentas_por_pagar: 'Cuentas por pagar'
};

const claseEstado = (texto) => {
    const t = String(texto || '').toLowerCase();
    if (/cancel|vencid|agotad|inactiv/.test(t)) return 'red';
    if (/pend|parcial|bajo/.test(t)) return 'amber';
    if (/pagad|complet|activ|disponible|normal/.test(t)) return 'green';
    return 'gray';
};

const Pill = ({ texto, clase }) => (
    <span className={`rep-pill ${clase || claseEstado(texto)}`}>
        <i className="rep-dot" />
        {texto}
    </span>
);

const txt = (v) => (v ? formatoEstado(v) : '—');

const estadoCompra = (item) => {
    if (item.id_cxp != null) {
        if (Number(item.saldo_pendiente) === 0 && item.estado_cuenta_por_pagar === 'pagada') {
            return 'Pagada';
        }
        return formatoEstado(item.estado_cuenta_por_pagar || item.estatus);
    }
    return formatoEstado(item.estatus);
};

const COLUMNAS = {
    ventas: [
        { h: 'Fecha', r: (i) => formatoFecha(i.fecha) },
        { h: 'Folio', r: (i) => <span className="rep-folio">{i.codigo || '—'}</span> },
        { h: 'Cliente', r: (i) => <b>{i.nombre_cliente || 'Sin nombre'}</b> },
        { h: 'Método', r: (i) => txt(i.forma_pago) },
        { h: 'Estado', r: (i) => <Pill texto={formatoEstado(i.estatus)} /> },
        { h: 'Pagado', a: 'right', r: (i) => formatoMoneda(i.monto_pagado) },
        { h: 'Total', a: 'right', r: (i) => <b>{formatoMoneda(i.total)}</b> }
    ],
    compras: [
        { h: 'Fecha', r: (i) => formatoFecha(i.fecha) },
        { h: 'Folio', r: (i) => <span className="rep-folio">{i.codigo || '—'}</span> },
        { h: 'Proveedor', r: (i) => <b>{i.nombre_proveedor || 'Sin nombre'}</b> },
        { h: 'Condiciones', r: (i) => txt(i.condiciones_pago) },
        { h: 'Estado', r: (i) => <Pill texto={estadoCompra(i)} /> },
        {
            h: 'Saldo pendiente',
            a: 'right',
            r: (i) => (
                <span style={{ color: Number(i.saldo_pendiente || 0) > 0 ? '#C2362F' : '#12805C', fontWeight: 600 }}>
                    {formatoMoneda(i.saldo_pendiente || 0)}
                </span>
            )
        },
        { h: 'Total', a: 'right', r: (i) => <b>{formatoMoneda(i.total)}</b> }
    ],
    ingresos: [
        { h: 'Fecha', r: (i) => formatoFecha(i.fecha) },
        { h: 'ID', r: (i) => <span className="rep-folio">{i.id_ingreso}</span> },
        { h: 'Concepto', r: (i) => <b>{i.concepto || '—'}</b> },
        { h: 'Categoría', r: (i) => i.nombre_categoria || 'Sin categoría' },
        { h: 'Forma de pago', r: (i) => txt(i.forma_pago) },
        { h: 'Origen', r: (i) => txt(i.origen) },
        { h: 'Estado', r: (i) => <Pill texto={formatoEstado(i.estatus)} /> },
        { h: 'Monto', a: 'right', r: (i) => <b>{formatoMoneda(i.monto)}</b> }
    ],
    gastos: [
        { h: 'Fecha', r: (i) => formatoFecha(i.fecha) },
        { h: 'ID', r: (i) => <span className="rep-folio">{i.id_gasto}</span> },
        { h: 'Concepto', r: (i) => <b>{i.concepto || '—'}</b> },
        { h: 'Categoría', r: (i) => i.nombre_categoria || 'Sin categoría' },
        { h: 'Forma de pago', r: (i) => txt(i.forma_pago) },
        { h: 'Estado', r: (i) => <Pill texto={formatoEstado(i.estatus)} /> },
        { h: 'Monto', a: 'right', r: (i) => <b>{formatoMoneda(i.monto)}</b> }
    ],
    inventario: [
        { h: 'Producto', r: (i) => <b>{i.nombre || 'Sin nombre'}</b> },
        { h: 'Stock actual', r: (i) => i.stock },
        { h: 'Stock mínimo', r: (i) => i.stock_minimo },
        { h: 'Precio de compra', a: 'right', r: (i) => formatoMoneda(i.precio_compra) },
        { h: 'Valor inventario', a: 'right', r: (i) => <b>{formatoMoneda(i.valor_inventario)}</b> },
        {
            h: 'Estado',
            r: (i) => <Pill texto={Number(i.stock) <= 0 ? 'Agotado' : i.estado_stock || 'Sin estado'} />
        }
    ],
    movimientos_inventario: [
        { h: 'Fecha y hora', r: (i) => formatoFechaHora(i.fecha) },
        { h: 'Código', r: (i) => <span className="rep-folio">{i.codigo || '—'}</span> },
        { h: 'Producto', r: (i) => <b>{i.nombre_producto || '—'}</b> },
        {
            h: 'Tipo',
            r: (i) => (
                <Pill
                    texto={txt(i.tipo_movimiento)}
                    clase={i.tipo_movimiento === 'entrada' ? 'green' : i.tipo_movimiento === 'salida' ? 'red' : 'gray'}
                />
            )
        },
        { h: 'Cantidad', r: (i) => <b>{i.cantidad}</b> },
        { h: 'Antes', r: (i) => i.existencia_antes },
        { h: 'Después', r: (i) => <b>{i.existencia_despues}</b> },
        {
            h: 'Motivo / Referencia',
            r: (i) => (
                <>
                    {i.motivo || '—'}
                    {i.origen && <small className="rep-small">Origen: {i.origen}</small>}
                </>
            )
        },
        { h: 'Usuario', r: (i) => i.nombre_usuario || '—' }
    ],
    cuentas_por_cobrar: [
        { h: 'Cliente', r: (i) => <b>{i.nombre_cliente || 'Sin cliente'}</b> },
        { h: 'Venta', r: (i) => <span className="rep-folio">{i.codigo_venta || 'Sin venta'}</span> },
        { h: 'Emisión', r: (i) => formatoFecha(i.fecha_emision) },
        { h: 'Vencimiento', r: (i) => formatoFecha(i.fecha_vencimiento) },
        { h: 'Monto original', a: 'right', r: (i) => formatoMoneda(i.monto_original) },
        { h: 'Saldo pendiente', a: 'right', r: (i) => <b>{formatoMoneda(i.saldo_pendiente)}</b> },
        { h: 'Estado', r: (i) => <Pill texto={i.estado_cobro || 'Sin estado'} /> }
    ],
    cuentas_por_pagar: [
        { h: 'Proveedor', r: (i) => <b>{i.nombre_proveedor || 'Sin proveedor'}</b> },
        { h: 'Compra', r: (i) => <span className="rep-folio">{i.codigo_compra || 'Sin código'}</span> },
        { h: 'Emisión', r: (i) => formatoFecha(i.fecha_emision) },
        { h: 'Vencimiento', r: (i) => formatoFecha(i.fecha_vencimiento) },
        { h: 'Monto original', a: 'right', r: (i) => formatoMoneda(i.monto_original) },
        { h: 'Saldo pendiente', a: 'right', r: (i) => <b>{formatoMoneda(i.saldo_pendiente)}</b> },
        { h: 'Estado', r: (i) => <Pill texto={i.estado_pago || 'Sin estado'} /> }
    ]
};

export default function ReportesTablas({ tipo, filtros, onDatos }) {
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagina, setPagina] = useState(1);

    // Sub-filtros
    const [filtroStock, setFiltroStock] = useState('todos'); // 'todos' | 'bajo' | 'agotado'
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

    useEffect(() => {
        let activo = true;

        const cargarDatos = async () => {
            setLoading(true);
            setError(null);
            setRegistros([]);
            setCategoriaSeleccionada('');
            setFiltroStock('todos');
            setPagina(1);

            try {
                const respuesta = await OBTENER[tipo]({
                    fecha_inicio: filtros.fecha_inicio,
                    fecha_fin: filtros.fecha_fin
                });

                if (!respuesta.success) {
                    throw new Error(respuesta.message || 'No se pudo cargar el reporte.');
                }

                const datos = extraerDatos(tipo, respuesta.data);

                if (activo) {
                    setRegistros(Array.isArray(datos) ? datos : []);
                }
            } catch (err) {
                if (activo) {
                    setError(err.message || 'Error al consultar los registros.');
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

    // Avisa a la vista los registros cargados (para KPIs y gráficas)
    useEffect(() => {
        if (onDatos) onDatos({ tipo, registros, loading });
    }, [tipo, registros, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setPagina(1);
    }, [filtroStock, categoriaSeleccionada]);

    const esInventario = tipo === 'inventario';
    const esMovimiento = tipo === 'ingresos' || tipo === 'gastos';

    const categoriasDisponibles = useMemo(() => {
        if (!esMovimiento) return [];
        const cats = new Set();
        registros.forEach((r) => {
            if (r.nombre_categoria) cats.add(r.nombre_categoria);
        });
        return Array.from(cats).sort();
    }, [esMovimiento, registros]);

    const registrosFiltrados = useMemo(() => {
        if (tipo === 'inventario') {
            if (filtroStock === 'bajo') {
                return registros.filter((item) => item.estado_stock === 'Stock bajo' || item.stock <= item.stock_minimo);
            }
            if (filtroStock === 'agotado') {
                return registros.filter((item) => Number(item.stock) <= 0);
            }
            return registros;
        }

        if ((tipo === 'ingresos' || tipo === 'gastos') && categoriaSeleccionada) {
            return registros.filter((item) => item.nombre_categoria === categoriaSeleccionada);
        }

        return registros;
    }, [tipo, registros, filtroStock, categoriaSeleccionada]);

    const totales = useMemo(() => {
        if (tipo === 'ventas') {
            const total = registrosFiltrados.reduce((acc, r) => acc + Number(r.total || 0), 0);
            const pagado = registrosFiltrados.reduce((acc, r) => acc + Number(r.monto_pagado || 0), 0);
            return { total, pagado, saldo: total - pagado };
        }
        if (tipo === 'compras') {
            const total = registrosFiltrados.reduce((acc, r) => acc + Number(r.total || 0), 0);
            const saldo = registrosFiltrados.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0);
            return { total, saldo };
        }
        if (tipo === 'ingresos' || tipo === 'gastos') {
            const total = registrosFiltrados.reduce((acc, r) => acc + Number(r.monto || 0), 0);
            return { total };
        }
        if (tipo === 'cuentas_por_cobrar' || tipo === 'cuentas_por_pagar') {
            const original = registrosFiltrados.reduce((acc, r) => acc + Number(r.monto_original || 0), 0);
            const pendiente = registrosFiltrados.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0);
            return { original, pendiente };
        }
        if (tipo === 'inventario') {
            const valor = registrosFiltrados.reduce((acc, r) => acc + Number(r.valor_inventario || 0), 0);
            return { valor };
        }
        return {};
    }, [tipo, registrosFiltrados]);

    // Exportación a Excel (RDF1606) — misma lógica de siempre
    const handleExportarExcel = () => {
        if (registrosFiltrados.length === 0) return;

        let columnas = [];
        let resumen = null;
        const nombreArchivo = `Reporte_${tipo}_ContaPyme`;

        if (tipo === 'ventas') {
            columnas = [
                { header: 'Código', key: 'codigo', width: 14 },
                { header: 'Fecha', key: 'fecha', formato: 'fecha', width: 14 },
                { header: 'Cliente', key: 'nombre_cliente', width: 26 },
                { header: 'Condiciones', key: 'condiciones_pago', width: 16 },
                { header: 'Forma de Pago', key: 'forma_pago', width: 16 },
                { header: 'Total Vendido', key: 'total', formato: 'moneda', width: 16 },
                { header: 'Monto Pagado', key: 'monto_pagado', formato: 'moneda', width: 16 },
                { header: 'Estatus', key: 'estatus', width: 14 }
            ];
            resumen = { total: totales.total, monto_pagado: totales.pagado };
        } else if (tipo === 'compras') {
            columnas = [
                { header: 'Código', key: 'codigo', width: 14 },
                { header: 'Fecha', key: 'fecha', formato: 'fecha', width: 14 },
                { header: 'Proveedor', key: 'nombre_proveedor', width: 28 },
                { header: 'Condiciones', key: 'condiciones_pago', width: 16 },
                { header: 'Total Compra', key: 'total', formato: 'moneda', width: 16 },
                { header: 'Saldo Pendiente', key: 'saldo_pendiente', formato: 'moneda', width: 16 },
                { header: 'Estatus', key: 'estatus', width: 16 }
            ];
            resumen = { total: totales.total, saldo_pendiente: totales.saldo };
        } else if (tipo === 'ingresos') {
            columnas = [
                { header: 'ID', key: 'id_ingreso', width: 10 },
                { header: 'Fecha', key: 'fecha', formato: 'fecha', width: 14 },
                { header: 'Concepto', key: 'concepto', width: 30 },
                { header: 'Categoría', key: 'nombre_categoria', width: 20 },
                { header: 'Monto', key: 'monto', formato: 'moneda', width: 16 },
                { header: 'Forma de Pago', key: 'forma_pago', width: 16 },
                { header: 'Origen', key: 'origen', width: 14 },
                { header: 'Estatus', key: 'estatus', width: 12 }
            ];
            resumen = { monto: totales.total };
        } else if (tipo === 'gastos') {
            columnas = [
                { header: 'ID', key: 'id_gasto', width: 10 },
                { header: 'Fecha', key: 'fecha', formato: 'fecha', width: 14 },
                { header: 'Concepto', key: 'concepto', width: 30 },
                { header: 'Categoría', key: 'nombre_categoria', width: 20 },
                { header: 'Monto', key: 'monto', formato: 'moneda', width: 16 },
                { header: 'Forma de Pago', key: 'forma_pago', width: 16 },
                { header: 'Observaciones', key: 'observaciones', width: 26 },
                { header: 'Estatus', key: 'estatus', width: 12 }
            ];
            resumen = { monto: totales.total };
        } else if (tipo === 'inventario') {
            columnas = [
                { header: 'ID', key: 'id_producto', width: 10 },
                { header: 'Producto', key: 'nombre', width: 30 },
                { header: 'Stock Actual', key: 'stock', formato: 'numero', width: 14 },
                { header: 'Stock Mínimo', key: 'stock_minimo', formato: 'numero', width: 14 },
                { header: 'Precio Compra', key: 'precio_compra', formato: 'moneda', width: 16 },
                { header: 'Valor Inventario', key: 'valor_inventario', formato: 'moneda', width: 18 },
                { header: 'Estado', key: 'estado_stock', width: 14 }
            ];
            resumen = { valor_inventario: totales.valor };
        } else if (tipo === 'movimientos_inventario') {
            columnas = [
                { header: 'ID', key: 'id_movimiento', width: 10 },
                { header: 'Fecha', key: 'fecha', formato: 'fecha', width: 14 },
                { header: 'Código', key: 'codigo', width: 14 },
                { header: 'Producto', key: 'nombre_producto', width: 28 },
                { header: 'Tipo Movimiento', key: 'tipo_movimiento', width: 16 },
                { header: 'Cantidad', key: 'cantidad', formato: 'numero', width: 12 },
                { header: 'Antes', key: 'existencia_antes', formato: 'numero', width: 12 },
                { header: 'Después', key: 'existencia_despues', formato: 'numero', width: 12 },
                { header: 'Motivo', key: 'motivo', width: 24 },
                { header: 'Origen', key: 'origen', width: 16 },
                { header: 'Usuario', key: 'nombre_usuario', width: 16 }
            ];
        } else if (tipo === 'cuentas_por_cobrar') {
            columnas = [
                { header: 'ID', key: 'id_cxc', width: 10 },
                { header: 'Cliente', key: 'nombre_cliente', width: 26 },
                { header: 'Folio Venta', key: 'codigo_venta', width: 14 },
                { header: 'Emisión', key: 'fecha_emision', formato: 'fecha', width: 14 },
                { header: 'Vencimiento', key: 'fecha_vencimiento', formato: 'fecha', width: 14 },
                { header: 'Monto Original', key: 'monto_original', formato: 'moneda', width: 16 },
                { header: 'Saldo Pendiente', key: 'saldo_pendiente', formato: 'moneda', width: 16 },
                { header: 'Estado', key: 'estado_cobro', width: 14 }
            ];
            resumen = { monto_original: totales.original, saldo_pendiente: totales.pendiente };
        } else if (tipo === 'cuentas_por_pagar') {
            columnas = [
                { header: 'ID', key: 'id_cxp', width: 10 },
                { header: 'Proveedor', key: 'nombre_proveedor', width: 28 },
                { header: 'Folio Compra', key: 'codigo_compra', width: 14 },
                { header: 'Emisión', key: 'fecha_emision', formato: 'fecha', width: 14 },
                { header: 'Vencimiento', key: 'fecha_vencimiento', formato: 'fecha', width: 14 },
                { header: 'Monto Original', key: 'monto_original', formato: 'moneda', width: 16 },
                { header: 'Saldo Pendiente', key: 'saldo_pendiente', formato: 'moneda', width: 16 },
                { header: 'Estado', key: 'estado_pago', width: 14 }
            ];
            resumen = { monto_original: totales.original, saldo_pendiente: totales.pendiente };
        }

        exportarTablaAExcel({
            nombreArchivo,
            nombreHoja: TITULOS[tipo] || 'Reporte',
            columnas,
            datos: registrosFiltrados,
            resumen
        });
    };

    const columnas = COLUMNAS[tipo] || [];
    const total = registrosFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const paginaActual = Math.min(pagina, totalPaginas);
    const desde = total === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
    const hasta = Math.min(paginaActual * POR_PAGINA, total);
    const visibles = registrosFiltrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

    const mensajeVacio =
        tipo === 'inventario'
            ? 'No se encontraron productos con el filtro seleccionado.'
            : tipo === 'movimientos_inventario'
            ? 'No hay movimientos de inventario registrados en el periodo seleccionado.'
            : 'No se encontraron registros para el periodo seleccionado.';

    return (
        <div className="rep-card rep-table-card">
            <div className="rep-table-head">
                <h3>{TITULOS[tipo]}</h3>

                <div className="rep-table-tools">
                    {esInventario && (
                        <div className="rep-chips">
                            <Filter size={15} />
                            {[
                                ['todos', 'Todos'],
                                ['bajo', 'Stock bajo'],
                                ['agotado', 'Agotados']
                            ].map(([valor, etiqueta]) => (
                                <button
                                    key={valor}
                                    type="button"
                                    className={`rep-chip ${filtroStock === valor ? 'on' : ''}`}
                                    onClick={() => setFiltroStock(valor)}
                                >
                                    {etiqueta}
                                </button>
                            ))}
                        </div>
                    )}

                    {esMovimiento && categoriasDisponibles.length > 0 && (
                        <div className="rep-chips">
                            <Filter size={15} />
                            <select
                                id="filtro-cat"
                                className="rep-select"
                                value={categoriaSeleccionada}
                                onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                                aria-label="Filtrar por categoría"
                            >
                                <option value="">Todas las categorías</option>
                                {categoriasDisponibles.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="button"
                        className="rep-btn-ghost"
                        onClick={handleExportarExcel}
                        disabled={loading || registrosFiltrados.length === 0}
                        title="Exportar esta tabla a archivo Excel .xlsx"
                    >
                        <FileSpreadsheet size={16} style={{ color: '#12805C' }} />
                        Exportar tabla
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" role="alert">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <p className="rep-empty">Cargando registros...</p>
            ) : !error && total === 0 ? (
                <p className="rep-empty">{mensajeVacio}</p>
            ) : (
                !error && (
                    <>
                        <div className="rep-table-wrap">
                            <table className="rep-table">
                                <thead>
                                    <tr>
                                        {columnas.map((c) => (
                                            <th key={c.h} className={c.a === 'right' ? 'r' : ''}>
                                                {c.h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibles.map((item, idx) => (
                                        <tr key={item[CLAVES[tipo]] ?? idx}>
                                            {columnas.map((c) => (
                                                <td key={c.h} className={c.a === 'right' ? 'r' : ''}>
                                                    {c.r(item)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="rep-pager">
                            <span>
                                Mostrando {desde}-{hasta} de {total} registros
                            </span>

                            <div className="rep-pager-btns">
                                <button
                                    type="button"
                                    onClick={() => setPagina(paginaActual - 1)}
                                    disabled={paginaActual <= 1}
                                    aria-label="Página anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <b>
                                    {paginaActual} / {totalPaginas}
                                </b>
                                <button
                                    type="button"
                                    onClick={() => setPagina(paginaActual + 1)}
                                    disabled={paginaActual >= totalPaginas}
                                    aria-label="Página siguiente"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )
            )}
        </div>
    );
}
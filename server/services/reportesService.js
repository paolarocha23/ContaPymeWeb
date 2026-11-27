import {
    obtenerReporteVentas,
    obtenerReporteCompras,
    obtenerReporteIngresos,
    obtenerReporteGastos,
    obtenerReporteCuentasPorCobrar,
    obtenerReporteCuentasPorPagar,
    obtenerReporteInventario,
    obtenerDetalleVentas,
    obtenerDetalleCompras,
    obtenerDetalleIngresos,
    obtenerDetalleGastos,
    obtenerDetalleInventario,
    obtenerDetalleCuentasPorCobrar,
    obtenerDetalleCuentasPorPagar,
    obtenerDetalleMovimientosInventario,
    obtenerTopVendedorSemana
} from '../repositories/reportesRepository.js';

// Convertir valores numéricos de PostgreSQL a números JavaScript.
const convertirNumeros = (datos) => {
    return Object.fromEntries(
        Object.entries(datos).map(([clave, valor]) => [
            clave,
            typeof valor === 'string' && valor.trim() !== '' &&
                !Number.isNaN(Number(valor))
                ? Number(valor)
                : valor
        ])
    );
};

// Validar fechas en formato YYYY-MM-DD.
const validarFecha = (fecha) => {
    if (!fecha) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));

    return fechaUTC.getUTCFullYear() === anio &&
        fechaUTC.getUTCMonth() === mes - 1 &&
        fechaUTC.getUTCDate() === dia;
};

// Consultar y organizar todos los indicadores del módulo.
export const obtenerResumenGeneralReportes = async (filtros = {}, empresaId = null) => {
    const fecha_inicio = filtros.fecha_inicio || null;
    const fecha_fin = filtros.fecha_fin || null;

    if (!validarFecha(fecha_inicio) || !validarFecha(fecha_fin)) {
        const error = new Error(
            'Las fechas deben tener el formato YYYY-MM-DD y ser válidas.'
        );
        error.status = 400;
        throw error;
    }

    if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
        const error = new Error(
            'La fecha de inicio no puede ser posterior a la fecha final.'
        );
        error.status = 400;
        throw error;
    }

    const filtrosValidados = { fecha_inicio, fecha_fin };

    const [
        ventas,
        compras,
        ingresos,
        gastos,
        cuentasPorCobrar,
        cuentasPorPagar,
        inventario,
        topVendedorSemana
    ] = await Promise.all([
        obtenerReporteVentas(filtrosValidados, empresaId),
        obtenerReporteCompras(filtrosValidados, empresaId),
        obtenerReporteIngresos(filtrosValidados, empresaId),
        obtenerReporteGastos(filtrosValidados, empresaId),
        obtenerReporteCuentasPorCobrar(empresaId),
        obtenerReporteCuentasPorPagar(empresaId),
        obtenerReporteInventario(empresaId),
        obtenerTopVendedorSemana(empresaId)
    ]);

    const ventasData = convertirNumeros(ventas);
    const comprasData = convertirNumeros(compras);
    const ingresosData = convertirNumeros(ingresos);
    const gastosData = convertirNumeros(gastos);
    const cxcData = convertirNumeros(cuentasPorCobrar);
    const cxpData = convertirNumeros(cuentasPorPagar);
    const inventarioData = convertirNumeros(inventario);

    const balance = ingresosData.monto_total - gastosData.monto_total;

    return {
        periodo: {
            fecha_inicio,
            fecha_fin
        },
        ventas: ventasData,
        compras: comprasData,
        ingresos: ingresosData,
        gastos: gastosData,
        cuentas_por_cobrar: cxcData,
        cuentas_por_pagar: cxpData,
        inventario: inventarioData,
        top_vendedor_semana: topVendedorSemana
            ? {
                id_usuario: topVendedorSemana.id_usuario,
                nombre_usuario: topVendedorSemana.nombre_usuario,
                username: topVendedorSemana.username,
                total_ventas: Number(topVendedorSemana.total_ventas || 0),
                monto_total: Number(topVendedorSemana.monto_total || 0)
            }
            : null,
        indicadores: {
            balance_ingresos_gastos: balance,
            saldo_total_por_cobrar: cxcData.saldo_pendiente,
            saldo_total_por_pagar: cxpData.saldo_pendiente,
            productos_stock_bajo: inventarioData.productos_stock_bajo
        }
    };
};

// Validar los filtros de los reportes detallados.
const validarFiltrosDetalle = (filtros = {}) => {
    const fecha_inicio = filtros.fecha_inicio || null;
    const fecha_fin = filtros.fecha_fin || null;

    if (!validarFecha(fecha_inicio) || !validarFecha(fecha_fin)) {
        const error = new Error(
            'Las fechas deben tener el formato YYYY-MM-DD y ser válidas.'
        );
        error.status = 400;
        throw error;
    }

    if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
        const error = new Error(
            'La fecha de inicio no puede ser posterior a la fecha final.'
        );
        error.status = 400;
        throw error;
    }

    return { fecha_inicio, fecha_fin };
};

// Obtener el detalle de las ventas.
export const obtenerReporteDetalleVentas = async (filtros = {}, empresaId = null) => {
    const filtrosValidados = validarFiltrosDetalle(filtros);

    const ventas = await obtenerDetalleVentas(filtrosValidados, empresaId);

    return {
        periodo: filtrosValidados,
        total_registros: ventas.length,
        ventas: ventas.map((venta) => ({
            ...venta,
            total: Number(venta.total || 0),
            monto_pagado: Number(venta.monto_pagado || 0)
        }))
    };
};

// Obtener el detalle de las compras.
export const obtenerReporteDetalleCompras = async (filtros = {}, empresaId = null) => {
    const filtrosValidados = validarFiltrosDetalle(filtros);

    const compras = await obtenerDetalleCompras(filtrosValidados, empresaId);

    return {
        periodo: filtrosValidados,
        total_registros: compras.length,
        compras: compras.map((compra) => ({
            ...compra,
            total: Number(compra.total || 0)
        }))
    };
};

// Obtener el detalle de los ingresos.
export const obtenerReporteDetalleIngresos = async (filtros = {}, empresaId = null) => {
    const filtrosValidados = validarFiltrosDetalle(filtros);

    const ingresos = await obtenerDetalleIngresos(filtrosValidados, empresaId);

    return {
        periodo: filtrosValidados,
        total_registros: ingresos.length,
        ingresos: ingresos.map((ingreso) => ({
            ...ingreso,
            monto: Number(ingreso.monto || 0)
        }))
    };
};

// Obtener el detalle de los gastos.
export const obtenerReporteDetalleGastos = async (filtros = {}, empresaId = null) => {
    const filtrosValidados = validarFiltrosDetalle(filtros);

    const gastos = await obtenerDetalleGastos(filtrosValidados, empresaId);

    return {
        periodo: filtrosValidados,
        total_registros: gastos.length,
        gastos: gastos.map((gasto) => ({
            ...gasto,
            monto: Number(gasto.monto || 0)
        }))
    };
};

// Obtener el detalle de las existencias actuales del inventario.
export const obtenerReporteDetalleInventario = async (empresaId = null) => {
    const productos = await obtenerDetalleInventario(empresaId);

    return {
        total_registros: productos.length,
        productos_stock_bajo: productos.filter(
            (producto) => producto.estado_stock === 'Stock bajo'
        ).length,
        valor_inventario: productos.reduce(
            (total, producto) =>
                total + Number(producto.valor_inventario || 0),
            0
        ),
        productos: productos.map((producto) => ({
            ...producto,
            stock: Number(producto.stock || 0),
            stock_minimo: Number(producto.stock_minimo || 0),
            precio_compra: Number(producto.precio_compra || 0),
            valor_inventario: Number(producto.valor_inventario || 0)
        }))
    };
};

// DETALLE DE CUENTAS POR COBRAR
export const obtenerReporteDetalleCuentasPorCobrar = async (empresaId = null) => {
    const cuentas = await obtenerDetalleCuentasPorCobrar(empresaId);

    const cuentasConvertidas = cuentas.map((cuenta) => ({
        ...cuenta,
        monto_original: Number(cuenta.monto_original || 0),
        saldo_pendiente: Number(cuenta.saldo_pendiente || 0)
    }));

    return {
        total_registros: cuentasConvertidas.length,

        cuentas_pendientes: cuentasConvertidas.filter(
            (cuenta) => cuenta.saldo_pendiente > 0
        ).length,

        cuentas_vencidas: cuentasConvertidas.filter(
            (cuenta) => cuenta.estado_cobro === 'Vencida'
        ).length,

        saldo_pendiente: cuentasConvertidas.reduce(
            (total, cuenta) =>
                total + Math.max(0, cuenta.saldo_pendiente),
            0
        ),

        saldo_vencido: cuentasConvertidas.reduce(
            (total, cuenta) =>
                cuenta.estado_cobro === 'Vencida'
                    ? total + Math.max(0, cuenta.saldo_pendiente)
                    : total,
            0
        ),

        cuentas_por_cobrar: cuentasConvertidas
    };
};

// DETALLE DE CUENTAS POR PAGAR
export const obtenerReporteDetalleCuentasPorPagar = async (empresaId = null) => {
    const cuentas = await obtenerDetalleCuentasPorPagar(empresaId);

    const cuentasConvertidas = cuentas.map((cuenta) => ({
        ...cuenta,
        monto_original: Number(cuenta.monto_original || 0),
        saldo_pendiente: Number(cuenta.saldo_pendiente || 0)
    }));

    return {
        total_registros: cuentasConvertidas.length,

        cuentas_pendientes: cuentasConvertidas.filter(
            (cuenta) => cuenta.saldo_pendiente > 0
        ).length,

        cuentas_vencidas: cuentasConvertidas.filter(
            (cuenta) => cuenta.estado_pago === 'Vencida'
        ).length,

        saldo_pendiente: cuentasConvertidas.reduce(
            (total, cuenta) =>
                total + Math.max(0, cuenta.saldo_pendiente),
            0
        ),

        saldo_vencido: cuentasConvertidas.reduce(
            (total, cuenta) =>
                cuenta.estado_pago === 'Vencida'
                    ? total + Math.max(0, cuenta.saldo_pendiente)
                    : total,
            0
        ),

        cuentas_por_pagar: cuentasConvertidas
    };
};

// DETALLE DE MOVIMIENTOS DE INVENTARIO
export const obtenerReporteDetalleMovimientosInventario = async (filtros = {}, empresaId = null) => {
    const movimientos = await obtenerDetalleMovimientosInventario(filtros, empresaId);

    return {
        total_registros: movimientos.length,
        movimientos: movimientos.map((m) => ({
            ...m,
            cantidad: Number(m.cantidad || 0),
            existencia_antes: Number(m.existencia_antes || 0),
            existencia_despues: Number(m.existencia_despues || 0)
        }))
    };
};


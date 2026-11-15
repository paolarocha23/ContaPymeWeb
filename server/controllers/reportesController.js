import {
    obtenerResumenGeneralReportes,
    obtenerReporteDetalleVentas,
    obtenerReporteDetalleCompras,
    obtenerReporteDetalleIngresos,
    obtenerReporteDetalleGastos,
    obtenerReporteDetalleInventario,
    obtenerReporteDetalleCuentasPorCobrar,
    obtenerReporteDetalleCuentasPorPagar
} from '../services/reportesService.js';


// Obtener el resumen general de Reportes.
export const obtenerResumenReportes = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    const resultado = await obtenerResumenGeneralReportes({
        fecha_inicio,
        fecha_fin
    });

    return res.status(200).json({
        success: true,
        message: 'Reporte generado correctamente',
        data: resultado
    });
};

// Obtener el detalle de las ventas.
export const obtenerDetalleVentasController = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    const resultado = await obtenerReporteDetalleVentas({
        fecha_inicio,
        fecha_fin
    });

    return res.status(200).json({
        success: true,
        message: 'Detalle de ventas obtenido correctamente',
        data: resultado
    });
};

// Obtener el detalle de las compras.
export const obtenerDetalleComprasController = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    const resultado = await obtenerReporteDetalleCompras({
        fecha_inicio,
        fecha_fin
    });

    return res.status(200).json({
        success: true,
        message: 'Detalle de compras obtenido correctamente',
        data: resultado
    });
};

// Obtener el detalle de los ingresos.
export const obtenerDetalleIngresosController = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    const resultado = await obtenerReporteDetalleIngresos({
        fecha_inicio,
        fecha_fin
    });

    return res.status(200).json({
        success: true,
        message: 'Detalle de ingresos obtenido correctamente',
        data: resultado
    });
};

// Obtener el detalle de los gastos.
export const obtenerDetalleGastosController = async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    const resultado = await obtenerReporteDetalleGastos({
        fecha_inicio,
        fecha_fin
    });

    return res.status(200).json({
        success: true,
        message: 'Detalle de gastos obtenido correctamente',
        data: resultado
    });
};

// Obtener el reporte detallado del inventario actual.
export const obtenerDetalleInventarioController = async (req, res) => {
    const resultado = await obtenerReporteDetalleInventario();

    return res.status(200).json({
        success: true,
        message: 'Detalle de inventario obtenido correctamente',
        data: resultado
    });
};

// DETALLE DE CUENTAS POR COBRAR
export const obtenerDetalleCuentasPorCobrarController = async (req, res) => {
    const resultado = await obtenerReporteDetalleCuentasPorCobrar();

    return res.status(200).json({
        success: true,
        message: 'Detalle de cuentas por cobrar obtenido correctamente',
        data: resultado
    });
};

// DETALLE DE CUENTAS POR PAGAR
export const obtenerDetalleCuentasPorPagarController = async (req, res) => {
    const resultado = await obtenerReporteDetalleCuentasPorPagar();

    return res.status(200).json({
        success: true,
        message: 'Detalle de cuentas por pagar obtenido correctamente',
        data: resultado
    });
};

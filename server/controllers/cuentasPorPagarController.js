import {
    obtenerCuentas as consultarCuentas,
    obtenerCuentaPorId as consultarCuentaPorId,
    obtenerPagos as consultarPagos,
    obtenerResumen as consultarResumen
} from '../services/cuentasPorPagarService.js';

export const obtenerCuentas = async (req, res) => {
    const { estatus, busqueda } = req.query;

    const cuentas = await consultarCuentas({
        estatus,
        busqueda
    });

    res.status(200).json({
        success: true,
        message: 'Cuentas por pagar obtenidas correctamente.',
        data: cuentas
    });
};

export const obtenerCuentaPorId = async (req, res) => {
    const { id } = req.params;

    const cuenta = await consultarCuentaPorId(id);

    res.status(200).json({
        success: true,
        message: 'Cuenta por pagar obtenida correctamente.',
        data: cuenta
    });
};

export const obtenerPagos = async (req, res) => {
    const { id } = req.params;

    const pagos = await consultarPagos(id);

    res.status(200).json({
        success: true,
        message: 'Historial de pagos obtenido correctamente.',
        data: pagos
    });
};

export const obtenerResumen = async (req, res) => {
    const resumen = await consultarResumen();

    res.status(200).json({
        success: true,
        message: 'Resumen de cuentas por pagar obtenido correctamente.',
        data: resumen
    });
};

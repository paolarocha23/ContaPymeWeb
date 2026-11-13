import {
    obtenerCuentas as consultarCuentas,
    obtenerCuentaPorId as consultarCuentaPorId,
    obtenerPagos as consultarPagos,
    obtenerResumen as consultarResumen,
    registrarPago as registrarNuevoPago
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

// Registrar un pago parcial o total de una cuenta por pagar
export const registrarPago = async (req, res) => {
    const { id } = req.params;
    const idUsuario = req.user.id_usuario;

    const resultado = await registrarNuevoPago(
        id,
        req.body,
        idUsuario
    );

    res.status(201).json({
        success: true,
        message: 'Pago registrado correctamente.',
        data: resultado
    });
};

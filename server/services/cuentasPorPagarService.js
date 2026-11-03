import {
    obtenerCuentas as consultarCuentas,
    obtenerCuentaPorId as consultarCuentaPorId,
    obtenerPagos as consultarPagos,
    obtenerResumen as consultarResumen
} from '../repositories/cuentasPorPagarRepository.js';

import { AppError } from '../utils/http.js';

export const obtenerCuentas = async (filtros) => {
    return await consultarCuentas(filtros);
};

export const obtenerCuentaPorId = async (id) => {
    const cuenta = await consultarCuentaPorId(id);

    if (!cuenta) {
        throw new AppError('La cuenta por pagar no existe.', 404);
    }

    return cuenta;
};

export const obtenerPagos = async (id) => {
    await obtenerCuentaPorId(id);

    return await consultarPagos(id);
};

export const obtenerResumen = async () => {
    return await consultarResumen();
};

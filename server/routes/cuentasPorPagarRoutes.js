import express from 'express';

import {
    obtenerCuentas,
    obtenerCuentaPorId,
    obtenerPagos,
    obtenerResumen,
    registrarPago
} from '../controllers/cuentasPorPagarController.js';

import {
    verifyToken,
    requirePermission
} from '../middleware/auth.js';

import { asyncHandler } from '../utils/http.js';

const router = express.Router();

// Todas las rutas requieren autenticación y permiso de CxP.
router.use(verifyToken);
router.use(requirePermission('cxp'));

// Consultar resumen de cuentas por pagar.
router.get(
    '/resumen',
    asyncHandler(obtenerResumen)
);

// Consultar todas las cuentas por pagar.
router.get(
    '/',
    asyncHandler(obtenerCuentas)
);

// Consultar detalle de una cuenta.
router.get(
    '/:id',
    asyncHandler(obtenerCuentaPorId)
);

// Consultar historial de pagos.
router.get(
    '/:id/pagos',
    asyncHandler(obtenerPagos)
);

// Registrar un pago parcial o total de CxP.
router.post(
    '/:id/pagos',
    asyncHandler(registrarPago)
);

export default router;
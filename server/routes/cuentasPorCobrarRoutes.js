import express from 'express';

import {
    obtenerCuentas,
    obtenerCuentaPorId,
    obtenerPagos,
    obtenerResumen,
    registrarCobro
} from '../controllers/cuentasPorCobrarController.js';

import {
    verifyToken,
    requirePermission
} from '../middleware/auth.js';

import { asyncHandler } from '../utils/http.js';

const router = express.Router();

// Todas las rutas requieren autenticación y permiso de CxC.
router.use(verifyToken);
router.use(requirePermission('cxc'));

// Consultar resumen de cuentas por cobrar.
router.get(
    '/resumen',
    asyncHandler(obtenerResumen)
);

// Consultar todas las cuentas por cobrar.
router.get(
    '/',
    asyncHandler(obtenerCuentas)
);

// Consultar detalle de una cuenta.
router.get(
    '/:id',
    asyncHandler(obtenerCuentaPorId)
);

// Consultar historial de cobros.
router.get(
    '/:id/pagos',
    asyncHandler(obtenerPagos)
);

// Registrar un cobro parcial o total.
router.post(
    '/:id/pagos',
    asyncHandler(registrarCobro)
);

export default router;

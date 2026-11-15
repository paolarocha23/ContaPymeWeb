import express from 'express';

import {
    obtenerResumenReportes,
    obtenerDetalleVentasController,
    obtenerDetalleComprasController,
    obtenerDetalleIngresosController,
    obtenerDetalleGastosController,
    obtenerDetalleInventarioController,
    obtenerDetalleCuentasPorCobrarController,
    obtenerDetalleCuentasPorPagarController
} from '../controllers/reportesController.js';

import {
    verifyToken,
    requirePermission
} from '../middleware/auth.js';

import { asyncHandler } from '../utils/http.js';

const router = express.Router();

// Todas las rutas requieren autenticación.
router.use(verifyToken);

// Validar el permiso de Reportes registrado en Supabase.
router.use(requirePermission('reportes'));

// Obtener resumen general de Reportes.
router.get(
    '/resumen',
    asyncHandler(obtenerResumenReportes)
);

// Obtener el detalle de las ventas.
router.get(
    '/ventas/detalle',
    asyncHandler(obtenerDetalleVentasController)
);

// Obtener el detalle de las compras.
router.get(
    '/compras/detalle',
    asyncHandler(obtenerDetalleComprasController)
);

// Obtener el detalle de los ingresos.
router.get(
    '/ingresos/detalle',
    asyncHandler(obtenerDetalleIngresosController)
);

// Obtener el detalle de los gastos.
router.get(
    '/gastos/detalle',
    asyncHandler(obtenerDetalleGastosController)
);

router.get(
    '/inventario/detalle',
    asyncHandler(obtenerDetalleInventarioController)
);

router.get(
    '/cxc/detalle',
    asyncHandler(obtenerDetalleCuentasPorCobrarController)
);

router.get(
    '/cxp/detalle',
    asyncHandler(obtenerDetalleCuentasPorPagarController)
);

export default router;
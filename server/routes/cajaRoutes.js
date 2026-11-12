import express from 'express';

import {
  obtenerMovimientos,
  obtenerMovimiento,
  registrarMovimiento,
  obtenerResumen
} from '../controllers/cajaController.js';

import {
  verifyToken,
  requirePermission
} from '../middleware/auth.js';

import { asyncHandler } from '../utils/http.js';

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('caja'));

// Consultas
router.get('/resumen', asyncHandler(obtenerResumen));
router.get('/', asyncHandler(obtenerMovimientos));
router.get('/:id', asyncHandler(obtenerMovimiento));

// Registro manual
router.post('/', asyncHandler(registrarMovimiento));

export default router;

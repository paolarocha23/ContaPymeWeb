import express from 'express';

import {
  obtenerGastos,
  obtenerGasto,
  obtenerCategorias,
  registrarGastoController,
  actualizarGastoController,
  cancelarGastoController,
  obtenerResumen
} from '../controllers/gastosController.js';

import { verifyToken, requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('gastos'));

router.get('/resumen', asyncHandler(obtenerResumen));
router.get('/categorias', asyncHandler(obtenerCategorias));
router.get('/', asyncHandler(obtenerGastos));
router.get('/:id', asyncHandler(obtenerGasto));

router.post('/', asyncHandler(registrarGastoController));
router.put('/:id', asyncHandler(actualizarGastoController));
router.patch('/:id/cancelar', asyncHandler(cancelarGastoController));

export default router;
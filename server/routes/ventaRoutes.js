import express from 'express';
import {
  getVentas,
  getVentaStats,
  getVentaById,
  getSiguienteFolio,
  createVenta,
  cancelarVentaController,
  devolverVentaController
} from '../controllers/ventaController.js';
import { verifyToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('ventas'));

router.get('/stats', getVentaStats);
router.get('/siguiente-folio', getSiguienteFolio);
router.get('/', getVentas);
router.get('/:id', getVentaById);
router.post('/', createVenta);
router.post('/:id/cancelar', cancelarVentaController);
router.patch('/:id/cancelar', cancelarVentaController);
router.post('/:id/devoluciones', devolverVentaController);

export default router;

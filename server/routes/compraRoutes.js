import { Router } from 'express';
import {
  getCompras,
  getCompraStats,
  getCompraById,
  getSiguienteFolio,
  createCompra,
  cancelarCompraController,
  registrarDevolucionController,
  getDevolucionesController
} from '../controllers/compraController.js';
import { verifyToken, requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.use(verifyToken);
router.use(requirePermission('compras'));

router.get('/stats', getCompraStats);
router.get('/siguiente-folio', getSiguienteFolio);
router.get('/', getCompras);
router.get('/:id', getCompraById);
router.post('/', createCompra);
router.post('/:id/cancelar', cancelarCompraController);
router.post('/:id/devoluciones', registrarDevolucionController);
router.get('/:id/devoluciones', getDevolucionesController);

export default router;

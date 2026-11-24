import { Router } from 'express';
import {
  getCompras,
  getCompraStats,
  getCompraById,
  getSiguienteFolio,
  createCompra,
  cancelarCompraController
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

export default router;

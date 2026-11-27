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
const requireAdminOrEncargado = (req, res, next) => {
  const rol = String(req.user?.rol || req.user?.nombre_rol || '').toLowerCase();
  if (rol === 'administrador' || rol === 'encargado' || rol === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Solo usuarios con rol de Administrador o Encargado pueden cancelar ventas.'
  });
};

router.post('/:id/cancelar', requireAdminOrEncargado, cancelarVentaController);
router.patch('/:id/cancelar', requireAdminOrEncargado, cancelarVentaController);
router.post('/:id/devoluciones', requireAdminOrEncargado, devolverVentaController);

export default router;

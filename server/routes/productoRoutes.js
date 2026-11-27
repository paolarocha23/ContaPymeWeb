import { Router } from 'express';

import {
  getProductos,
  getStats,
  getCategorias,
  getProductoById,
  getOperaciones,
  createProducto,
  updateProducto,
  toggleProductoStatus,
  deleteProducto
} from '../controllers/productoController.js';

import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { errorHandler } from '../utils/http.js';

const router = Router();

router.use(verifyToken);

// Consultar: cualquier usuario autenticado. Las rutas fijas van antes de /:id.
router.get('/', getProductos);
router.get('/stats', getStats);
router.get('/categorias', getCategorias);
router.get('/:id', getProductoById);
router.get('/:id/operaciones', getOperaciones);

// Administrar: solo Administrador
const requireAdminOEncargado = (req, res, next) => {
  const rol = String(req.user?.rol_nombre || req.user?.rol || '').toLowerCase();
  if (rol === 'administrador' || rol === 'encargado' || rol === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado: solo Administrador o Encargado pueden modificar productos.'
  });
};

router.post('/', requireAdminOEncargado, createProducto);
router.put('/:id', requireAdminOEncargado, updateProducto);
router.patch('/:id/status', requireAdminOEncargado, toggleProductoStatus);
router.delete('/:id', requireAdminOEncargado, deleteProducto);

router.use(errorHandler);

export default router;

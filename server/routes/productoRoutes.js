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
router.post('/', requireAdmin, createProducto);
router.put('/:id', requireAdmin, updateProducto);
router.patch('/:id/status', requireAdmin, toggleProductoStatus);
router.delete('/:id', requireAdmin, deleteProducto);

router.use(errorHandler);

export default router;

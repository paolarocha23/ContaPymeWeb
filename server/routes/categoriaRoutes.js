import { Router } from 'express';
import {
  getCategorias, getStats, getCategoriaById,
  createCategoria, updateCategoria, toggleCategoriaStatus
} from '../controllers/categoriaController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { errorHandler } from '../utils/http.js';

const router = Router();

router.use(verifyToken);

router.get('/', getCategorias);
router.get('/stats', getStats);          // antes de '/:id'
router.get('/:id', getCategoriaById);
router.post('/', requireAdmin, createCategoria);
router.put('/:id', requireAdmin, updateCategoria);
router.patch('/:id/status', requireAdmin, toggleCategoriaStatus);

router.use(errorHandler);

export default router;

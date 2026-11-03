import { Router } from 'express';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  toggleCategoriaStatus
} from '../controllers/categoriaController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);

router.get('/', getCategorias);
router.post('/', requireAdmin, createCategoria);
router.put('/:id', requireAdmin, updateCategoria);
router.patch('/:id/status', requireAdmin, toggleCategoriaStatus);

export default router;
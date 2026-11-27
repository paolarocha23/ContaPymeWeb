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
const requireAdminOEncargado = (req, res, next) => {
  const rol = String(req.user?.rol_nombre || req.user?.rol || '').toLowerCase();
  if (rol === 'administrador' || rol === 'encargado' || rol === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado: solo Administrador o Encargado pueden gestionar categorías.'
  });
};

router.post('/', requireAdminOEncargado, createCategoria);
router.put('/:id', requireAdminOEncargado, updateCategoria);
router.patch('/:id/status', requireAdminOEncargado, toggleCategoriaStatus);

router.use(errorHandler);

export default router;

import { Router } from 'express';
import {
  getProveedores, getStats, getProveedorById,
  createProveedor, updateProveedor, toggleProveedorStatus
} from '../controllers/proveedorController.js';
import { verifyToken } from '../middleware/auth.js';
import { errorHandler } from '../utils/http.js';

const router = Router();

router.use(verifyToken);

router.get('/', getProveedores);
router.get('/stats', getStats);          // antes de '/:id'
router.get('/:id', getProveedorById);
router.post('/', createProveedor);
router.put('/:id', updateProveedor);
router.patch('/:id/status', toggleProveedorStatus);

router.use(errorHandler);

export default router;
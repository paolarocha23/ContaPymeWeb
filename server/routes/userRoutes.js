import { Router } from 'express';
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  toggleUserStatus, 
  adminResetPassword 
} from '../controllers/userController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Todas las operaciones de gestión de catálogo de usuarios requieren Administrador
router.use(verifyToken);
router.use(requireAdmin);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.post('/:id/reset-password-admin', adminResetPassword);

export default router;

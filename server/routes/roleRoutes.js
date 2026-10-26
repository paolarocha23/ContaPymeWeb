import { Router } from 'express';
import { 
  getRoles, 
  getRoleById, 
  createRole, 
  updateRole, 
  toggleRoleStatus, 
  assignUserRole 
} from '../controllers/roleController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Todas las operaciones de roles requieren token y perfil Administrador
router.use(verifyToken);
router.use(requireAdmin);

router.get('/', getRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.patch('/:id/status', toggleRoleStatus);
router.put('/assign-user/:id_usuario', assignUserRole);

export default router;

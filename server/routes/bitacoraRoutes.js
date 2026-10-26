import { Router } from 'express';
import { getBitacora } from '../controllers/bitacoraController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken);
router.use(requireAdmin);

router.get('/', getBitacora);

export default router;

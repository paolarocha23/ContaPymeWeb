import express from 'express';
import { getDashboardSummary, getAsistenteFinanciero } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getDashboardSummary);
router.get('/asistente-financiero', getAsistenteFinanciero);

export default router;

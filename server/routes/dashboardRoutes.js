import express from 'express';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getDashboardSummary);

export default router;

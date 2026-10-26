import { Router } from 'express';
import { 
  login, 
  verify2FA, 
  resend2FA, 
  logout, 
  forgotPassword, 
  resetPassword, 
  changePassword, 
  getMe 
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { authLimiter, twoFactorLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Rutas de autenticación (Públicas con rate limiting)
router.post('/login', authLimiter, login);
router.post('/verify-2fa', twoFactorLimiter, verify2FA);
router.post('/resend-2fa', authLimiter, resend2FA);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Cierre de sesión (puede llamarse con o sin token, manual o por inactividad)
router.post('/logout', logout);

// Rutas protegidas (Requieren JWT válido)
router.get('/me', verifyToken, getMe);
router.post('/change-password', verifyToken, changePassword);

export default router;

import rateLimit from 'express-rate-limit';

// Limitador estricto para autenticación y recuperación de contraseñas
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 30, // máximo 30 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta dirección IP. Intenta nuevamente en 10 minutos.'
  }
});

// Limitador de intentos de código 2FA
export const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // máximo 10 intentos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de verificación de código. Espera 5 minutos.'
  }
});

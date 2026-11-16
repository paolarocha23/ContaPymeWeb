import express from 'express';
import {
    obtenerNotificacionesController
} from '../controllers/notificacionesController.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

// Todas las rutas requieren un usuario autenticado.
router.use(verifyToken);

// Consultar las notificaciones del usuario.
router.get(
    '/',
    asyncHandler(obtenerNotificacionesController)
);

export default router;

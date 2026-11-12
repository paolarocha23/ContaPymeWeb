import { Router } from 'express';

import {
  getIngresos,
  getStats,
  getCategorias,
  getIngresoById,
  createIngreso,
  updateIngreso,
  cancelIngreso
} from '../controllers/ingresoController.js';

import { verifyToken } from '../middleware/auth.js';
import { registrarBitacora } from '../utils/bitacora.js';
import { errorHandler } from '../utils/http.js';

const router = Router();

// Los ingresos son información financiera (NF03): solo Administrador y Encargado.
// Los accesos rechazados se registran en bitácora (NF02).
const requireAdminOEncargado = async (req, res, next) => {
  if (['Administrador', 'Encargado'].includes(req.user?.rol_nombre)) return next();

  try {
    await registrarBitacora(req, {
      id_usuario: req.user?.id_usuario,
      nombre_usuario: req.user?.nombre_usuario,
      accion: 'ACCESO_DENEGADO',
      detalle: `Intento no autorizado en Ingresos (${req.method} ${req.originalUrl}) con rol ${req.user?.rol_nombre ?? 'desconocido'}`
    });
  } catch (err) {
    console.error('No se pudo registrar el acceso denegado:', err);
  }

  return res.status(403).json({
    success: false,
    message: 'Acceso denegado: se requiere rol Administrador o Encargado'
  });
};

router.use(verifyToken);
router.use(requireAdminOEncargado);

// Las rutas fijas van antes de /:id.
router.get('/', getIngresos);
router.get('/stats', getStats);
router.get('/categorias', getCategorias);
router.get('/:id', getIngresoById);

router.post('/', createIngreso);
router.put('/:id', updateIngreso);
router.patch('/:id/cancelar', cancelIngreso);

router.use(errorHandler);

export default router;
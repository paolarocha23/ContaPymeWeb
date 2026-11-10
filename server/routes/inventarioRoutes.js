import { Router } from 'express';

import {
  getExistencias,
  getStats,
  getCategorias,
  getStockBajo,
  getMovimientos,
  getExistenciaById,
  createEntrada,
  createSalida,
  createAjuste
} from '../controllers/inventarioController.js';

import { verifyToken } from '../middleware/auth.js';
import { errorHandler } from '../utils/http.js';

const router = Router();

// RDF0802 / RDF0803: movimientos autorizados solo por Administrador o Encargado.
const requireAdminOEncargado = (req, res, next) => {
  if (['Administrador', 'Encargado'].includes(req.user?.rol_nombre)) return next();

  return res.status(403).json({
    success: false,
    message: 'Acceso denegado: se requiere rol Administrador o Encargado'
  });
};

router.use(verifyToken);

// Consultar: cualquier usuario autenticado. Las rutas fijas van antes de /:id.
router.get('/', getExistencias);
router.get('/stats', getStats);
router.get('/categorias', getCategorias);
router.get('/stock-bajo', getStockBajo);
router.get('/movimientos', getMovimientos);
router.get('/:id', getExistenciaById);

// Registrar movimientos: Administrador o Encargado
router.post('/entradas', requireAdminOEncargado, createEntrada);
router.post('/salidas', requireAdminOEncargado, createSalida);
router.post('/ajustes', requireAdminOEncargado, createAjuste);

router.use(errorHandler);

export default router;
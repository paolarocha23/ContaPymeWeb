import {
  listarMovimientosCaja,
  consultarMovimientoCaja,
  crearMovimientoCaja,
  consultarResumenCaja
} from '../services/cajaService.js';

// GET /api/caja
export async function obtenerMovimientos(req, res) {
  const movimientos = await listarMovimientosCaja(req.query);

  res.json({
    success: true,
    message: 'Movimientos de Caja consultados correctamente',
    data: movimientos
  });
}

// GET /api/caja/:id
export async function obtenerMovimiento(req, res) {
  const movimiento = await consultarMovimientoCaja(req.params.id);

  res.json({
    success: true,
    message: 'Movimiento consultado correctamente',
    data: movimiento
  });
}

// POST /api/caja
export async function registrarMovimiento(req, res) {
  const id_usuario = req.user.id_usuario;

  const movimiento = await crearMovimientoCaja(
    req.body,
    id_usuario
  );

  res.status(201).json({
    success: true,
    message: 'Movimiento registrado correctamente',
    data: movimiento
  });
}

// GET /api/caja/resumen
export async function obtenerResumen(req, res) {
  const resumen = await consultarResumenCaja(req.query);

  res.json({
    success: true,
    message: 'Resumen de Caja consultado correctamente',
    data: resumen
  });
}

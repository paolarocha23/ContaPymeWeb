import * as service from '../services/cuentasPorCobrarService.js';

export async function obtenerCuentas(req, res) {
  const data = await service.listarCuentas({
    estatus: req.query.estatus || '',
    busqueda: req.query.busqueda || ''
  }, req.user.empresa_id);

  res.json({ success: true, data });
}

export async function obtenerCuentaPorId(req, res) {
  const data = await service.obtenerCuenta(req.params.id);
  res.json({ success: true, data });
}

export async function obtenerPagos(req, res) {
  const data = await service.listarPagos(req.params.id);
  res.json({ success: true, data });
}

export async function obtenerResumen(req, res) {
  const data = await service.obtenerIndicadores(req.user.empresa_id);
  res.json({ success: true, data });
}

export async function registrarCobro(req, res) {
  const idUsuario = req.user?.id_usuario;

  if (!idUsuario) {
    return res.status(401).json({
      success: false,
      message: 'No se pudo identificar al usuario de la sesión.'
    });
  }

  const data = await service.registrarCobro(
    req.params.id,
    req.body,
    idUsuario,
    req.user.empresa_id
  );

  res.status(201).json({
    success: true,
    message: 'El cobro se registró correctamente.',
    data
  });
}

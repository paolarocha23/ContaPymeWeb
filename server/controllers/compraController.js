import * as compraService from '../services/compraService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle,
    empresa_id: req.user.empresa_id
  });

export const getCompras = asyncHandler(async (req, res) => {
  const compras = await compraService.listar(req.query, req.user.empresa_id);
  res.json({ success: true, data: compras });
});

export const getCompraStats = asyncHandler(async (req, res) => {
  const stats = await compraService.estadisticas(req.user.empresa_id);
  res.json({ success: true, data: stats });
});

export const getCompraById = asyncHandler(async (req, res) => {
  const compra = await compraService.obtener(req.params.id, req.user.empresa_id);
  res.json({ success: true, data: compra });
});

export const getSiguienteFolio = asyncHandler(async (req, res) => {
  const resultado = await compraService.siguienteFolio(req.user.empresa_id);
  res.json({ success: true, data: resultado });
});

export const createCompra = asyncHandler(async (req, res) => {
  const compra = await compraService.crear(req.body, req.user.id_usuario, req.user.empresa_id);

  await auditar(
    req,
    'CREACION_COMPRA',
    `Se registró la compra folio "${compra.codigo}" (ID: ${compra.id_compra})${compra.cxp_creada ? ' con Cuenta por Pagar vinculada' : ''}`
  );

  res.status(201).json({
    success: true,
    message: 'Compra registrada exitosamente.',
    data: compra
  });
});

export const cancelarCompraController = asyncHandler(async (req, res) => {
  const { motivo } = req.body;
  const resultado = await compraService.cancelar(
    req.params.id,
    motivo,
    req.user.id_usuario,
    req.user.empresa_id
  );

  await auditar(
    req,
    'CANCELACION_COMPRA',
    `Se canceló la compra folio "${resultado.codigo}" (ID: ${resultado.id_compra}). Motivo: ${motivo || 'No especificado'}`
  );

  res.json({
    success: true,
    message: resultado.mensaje,
    data: resultado
  });
});

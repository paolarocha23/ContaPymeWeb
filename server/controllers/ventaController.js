import * as ventaService from '../services/ventaService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle
  });

const moneda = (n) =>
  Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export const getVentas = asyncHandler(async (req, res) => {
  const data = await ventaService.listar(req.query, req.user.empresa_id);
  res.json({ success: true, data });
});

export const getVentaStats = asyncHandler(async (req, res) => {
  const data = await ventaService.estadisticas(req.user.empresa_id);
  res.json({ success: true, data });
});

export const getVentaById = asyncHandler(async (req, res) => {
  const data = await ventaService.obtener(req.params.id);
  res.json({ success: true, data });
});

export const getSiguienteFolio = asyncHandler(async (req, res) => {
  const data = await ventaService.siguienteFolio(req.user.empresa_id);
  res.json({ success: true, data });
});

export const createVenta = asyncHandler(async (req, res) => {
  const venta = await ventaService.crear(req.body, req.user.id_usuario, req.user.empresa_id);

  const detalleAuditoria =
    `Se registró la venta folio "${venta.codigo}" por ${moneda(venta.total)} ` +
    `a ${venta.condiciones_pago} (${venta.forma_pago}) ` +
    `al cliente "${venta.nombre_cliente}". Pagado: ${moneda(venta.monto_pagado)}. ` +
    `Saldo pendiente: ${moneda(venta.saldo_pendiente)} (ID: ${venta.id_venta})`;

  await auditar(req, 'CREACION_VENTA', detalleAuditoria);

  res.status(201).json({
    success: true,
    message: 'Venta registrada exitosamente.',
    data: venta
  });
});

export const cancelarVentaController = asyncHandler(async (req, res) => {
  const venta = await ventaService.cancelar(
    req.params.id,
    req.body,
    req.user.id_usuario,
    req.user.empresa_id
  );

  await auditar(
    req,
    'CANCELACION_VENTA',
    `Se canceló la venta folio "${venta.codigo}" por ${moneda(venta.total)}. Se revirtieron inventario, ingresos y caja (ID: ${venta.id_venta})`
  );

  res.json({
    success: true,
    message: 'Venta cancelada exitosamente.',
    data: venta
  });
});

import * as inventarioService from '../services/inventarioService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle
  });

const detalleMovimiento = (verbo, { anterior, movimiento }) =>
  `${verbo} "${anterior.nombre}" (ID: ${anterior.id_producto}). ` +
  `Cantidad: ${movimiento.cantidad}. Existencia: ${movimiento.existencia_antes} → ${movimiento.existencia_despues}. ` +
  `Motivo: ${movimiento.motivo}`;

export const getExistencias = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await inventarioService.listar(req.query) });
});

export const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await inventarioService.estadisticas() });
});

export const getCategorias = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await inventarioService.listarCategorias() });
});

export const getStockBajo = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await inventarioService.productosStockBajo() });
});

export const getMovimientos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await inventarioService.movimientos(req.query) });
});

export const getExistenciaById = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await inventarioService.obtener(req.params.id) });
});

export const createEntrada = asyncHandler(async (req, res) => {
  const resultado = await inventarioService.registrarEntrada(req.body, req.user.id_usuario);

  await auditar(req, 'ENTRADA_INVENTARIO', detalleMovimiento('Entrada manual de', resultado));

  res.status(201).json({
    success: true,
    message: 'Entrada de inventario registrada exitosamente.',
    data: { producto: resultado.producto, movimiento: resultado.movimiento }
  });
});

export const createSalida = asyncHandler(async (req, res) => {
  const resultado = await inventarioService.registrarSalida(req.body, req.user.id_usuario);

  await auditar(req, 'SALIDA_INVENTARIO', detalleMovimiento('Salida manual de', resultado));

  res.status(201).json({
    success: true,
    message: 'Salida de inventario registrada exitosamente.',
    data: { producto: resultado.producto, movimiento: resultado.movimiento }
  });
});

export const createAjuste = asyncHandler(async (req, res) => {
  const resultado = await inventarioService.registrarAjuste(req.body, req.user.id_usuario);

  await auditar(req, 'AJUSTE_INVENTARIO', detalleMovimiento('Ajuste de inventario de', resultado));

  res.status(201).json({
    success: true,
    message: 'Ajuste de inventario registrado correctamente.',
    data: { producto: resultado.producto, movimiento: resultado.movimiento }
  });
});
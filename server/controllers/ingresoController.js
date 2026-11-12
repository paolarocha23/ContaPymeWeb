import * as ingresoService from '../services/ingresoService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle
  });

const { moneda } = ingresoService;

export const getIngresos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await ingresoService.listar(req.query) });
});

export const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await ingresoService.estadisticas() });
});

export const getCategorias = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await ingresoService.listarCategorias() });
});

export const getIngresoById = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await ingresoService.obtener(req.params.id) });
});

export const createIngreso = asyncHandler(async (req, res) => {
  const ingreso = await ingresoService.crear(req.body, req.user.id_usuario);

  await auditar(
    req,
    'CREACION_INGRESO',
    `Se registró el ingreso "${ingreso.concepto}" por ${moneda(ingreso.monto)} en ${ingreso.forma_pago} (ID: ${ingreso.id_ingreso})`
  );

  res.status(201).json({
    success: true,
    message: 'Ingreso registrado exitosamente.',
    data: ingreso
  });
});

export const updateIngreso = asyncHandler(async (req, res) => {
  const { anterior, ingreso } = await ingresoService.actualizar(
    req.params.id,
    req.body,
    req.user.id_usuario
  );

  const cambioMonto = Number(anterior.monto) !== Number(ingreso.monto)
    ? ` Monto: ${moneda(anterior.monto)} → ${moneda(ingreso.monto)}.`
    : '';

  await auditar(
    req,
    'MODIFICACION_INGRESO',
    `Se modificó el ingreso "${anterior.concepto}" (ID: ${ingreso.id_ingreso}).${cambioMonto}`
  );

  res.json({
    success: true,
    message: 'Ingreso actualizado correctamente.',
    data: ingreso
  });
});

export const cancelIngreso = asyncHandler(async (req, res) => {
  const { ingreso, motivo } = await ingresoService.cancelar(
    req.params.id,
    req.body,
    req.user.id_usuario
  );

  await auditar(
    req,
    'CANCELACION_INGRESO',
    `Se canceló el ingreso "${ingreso.concepto}" por ${moneda(ingreso.monto)} (ID: ${ingreso.id_ingreso})` +
      `${ingreso.forma_pago === 'efectivo' ? '. Se revirtió el movimiento de caja' : ''}` +
      `${motivo ? `. Motivo: ${motivo}` : ''}`
  );

  res.json({
    success: true,
    message: 'Ingreso cancelado correctamente.',
    data: ingreso
  });
});
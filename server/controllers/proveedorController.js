import * as proveedorService from '../services/proveedorService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

// Registra las acciones realizadas por el usuario que inició sesión.
const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle
  });

export const getProveedores = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await proveedorService.listar(req.query) });
});

export const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await proveedorService.estadisticas() });
});

export const getProveedorById = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await proveedorService.obtener(req.params.id) });
});

export const createProveedor = asyncHandler(async (req, res) => {
  const proveedor = await proveedorService.crear(req.body);
  await auditar(req, 'CREACION_PROVEEDOR',
    `Se registró al proveedor "${proveedor.nombre_empresa}" (ID: ${proveedor.id_proveedor})`);
  res.status(201).json({
    success: true,
    message: 'Proveedor registrado exitosamente con estatus activo.',
    data: proveedor
  });
});

export const updateProveedor = asyncHandler(async (req, res) => {
  const { proveedor } = await proveedorService.actualizar(req.params.id, req.body);
  await auditar(req, 'MODIFICACION_PROVEEDOR',
    `Se modificaron los datos del proveedor "${proveedor.nombre_empresa}" (ID: ${proveedor.id_proveedor})`);
  res.json({ success: true, message: 'Proveedor actualizado correctamente.', data: proveedor });
});

export const toggleProveedorStatus = asyncHandler(async (req, res) => {
  const { proveedor, cambio } = await proveedorService.cambiarEstatus(req.params.id, req.body);
  const activo = Number(proveedor.estatus) === 1;

  if (cambio) {
    await auditar(
      req,
      activo ? 'ACTIVACION_PROVEEDOR' : 'DESACTIVACION_PROVEEDOR',
      activo
        ? `Se reactivó al proveedor "${proveedor.nombre_empresa}" (ID: ${proveedor.id_proveedor})`
        : `Se desactivó al proveedor "${proveedor.nombre_empresa}" (ID: ${proveedor.id_proveedor}). Ya no podrá seleccionarse en nuevas compras.`
    );
  }

  res.json({
    success: true,
    message: !cambio
      ? `El proveedor ya estaba ${activo ? 'activo' : 'inactivo'}.`
      : activo ? 'Proveedor activado exitosamente.' : 'Proveedor desactivado correctamente.',
    estatus: Number(proveedor.estatus)
  });
});
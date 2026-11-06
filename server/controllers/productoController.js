import * as productoService from '../services/productoService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle
  });

export const getProductos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await productoService.listar(req.query) });
});

export const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await productoService.estadisticas() });
});

export const getCategorias = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await productoService.listarCategorias() });
});

export const getProductoById = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await productoService.obtener(req.params.id) });
});

export const getOperaciones = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await productoService.operaciones(req.params.id) });
});

export const createProducto = asyncHandler(async (req, res) => {
  const producto = await productoService.crear(req.body);

  await auditar(
    req,
    'CREACION_PRODUCTO',
    `Se registró ${producto.tipo} "${producto.nombre}" (ID: ${producto.id_producto})`
  );

  res.status(201).json({
    success: true,
    message: 'Producto o servicio registrado exitosamente.',
    data: producto
  });
});

export const updateProducto = asyncHandler(async (req, res) => {
  const { anterior, producto } = await productoService.actualizar(req.params.id, req.body);

  await auditar(
    req,
    'MODIFICACION_PRODUCTO',
    `Se modificó "${anterior.nombre}" (ID: ${producto.id_producto})`
  );

  res.json({
    success: true,
    message: 'Producto o servicio actualizado correctamente.',
    data: producto
  });
});

export const toggleProductoStatus = asyncHandler(async (req, res) => {
  const { producto, cambio } = await productoService.cambiarEstatus(req.params.id, req.body);

  const activo = Number(producto.estatus) === 1;

  if (cambio) {
    await auditar(
      req,
      activo ? 'ACTIVACION_PRODUCTO' : 'DESACTIVACION_PRODUCTO',
      `${activo ? 'Se activó' : 'Se desactivó'} "${producto.nombre}" (ID: ${producto.id_producto})`
    );
  }

  res.json({
    success: true,
    message: !cambio
      ? `El registro ya estaba ${activo ? 'activo' : 'inactivo'}.`
      : activo
        ? 'Producto o servicio activado exitosamente.'
        : 'Producto o servicio desactivado exitosamente.',
    data: producto
  });
});

export const deleteProducto = asyncHandler(async (req, res) => {
  const producto = await productoService.eliminar(req.params.id);

  await auditar(
    req,
    'ELIMINACION_PRODUCTO',
    `Se eliminó "${producto.nombre}" (ID: ${producto.id_producto})`
  );

  res.json({ success: true, message: 'Producto o servicio eliminado correctamente.' });
});


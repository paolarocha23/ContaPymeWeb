import * as categoriaService from '../services/categoriaService.js';
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

export const getCategorias = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await categoriaService.listar(req.query) });
});

export const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await categoriaService.estadisticas() });
});

export const getCategoriaById = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await categoriaService.obtener(req.params.id) });
});

export const createCategoria = asyncHandler(async (req, res) => {
  const categoria = await categoriaService.crear(req.body);
  await auditar(req, 'CREACION_CATEGORIA',
    `Se registró la categoría "${categoria.nombre}" (ID: ${categoria.id_categoria})`);
  res.status(201).json({
    success: true,
    message: 'Categoría registrada exitosamente con estatus activo.',
    data: categoria
  });
});

export const updateCategoria = asyncHandler(async (req, res) => {
  const { anterior, actual } = await categoriaService.actualizar(req.params.id, req.body);
  await auditar(req, 'MODIFICACION_CATEGORIA',
    `Se modificó la categoría "${anterior.nombre}" → "${actual.nombre}" (ID: ${actual.id_categoria})`);
  res.json({ success: true, message: 'Categoría actualizada correctamente.', data: actual });
});

export const toggleCategoriaStatus = asyncHandler(async (req, res) => {
  const { categoria, cambio } = await categoriaService.cambiarEstatus(req.params.id, req.body);
  const activa = Number(categoria.estatus) === 1;

  if (cambio) {
    await auditar(
      req,
      activa ? 'ACTIVACION_CATEGORIA' : 'DESACTIVACION_CATEGORIA',
      activa
        ? `Se activó la categoría "${categoria.nombre}" (ID: ${categoria.id_categoria})`
        : `Se desactivó la categoría "${categoria.nombre}" (ID: ${categoria.id_categoria})`
    );
  }

  res.json({
    success: true,
    message: !cambio
      ? `La categoría ya estaba ${activa ? 'activa' : 'inactiva'}.`
      : activa ? 'Categoría activada exitosamente.' : 'Categoría desactivada exitosamente.',
    estatus: Number(categoria.estatus)
  });
});

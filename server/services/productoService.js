import * as repo from '../repositories/productoRepository.js';
import * as categoriaService from './categoriaService.js';
import { AppError } from '../utils/http.js';

import {
  validarProducto,
  validarEstatus,
  parseId,
  normalizarFiltros
} from '../validators/productoValidator.js';

async function obtenerOFallar(idParam, empresaId) {
  const id = parseId(idParam);
  const producto = await repo.findById(id, empresaId);

  if (!producto) {
    throw new AppError('Producto o servicio no encontrado.', 404);
  }

  return producto;
}

async function verificarCodigoUnico(codigo, excluirId = null, empresaId = null) {
  if (await repo.findByCodigo(codigo, excluirId, empresaId)) {
    throw new AppError(`El código "${codigo}" ya está registrado.`, 409);
  }
}

// La categoría debe existir en la empresa y estar activa
async function verificarCategoria(idCategoria, empresaId) {
  if (!(await repo.categoriaEsDeEmpresa(idCategoria, empresaId))) {
    throw new AppError('La categoría seleccionada no existe.', 400);
  }
  await categoriaService.obtenerCategoriaActiva(idCategoria);
}

export const listar = (query, empresaId = null) => repo.list(normalizarFiltros(query), empresaId);

// RF0705
export const obtener = (id, empresaId) => obtenerOFallar(id, empresaId);

export const estadisticas = (empresaId = null) => repo.stats(empresaId);

export const listarCategorias = (empresaId = null) => repo.categoriasActivas(empresaId);

// RF0701 – nace activo (el repositorio inserta estatus = 1)
export async function crear(body, empresaId) {
  const datos = validarProducto(body);

  await verificarCodigoUnico(datos.codigo, null, empresaId);
  await verificarCategoria(datos.id_categoria, empresaId);

  return repo.insert(datos, empresaId);
}

// RF0703 – el identificador no se modifica
export async function actualizar(idParam, body, empresaId) {
  const actual = await obtenerOFallar(idParam, empresaId);
  const datos = validarProducto(body);

  await verificarCodigoUnico(datos.codigo, actual.id_producto, empresaId);

  // Solo se exige categoría activa si la están cambiando.
  if (datos.id_categoria !== Number(actual.id_categoria)) {
    await verificarCategoria(datos.id_categoria, empresaId);
  }

  const producto = await repo.update(actual.id_producto, datos, empresaId);

  return { anterior: actual, producto };
}

// RF0702 – desactivar siempre se puede
export async function cambiarEstatus(idParam, body, empresaId) {
  const actual = await obtenerOFallar(idParam, empresaId);
  const estatus = validarEstatus(body);

  if (Number(actual.estatus) === estatus) {
    return { producto: actual, cambio: false };
  }

  const producto = await repo.updateStatus(actual.id_producto, estatus, empresaId);

  return { producto, cambio: true };
}

// RF0702 – solo se elimina si no tiene operaciones relacionadas
export async function eliminar(idParam, empresaId) {
  const actual = await obtenerOFallar(idParam, empresaId);

  if (await repo.tieneOperaciones(actual.id_producto)) {
    throw new AppError(
      'Este producto o servicio tiene operaciones relacionadas. Debe desactivarse para conservar su historial.',
      409,
      { code: 'PRODUCTO_CON_OPERACIONES' }
    );
  }

  await repo.remove(actual.id_producto, empresaId);

  return actual;
}

// Para el detalle y para decidir en pantalla entre "Eliminar" y "Desactivar"
export async function operaciones(idParam, empresaId) {
  const producto = await obtenerOFallar(idParam, empresaId);

  const relaciones = await repo.contarOperaciones(producto.id_producto);
  const ventasFilas = await repo.ventasDeProducto(producto.id_producto);

  const suma = (regex) => relaciones
    .filter(r => regex.test(r.tabla))
    .reduce((acc, r) => acc + r.total, 0);

  return {
    tiene_operaciones: relaciones.length > 0,
    total_relacionadas: relaciones.reduce((acc, r) => acc + r.total, 0),
    ventas: suma(/venta/i),
    compras: suma(/compra/i),
    ultima_operacion: ventasFilas[0]?.fecha ?? null,
    operaciones: ventasFilas.map(v => ({
      tipo: 'venta',
      folio: v.folio,
      fecha: v.fecha,
      descripcion: `Venta · ${Number(v.cantidad)} ${String(producto.unidad_medida).toLowerCase()}`,
      importe: Number(v.importe)
    }))
  };
}

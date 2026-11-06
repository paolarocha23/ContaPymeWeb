import * as repo from '../repositories/productoRepository.js';
import * as categoriaService from './categoriaService.js';
import { AppError } from '../utils/http.js';

import {
  validarProducto,
  validarEstatus,
  parseId,
  normalizarFiltros
} from '../validators/productoValidator.js';

async function obtenerOFallar(idParam) {
  const id = parseId(idParam);
  const producto = await repo.findById(id);

  if (!producto) {
    throw new AppError('Producto o servicio no encontrado.', 404);
  }

  return producto;
}

async function verificarCodigoUnico(codigo, excluirId = null) {
  if (await repo.findByCodigo(codigo, excluirId)) {
    throw new AppError(`El código "${codigo}" ya está registrado.`, 409);
  }
}

export const listar = (query) => repo.list(normalizarFiltros(query));

// RF0705
export const obtener = (id) => obtenerOFallar(id);

export const estadisticas = () => repo.stats();

export const listarCategorias = () => repo.categoriasActivas();

// RF0701 – nace activo (el repositorio inserta estatus = 1)
export async function crear(body) {
  const datos = validarProducto(body);

  await verificarCodigoUnico(datos.codigo);
  await categoriaService.obtenerCategoriaActiva(datos.id_categoria);

  return repo.insert(datos);
}

// RF0703 – el identificador no se modifica
export async function actualizar(idParam, body) {
  const actual = await obtenerOFallar(idParam);
  const datos = validarProducto(body);

  await verificarCodigoUnico(datos.codigo, actual.id_producto);

  // Solo se exige categoría activa si la están cambiando.
  if (datos.id_categoria !== Number(actual.id_categoria)) {
    await categoriaService.obtenerCategoriaActiva(datos.id_categoria);
  }

  const producto = await repo.update(actual.id_producto, datos);

  return { anterior: actual, producto };
}

// RF0702 – desactivar siempre se puede
export async function cambiarEstatus(idParam, body) {
  const actual = await obtenerOFallar(idParam);
  const estatus = validarEstatus(body);

  if (Number(actual.estatus) === estatus) {
    return { producto: actual, cambio: false };
  }

  const producto = await repo.updateStatus(actual.id_producto, estatus);

  return { producto, cambio: true };
}

// RF0702 – solo se elimina si no tiene operaciones relacionadas
export async function eliminar(idParam) {
  const actual = await obtenerOFallar(idParam);

  if (await repo.tieneOperaciones(actual.id_producto)) {
    throw new AppError(
      'Este producto o servicio tiene operaciones relacionadas. Debe desactivarse para conservar su historial.',
      409,
      { code: 'PRODUCTO_CON_OPERACIONES' }
    );
  }

  await repo.remove(actual.id_producto);

  return actual;
}

// Para el detalle y para decidir en pantalla entre "Eliminar" y "Desactivar"
export async function operaciones(idParam) {
  const producto = await obtenerOFallar(idParam);

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

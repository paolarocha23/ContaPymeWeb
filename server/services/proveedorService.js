import * as repo from '../repositories/proveedorRepository.js';
import { AppError } from '../utils/http.js';
import {
  validarProveedor, validarEstatus, parseId, normalizarFiltros
} from '../validators/proveedorValidator.js';

async function obtenerOFallar(idParam) {
  const id = parseId(idParam);
  const proveedor = await repo.findById(id);
  if (!proveedor) throw new AppError('Proveedor no encontrado.', 404);
  return proveedor;
}

export const listar = (query, empresaId = null) => repo.list(normalizarFiltros(query), empresaId);
export const obtener = (id) => obtenerOFallar(id);
export const estadisticas = (empresaId = null) => repo.stats(empresaId);

/** El estatus inicial siempre es activo. */
export async function crear(body, empresaId = 1) {
  return repo.insert(validarProveedor(body), empresaId);
}

/** Se actualizan los datos, nunca el identificador. */
export async function actualizar(idParam, body) {
  const actual = await obtenerOFallar(idParam);
  const datos = validarProveedor(body);
  const proveedor = await repo.update(actual.id_proveedor, datos);
  return { anterior: actual, proveedor };
}

/** Solo se puede desactivar si no tiene compras asociadas. Reactivar siempre se permite. */
export async function cambiarEstatus(idParam, body) {
  const actual = await obtenerOFallar(idParam);
  const estatus = validarEstatus(body);
  if (Number(actual.estatus) === estatus) return { proveedor: actual, cambio: false };

  if (estatus === 0) {
    const compras = await repo.contarCompras(actual.id_proveedor);
    if (compras > 0) {
      throw new AppError(
        `No se puede desactivar a "${actual.nombre_empresa}": tiene ${compras} compra(s) asociada(s).`,
        409
      );
    }
  }

  await repo.updateStatus(actual.id_proveedor, estatus);
  return { proveedor: { ...actual, estatus }, cambio: true };
}

export async function obtenerProveedorActivo(idParam) {
  const proveedor = await obtenerOFallar(idParam);
  if (Number(proveedor.estatus) !== 1) {
    throw new AppError(`El proveedor "${proveedor.nombre_empresa}" está inactivo y no puede usarse en nuevas compras.`, 400);
  }
  return proveedor;
}
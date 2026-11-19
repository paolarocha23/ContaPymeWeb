import * as repo from '../repositories/categoriaRepository.js';
import { AppError } from '../utils/http.js';
import { validarCategoria, validarEstatus, parseId, normalizarFiltros } from '../validators/categoriaValidator.js';

async function obtenerOFallar(id) {
  const categoria = await repo.findById(id);
  if (!categoria) throw new AppError('Categoría no encontrada.', 404);
  return categoria;
}

export function listar(query, empresaId = null) {
  return repo.list(normalizarFiltros(query), empresaId);
}

export async function estadisticas(empresaId = null) {
  return repo.stats(empresaId);
}

export async function obtener(idRaw) {
  return obtenerOFallar(parseId(idRaw));
}

/** RDF0601 – nace activa */
export async function crear(body, empresaId = 1) {
  const datos = validarCategoria(body);

  if (await repo.findByNombre(datos.nombre, null, empresaId)) {
    throw new AppError(`Ya existe una categoría llamada "${datos.nombre}".`, 409);
  }

  return repo.insert(datos, empresaId);
}

/** RDF0602 / RN-20 – el id nunca se modifica */
export async function actualizar(idRaw, body, empresaId = null) {
  const id = parseId(idRaw);
  const anterior = await obtenerOFallar(id);
  const datos = validarCategoria(body);

  if (await repo.findByNombre(datos.nombre, id, empresaId || anterior.empresa_id)) {
    throw new AppError(`Ya existe otra categoría llamada "${datos.nombre}".`, 409);
  }

  const actual = await repo.update(id, datos);
  return { anterior, actual };
}

/** RDF0603 / RN-19 – no se desactiva si tiene productos o servicios asociados */
export async function cambiarEstatus(idRaw, body) {
  const id = parseId(idRaw);
  const estatus = validarEstatus(body);
  const categoria = await obtenerOFallar(id);

  if (Number(categoria.estatus) === estatus) {
    return { categoria, cambio: false };
  }

  if (estatus === 0) {
    const asociados = await repo.contarProductos(id);
    if (asociados > 0) {
      throw new AppError(
        `No se puede desactivar la categoría "${categoria.nombre}" porque tiene ${asociados} producto(s) o servicio(s) asociado(s).`,
        409,
        { code: 'CATEGORIA_EN_USO', asociados }
      );
    }
  }

  await repo.updateStatus(id, estatus);
  return { categoria: { ...categoria, estatus }, cambio: true };
}

/** Lo usa el módulo de productos: solo se puede asignar una categoría existente y activa. */
export async function obtenerCategoriaActiva(idRaw) {
  const categoria = await obtenerOFallar(parseId(idRaw));
  if (Number(categoria.estatus) !== 1) {
    throw new AppError(
      `La categoría "${categoria.nombre}" está inactiva. Elige una categoría activa.`,
      409
    );
  }
  return categoria;
}

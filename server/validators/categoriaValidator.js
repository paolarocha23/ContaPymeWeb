import { AppError } from '../utils/http.js';

export const MAX_NOMBRE = 80;

/** Valida y normaliza los datos al registrar o modificar una categoría. */
export function validarCategoria(body = {}) {
  const errors = {};
  const data = {};

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim().replace(/\s+/g, ' ') : '';
  if (!nombre) errors.nombre = 'El nombre de la categoría es obligatorio.';
  else if (nombre.length > MAX_NOMBRE) {
    errors.nombre = `El nombre no puede tener más de ${MAX_NOMBRE} caracteres.`;
  } else data.nombre = nombre;

  // La descripción es opcional; se conservan los saltos de línea.
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  data.descripcion = descripcion || null;

  if (Object.keys(errors).length > 0) {
    throw new AppError(Object.values(errors)[0], 400, errors);
  }
  return data;
}

/** Acepta { estatus: 1|0 } o { activo: true|false } y devuelve 1 o 0. */
export function validarEstatus(body = {}) {
  const raw = body.estatus ?? body.activo;
  if (raw === 1 || raw === '1' || raw === true) return 1;
  if (raw === 0 || raw === '0' || raw === false) return 0;
  throw new AppError('El estatus debe ser 1 (activo) o 0 (inactivo).', 400);
}

/** Acepta el id numérico (12) o el código visible (CAT-0012). */
export function parseId(value) {
  const codigo = /^CAT-(\d+)$/i.exec(String(value).trim());
  const id = Number(codigo ? codigo[1] : value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Identificador de categoría no válido.', 400);
  }
  return id;
}

/** Normaliza los filtros de consulta. Acepta "q" (estándar) o "search" (compatibilidad). */
export function normalizarFiltros(query = {}) {
  const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const estatus = query.estatus === '1' ? 1 : query.estatus === '0' ? 0 : undefined;
  return { q: texto(query.q) ?? texto(query.search), estatus };
}

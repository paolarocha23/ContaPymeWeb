import { AppError } from '../utils/http.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//campo, etiqueta para el mensaje, longitud máxima, obligatorio
const CAMPOS_TEXTO = [
  ['nombre_cliente', 'nombre', 80, true],
  ['apellido_paterno', 'apellido paterno', 80, true],
  ['apellido_materno', 'apellido materno', 80, false],
  ['calle', 'calle', 120, true],
  ['num_exterior', 'número exterior', 15, true],
  ['colonia', 'colonia', 100, true],
  ['ciudad', 'ciudad', 80, true],
  ['estado', 'estado', 60, true]
];

//Limpia campos de texto: elimina espacios al inicio y final, y reemplaza múltiples espacios por uno solo. Devuelve cadena vacía si no es string. 
const limpiarTexto = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');


//Se encarga de validar y normalizar los datos cuando se registra o modifica un cliente.
export function validarCliente(body = {}) {
  const errors = {};
  const data = {};

  for (const [campo, etiqueta, max, obligatorio] of CAMPOS_TEXTO) {
    const valor = limpiarTexto(body[campo]);
    if (!valor) {
      if (obligatorio) errors[campo] = `El campo ${etiqueta} es obligatorio.`;
      data[campo] = null;
    } else if (valor.length > max) {
      errors[campo] = `El campo ${etiqueta} no puede superar ${max} caracteres.`;
    } else {
      data[campo] = valor;
    }
  }

  const cp = String(body.codigo_postal ?? '').trim();
  if (!/^\d{5}$/.test(cp)) errors.codigo_postal = 'El código postal debe tener 5 dígitos.';
  else data.codigo_postal = cp;

  const telefono = String(body.telefono ?? '').replace(/[\s\-()]/g, '');
  if (!/^\d{10}$/.test(telefono)) errors.telefono = 'El teléfono debe tener 10 dígitos.';
  else data.telefono = telefono;

  const correo = String(body.correo ?? '').trim().toLowerCase();
  if (!CORREO.test(correo) || correo.length > 120) errors.correo = 'El correo no es válido.';
  else data.correo = correo;

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

/** Acepta el id numérico (12) o el código visible (C-0012). */
export function parseId(value) {
  const codigo = /^C-(\d+)$/i.exec(String(value).trim());
  const id = Number(codigo ? codigo[1] : value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('El identificador del cliente no es válido.', 400);
  return id;
}

/** Normaliza los filtros de consulta. Ignora valores desconocidos. */
export function normalizarFiltros(query = {}) {
  const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const estatus = query.estatus === '1' ? 1 : query.estatus === '0' ? 0 : undefined;
  const adeudo = ['con', 'sin'].includes(query.adeudo) ? query.adeudo : undefined;
  return {
    q: texto(query.q),
    estatus,
    ciudad: texto(query.ciudad),
    estado: texto(query.estado),
    colonia: texto(query.colonia),
    adeudo
  };
}
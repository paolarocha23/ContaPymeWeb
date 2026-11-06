import { AppError } from '../utils/http.js';

const TIPOS = ['producto', 'servicio'];

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

function validarNumero(valor, campo, { entero = false } = {}) {
  const n = Number(valor);

  if (valor === '' || valor === null || valor === undefined || !Number.isFinite(n) || n < 0 || (entero && !Number.isInteger(n))) {
    throw new AppError(
      `El campo ${campo} debe ser ${entero ? 'un número entero' : 'un número'} mayor o igual a cero.`,
      400
    );
  }

  return n;
}

export function parseId(valor) {
  const limpio = String(valor ?? '').trim().replace(/^PRD-/i, '');
  const id = Number(limpio);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('El identificador del producto no es válido.', 400);
  }

  return id;
}

// RF0701 / RF0703: el id_producto nunca se lee del body (el identificador no se modifica).
export function validarProducto(body = {}) {
  const codigo = texto(body.codigo);
  const nombre = texto(body.nombre);
  const descripcion = texto(body.descripcion);
  const tipo = texto(body.tipo).toLowerCase();
  const unidad_medida = texto(body.unidad_medida);

  if (!codigo) throw new AppError('El código es obligatorio.', 400);
  if (!nombre) throw new AppError('El nombre es obligatorio.', 400);
  if (!TIPOS.includes(tipo)) throw new AppError('El tipo debe ser producto o servicio.', 400);
  if (!unidad_medida) throw new AppError('La unidad de medida es obligatoria.', 400);

  const id_categoria = Number(body.id_categoria);
  if (!Number.isInteger(id_categoria) || id_categoria <= 0) {
    throw new AppError('Debes seleccionar una categoría válida.', 400);
  }

  const precio_compra = validarNumero(body.precio_compra, 'precio de compra');
  const precio_venta = validarNumero(body.precio_venta, 'precio de venta');

  // Stock y stock mínimo solo existen para productos que manejan inventario.
  let stock = null;
  let stock_minimo = null;

  if (tipo === 'producto') {
    stock = validarNumero(body.stock, 'stock', { entero: true });
    stock_minimo = validarNumero(body.stock_minimo, 'stock mínimo', { entero: true });
  }

  return {
    codigo, nombre, descripcion: descripcion || null, tipo, id_categoria,
    unidad_medida, precio_compra, precio_venta, stock, stock_minimo
  };
}

export function normalizarFiltros(query = {}) {
  const filtros = {};

  if (query.q) filtros.q = texto(query.q);

  if (query.estatus !== undefined && query.estatus !== '') {
    if (!['0', '1'].includes(String(query.estatus))) {
      throw new AppError('El filtro de estatus no es válido.', 400);
    }
    filtros.estatus = Number(query.estatus);
  }

  if (query.id_categoria) {
    const id = Number(query.id_categoria);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('La categoría seleccionada no es válida.', 400);
    }
    filtros.id_categoria = id;
  }

  if (query.tipo) {
    const tipo = texto(query.tipo).toLowerCase();
    if (!TIPOS.includes(tipo)) {
      throw new AppError('El tipo debe ser producto o servicio.', 400);
    }
    filtros.tipo = tipo;
  }

  return filtros;
}

export function validarEstatus(body = {}) {
  const valor = body.estatus;
  const estatus = Number(valor);

  if (valor === '' || valor === null || valor === undefined || ![0, 1].includes(estatus)) {
    throw new AppError('El estatus debe ser 0 o 1.', 400);
  }

  return estatus;
}

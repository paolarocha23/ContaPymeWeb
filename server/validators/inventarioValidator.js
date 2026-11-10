import { AppError } from '../utils/http.js';
import { parseId } from './productoValidator.js';

export const TIPOS_MOVIMIENTO = ['entrada', 'salida', 'ajuste'];
const ESTADOS_STOCK = ['disponible', 'bajo', 'sin_stock'];

const MAX_EXISTENCIA = 999999999;
const LIMITE_DEFAULT = 50;
const LIMITE_MAX = 200;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// El catálogo de productos maneja stock entero (productoValidator), aquí se mantiene el mismo criterio.
function validarCantidad(valor, { permitirCero = false } = {}) {
  const n = Number(valor);
  const vacio = valor === '' || valor === null || valor === undefined || typeof valor === 'boolean';
  const fueraDeRango = permitirCero ? n < 0 : n <= 0;

  if (vacio || !Number.isInteger(n) || fueraDeRango || n > MAX_EXISTENCIA) {
    throw new AppError(
      permitirCero
        ? 'La existencia real debe ser un número entero mayor o igual a cero.'
        : 'La cantidad debe ser un número entero mayor a cero.',
      400
    );
  }

  return n;
}

function validarMotivo(valor) {
  const motivo = texto(valor);

  if (!motivo) throw new AppError('El motivo es obligatorio.', 400);
  if (motivo.length > 255) throw new AppError('El motivo no puede exceder 255 caracteres.', 400);

  return motivo;
}

// RDF0801 / RDF0802 / RDF0803
// entrada y salida reciben "cantidad"; ajuste recibe "existencia_real" (conteo físico).
export function validarMovimiento(body = {}, tipo) {
  const id_producto = parseId(body.id_producto);
  const motivo = validarMotivo(body.motivo);

  const cantidad = tipo === 'ajuste'
    ? validarCantidad(body.existencia_real, { permitirCero: true })
    : validarCantidad(body.cantidad);

  return { id_producto, cantidad, motivo };
}

function validarFecha(valor, campo) {
  const f = texto(valor);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || Number.isNaN(Date.parse(f))) {
    throw new AppError(`La fecha ${campo} no es válida (use AAAA-MM-DD).`, 400);
  }

  return f;
}

// RDF0804 – existencias
export function normalizarFiltrosExistencias(query = {}) {
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

  if (query.estado) {
    const estado = texto(query.estado).toLowerCase();
    if (!ESTADOS_STOCK.includes(estado)) {
      throw new AppError('El estado de existencia debe ser disponible, bajo o sin_stock.', 400);
    }
    filtros.estado = estado;
  }

  return filtros;
}

// RDF0804 – movimientos
export function normalizarFiltrosMovimientos(query = {}) {
  const filtros = {};

  if (query.q) filtros.q = texto(query.q);
  if (query.id_producto) filtros.id_producto = parseId(query.id_producto);

  if (query.tipo_movimiento) {
    const tipo = texto(query.tipo_movimiento).toLowerCase();
    if (!TIPOS_MOVIMIENTO.includes(tipo)) {
      throw new AppError('El tipo de movimiento debe ser entrada, salida o ajuste.', 400);
    }
    filtros.tipo_movimiento = tipo;
  }

  if (query.origen) {
    const origen = texto(query.origen).toLowerCase();
    if (origen.length > 17) throw new AppError('El origen no es válido.', 400);
    filtros.origen = origen;
  }

  if (query.desde) filtros.desde = validarFecha(query.desde, 'inicial');
  if (query.hasta) filtros.hasta = validarFecha(query.hasta, 'final');

  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw new AppError('La fecha inicial no puede ser posterior a la final.', 400);
  }

  const limite = query.limite ? Number(query.limite) : LIMITE_DEFAULT;
  const pagina = query.pagina ? Number(query.pagina) : 1;

  if (!Number.isInteger(limite) || limite <= 0 || limite > LIMITE_MAX) {
    throw new AppError(`El límite debe estar entre 1 y ${LIMITE_MAX}.`, 400);
  }
  if (!Number.isInteger(pagina) || pagina <= 0) {
    throw new AppError('La página no es válida.', 400);
  }

  filtros.limite = limite;
  filtros.pagina = pagina;

  return filtros;
}
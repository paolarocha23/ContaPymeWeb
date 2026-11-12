import { AppError } from '../utils/http.js';

export const ORIGENES = ['venta', 'cobro', 'otro'];
export const FORMAS_PAGO = ['efectivo', 'tarjeta'];
export const ESTATUS = ['activo', 'cancelado'];

const MAX_MONTO = 9999999999.99; // numeric(12,2)

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const pad = (n) => String(n).padStart(2, '0');

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function parseId(valor) {
  const limpio = String(valor ?? '').trim().replace(/^ING-/i, '');
  const id = Number(limpio);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('El identificador del ingreso no es válido.', 400);
  }

  return id;
}

// Acepta AAAA-MM-DD (o un ISO completo, del que se toma la fecha).
function validarFecha(valor, campo = 'fecha') {
  const f = texto(valor).slice(0, 10);
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(f);
  const [y, m, d] = f.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);

  if (!valida || dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    throw new AppError(`La ${campo} no es válida (use AAAA-MM-DD).`, 400);
  }

  return f;
}

function validarMonto(valor) {
  const n = Number(valor);
  const vacio = valor === '' || valor === null || valor === undefined || typeof valor === 'boolean';
  const dosDecimales = Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

  if (vacio || !Number.isFinite(n) || n <= 0 || n > MAX_MONTO || !dosDecimales) {
    throw new AppError('El monto debe ser un número mayor a cero con máximo dos decimales.', 400);
  }

  return Math.round(n * 100) / 100;
}

// RDF1101 / RDF1102: el id_ingreso, id_usuario y estatus nunca se leen del body.
// Desde la pantalla solo se capturan ingresos manuales (origen "otro"); los de
// venta o cobro los genera el sistema al registrar esas operaciones.
export function validarIngreso(body = {}) {
  const concepto = texto(body.concepto);
  const forma_pago = texto(body.forma_pago).toLowerCase();

  if (!concepto) throw new AppError('El concepto es obligatorio.', 400);
  if (concepto.length > 255) throw new AppError('El concepto no puede exceder 255 caracteres.', 400);

  const id_categoria = Number(body.id_categoria);
  if (!Number.isInteger(id_categoria) || id_categoria <= 0) {
    throw new AppError('Debes seleccionar una categoría válida.', 400);
  }

  const monto = validarMonto(body.monto);

  if (!FORMAS_PAGO.includes(forma_pago)) {
    throw new AppError('La forma de pago debe ser efectivo o tarjeta.', 400);
  }

  if (body.origen !== undefined && body.origen !== null && body.origen !== '') {
    const origen = texto(body.origen).toLowerCase();

    if (!ORIGENES.includes(origen)) {
      throw new AppError('El origen debe ser venta, cobro u otro.', 400);
    }
    if (origen !== 'otro') {
      throw new AppError(
        'Los ingresos por venta o cobro se generan automáticamente al registrar esa operación. Aquí solo se registran ingresos con origen "otro".',
        400
      );
    }
  }

  let fecha = null; // null = fecha y hora actuales
  if (body.fecha !== undefined && body.fecha !== null && body.fecha !== '') {
    fecha = validarFecha(body.fecha);
    if (fecha > hoy()) throw new AppError('La fecha del ingreso no puede ser futura.', 400);
  }

  return { concepto, id_categoria, fecha, monto, forma_pago, origen: 'otro' };
}

// RDF1103
export function normalizarFiltros(query = {}) {
  const filtros = {};

  if (query.q) filtros.q = texto(query.q);

  if (query.desde) filtros.desde = validarFecha(query.desde, 'fecha inicial');
  if (query.hasta) filtros.hasta = validarFecha(query.hasta, 'fecha final');

  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw new AppError('La fecha inicial no puede ser posterior a la final.', 400);
  }

  if (query.id_categoria) {
    const id = Number(query.id_categoria);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('La categoría seleccionada no es válida.', 400);
    }
    filtros.id_categoria = id;
  }

  if (query.origen) {
    const origen = texto(query.origen).toLowerCase();
    if (!ORIGENES.includes(origen)) throw new AppError('El origen debe ser venta, cobro u otro.', 400);
    filtros.origen = origen;
  }

  if (query.forma_pago) {
    const forma = texto(query.forma_pago).toLowerCase();
    if (!FORMAS_PAGO.includes(forma)) throw new AppError('La forma de pago debe ser efectivo o tarjeta.', 400);
    filtros.forma_pago = forma;
  }

  if (query.estatus) {
    const estatus = texto(query.estatus).toLowerCase();
    if (!ESTATUS.includes(estatus)) throw new AppError('El estatus debe ser activo o cancelado.', 400);
    filtros.estatus = estatus;
  }

  return filtros;
}

// RDF1105: el motivo es opcional (el ingreso no tiene columna para guardarlo; queda en bitácora).
export function validarMotivo(body = {}) {
  const motivo = texto(body.motivo);

  if (motivo.length > 255) throw new AppError('El motivo no puede exceder 255 caracteres.', 400);

  return motivo || null;
}
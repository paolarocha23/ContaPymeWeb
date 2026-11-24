import { AppError } from '../utils/http.js';

// RF09
export const FORMAS_PAGO = ['efectivo', 'tarjeta'];
export const CONDICIONES_PAGO = ['contado', 'credito'];

// ⚠️ Deben coincidir con los valores de tu BD (el default de la columna es 'pendiente_pago').
// Si tu CHECK usa otros nombres, cámbialos SOLO aquí.
export const ESTATUS = {
  PENDIENTE: 'pendiente_pago',
  PARCIAL: 'pago_parcial',
  PAGADA: 'pagada',
  CANCELADA: 'cancelada'
};
export const ESTATUS_VENTA = Object.values(ESTATUS);
const ALIAS_ESTATUS = { pendiente: ESTATUS.PENDIENTE, parcial: ESTATUS.PARCIAL, pagado: ESTATUS.PAGADA };

const MAX_MONTO = 9999999999.99;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const pad = (n) => String(n).padStart(2, '0');

export const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Un mes exacto a partir de hoy (31 ene -> 28/29 feb). */
export const unMesDespues = () => {
  const d = new Date();
  const dia = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== dia) d.setDate(0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const calcularEstatus = (total, pagado) => {
  if (pagado >= total) return ESTATUS.PAGADA;
  if (pagado > 0) return ESTATUS.PARCIAL;
  return ESTATUS.PENDIENTE;
};

const fechaValida = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

export function parseId(valor) {
  const limpio = String(valor ?? '').trim().replace(/^V(EN)?-/i, '');
  const id = Number(limpio);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('El identificador de la venta no es válido.', 400);
  }
  return id;
}

export function validarFiltros(query = {}) {
  const q = texto(query.q || query.search);
  let estatus = texto(query.estatus).toLowerCase();
  estatus = ALIAS_ESTATUS[estatus] || estatus;
  const condiciones_pago = texto(query.condiciones_pago).toLowerCase();
  const forma_pago = texto(query.forma_pago).toLowerCase();
  const desde = texto(query.desde || query.fecha_inicio).slice(0, 10);
  const hasta = texto(query.hasta || query.fecha_fin).slice(0, 10);
  const id_cliente = query.id_cliente ? Number(query.id_cliente) : null;
  const id_usuario = query.id_usuario ? Number(query.id_usuario) : null;

  return {
    q: q || null,
    estatus: ESTATUS_VENTA.includes(estatus) ? estatus : null,
    condiciones_pago: CONDICIONES_PAGO.includes(condiciones_pago) ? condiciones_pago : null,
    forma_pago: FORMAS_PAGO.includes(forma_pago) ? forma_pago : null,
    desde: fechaValida(desde) ? desde : null,
    hasta: fechaValida(hasta) ? hasta : null,
    id_cliente: id_cliente && id_cliente > 0 ? id_cliente : null,
    id_usuario: id_usuario && id_usuario > 0 ? id_usuario : null,
    limite: Math.max(1, Math.min(100, Number(query.limite) || 50)),
    pagina: Math.max(1, Number(query.pagina) || 1)
  };
}

export function validarVenta(body = {}) {
  const forma_pago = texto(body.forma_pago).toLowerCase();
  const condiciones_pago = texto(body.condiciones_pago).toLowerCase();
  const observaciones = texto(body.observaciones) || null;

  let id_cliente = null;
  if (body.id_cliente !== undefined && body.id_cliente !== null && body.id_cliente !== '') {
    id_cliente = Number(body.id_cliente);
    if (!Number.isInteger(id_cliente) || id_cliente <= 0) {
      throw new AppError('El cliente seleccionado no es válido.', 400);
    }
  }

  if (!FORMAS_PAGO.includes(forma_pago)) {
    throw new AppError(`Forma de pago inválida. Opciones: ${FORMAS_PAGO.join(', ')}`, 400);
  }
  if (!CONDICIONES_PAGO.includes(condiciones_pago)) {
    throw new AppError(`Condición de pago inválida. Opciones: ${CONDICIONES_PAGO.join(', ')}`, 400);
  }

  // Cliente obligatorio solo a crédito (el saldo pendiente se valida en el service)
  if (condiciones_pago === 'credito' && !id_cliente) {
    throw new AppError('Para ventas a crédito es obligatorio seleccionar un cliente.', 400);
  }

  // Vencimiento: solo crédito, por defecto un mes
  let fecha_vencimiento = null;
  if (condiciones_pago === 'credito') {
    const fv = texto(body.fecha_vencimiento).slice(0, 10);
    if (fv) {
      if (!fechaValida(fv)) {
        throw new AppError('La fecha de vencimiento no tiene un formato válido (AAAA-MM-DD).', 400);
      }
      if (fv < hoyISO()) {
        throw new AppError('La fecha de vencimiento no puede ser anterior a hoy.', 400);
      }
      fecha_vencimiento = fv;
    } else {
      fecha_vencimiento = unMesDespues();
    }
  }

  const items = Array.isArray(body.items) ? body.items : (Array.isArray(body.detalles) ? body.detalles : []);
  if (items.length === 0) {
    throw new AppError('La venta debe incluir al menos un producto o servicio.', 400);
  }

  // El precio del cliente se ignora: siempre se usa el del catálogo. Se unifican renglones repetidos.
  const mapa = new Map();
  items.forEach((it, idx) => {
    const id_producto = Number(it.id_producto);
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(id_producto) || id_producto <= 0) {
      throw new AppError(`El producto en la línea ${idx + 1} no tiene un ID válido.`, 400);
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new AppError(`La cantidad en la línea ${idx + 1} debe ser mayor a 0.`, 400);
    }
    mapa.set(id_producto, redondear((mapa.get(id_producto) || 0) + cantidad));
  });
  const itemsValidados = [...mapa].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));

  let monto_pagado = 0;
  if (condiciones_pago === 'credito' && body.monto_pagado !== undefined && body.monto_pagado !== null && body.monto_pagado !== '') {
    const mp = Number(body.monto_pagado);
    if (!Number.isFinite(mp) || mp < 0 || mp > MAX_MONTO) {
      throw new AppError('El monto pagado no es válido.', 400);
    }
    monto_pagado = redondear(mp);
  }

  return { id_cliente, forma_pago, condiciones_pago, fecha_vencimiento, monto_pagado, observaciones, items: itemsValidados, MAX_MONTO };
}

export function validarDevolucion(body = {}) {
  const tipo = texto(body.tipo).toLowerCase() === 'total' ? 'total' : 'parcial';
  const observaciones = texto(body.observaciones || body.motivo) || null;
  let items = [];

  if (tipo === 'parcial') {
    const lista = Array.isArray(body.items) ? body.items : [];
    if (lista.length === 0) {
      throw new AppError('Indique al menos un producto a devolver.', 400);
    }
    const mapa = new Map();
    lista.forEach((it, idx) => {
      const id_producto = Number(it.id_producto);
      const cantidad = Number(it.cantidad);
      if (!Number.isInteger(id_producto) || id_producto <= 0) {
        throw new AppError(`El producto en la línea ${idx + 1} no es válido.`, 400);
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new AppError(`La cantidad a devolver en la línea ${idx + 1} debe ser mayor a 0.`, 400);
      }
      mapa.set(id_producto, redondear((mapa.get(id_producto) || 0) + cantidad));
    });
    items = [...mapa].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
  }

  return { tipo, observaciones, items };
}

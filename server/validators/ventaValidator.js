import { AppError } from '../utils/http.js';

export const FORMAS_PAGO = ['efectivo', 'tarjeta', 'transfer'];
export const CONDICIONES_PAGO = ['contado', 'credito'];
export const ESTATUS_VENTA = ['pagada', 'parcial', 'pendiente', 'cancelada'];

const MAX_MONTO = 9999999999.99;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const pad = (n) => String(n).padStart(2, '0');

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
  const estatus = texto(query.estatus).toLowerCase();
  const condiciones_pago = texto(query.condiciones_pago).toLowerCase();
  const forma_pago = texto(query.forma_pago).toLowerCase();
  const desde = texto(query.desde || query.fecha_inicio).slice(0, 10);
  const hasta = texto(query.hasta || query.fecha_fin).slice(0, 10);
  const id_cliente = query.id_cliente ? Number(query.id_cliente) : null;

  return {
    q: q || null,
    estatus: estatus && estatus !== 'todas' ? estatus : null,
    condiciones_pago: condiciones_pago && condiciones_pago !== 'todas' ? condiciones_pago : null,
    forma_pago: forma_pago && forma_pago !== 'todas' ? forma_pago : null,
    desde: /^\d{4}-\d{2}-\d{2}$/.test(desde) ? desde : null,
    hasta: /^\d{4}-\d{2}-\d{2}$/.test(hasta) ? hasta : null,
    id_cliente: id_cliente && id_cliente > 0 ? id_cliente : null,
    limite: Math.max(1, Math.min(100, Number(query.limite) || 50)),
    pagina: Math.max(1, Number(query.pagina) || 1)
  };
}

export function validarVenta(body = {}) {
  const forma_pago = texto(body.forma_pago).toLowerCase();
  const condiciones_pago = texto(body.condiciones_pago).toLowerCase();
  const id_cliente = body.id_cliente ? Number(body.id_cliente) : null;
  const observaciones = texto(body.observaciones) || null;

  if (!FORMAS_PAGO.includes(forma_pago)) {
    throw new AppError(`Forma de pago inválida. Opciones: ${FORMAS_PAGO.join(', ')}`, 400);
  }

  if (!CONDICIONES_PAGO.includes(condiciones_pago)) {
    throw new AppError(`Condición de pago inválida. Opciones: ${CONDICIONES_PAGO.join(', ')}`, 400);
  }

  if (condiciones_pago === 'credito' && (!id_cliente || id_cliente <= 0)) {
    throw new AppError('Para ventas a crédito es obligatorio seleccionar un cliente.', 400);
  }

  let fecha_vencimiento = null;
  if (condiciones_pago === 'credito') {
    if (body.fecha_vencimiento) {
      const fv = texto(body.fecha_vencimiento).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fv)) {
        throw new AppError('La fecha de vencimiento no tiene un formato válido (AAAA-MM-DD).', 400);
      }
      fecha_vencimiento = fv;
    } else {
      // Default a 30 días
      const d = new Date();
      d.setDate(d.getDate() + 30);
      fecha_vencimiento = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }

  const items = Array.isArray(body.items) ? body.items : (Array.isArray(body.detalles) ? body.detalles : []);
  if (!items || items.length === 0) {
    throw new AppError('La venta debe incluir al menos un producto o servicio.', 400);
  }

  const itemsValidados = items.map((it, idx) => {
    const id_producto = Number(it.id_producto);
    const cantidad = Number(it.cantidad);
    const precio_unitario = Number(it.precio_unitario);

    if (!Number.isInteger(id_producto) || id_producto <= 0) {
      throw new AppError(`El producto en la línea ${idx + 1} no tiene un ID válido.`, 400);
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new AppError(`La cantidad en la línea ${idx + 1} debe ser mayor a 0.`, 400);
    }
    if (!Number.isFinite(precio_unitario) || precio_unitario < 0) {
      throw new AppError(`El precio unitario en la línea ${idx + 1} no es válido.`, 400);
    }

    const subtotal = Math.round(cantidad * precio_unitario * 100) / 100;

    return {
      id_producto,
      cantidad,
      precio_unitario: Math.round(precio_unitario * 100) / 100,
      subtotal
    };
  });

  const subtotalTotal = itemsValidados.reduce((acc, it) => acc + it.subtotal, 0);
  const total = Math.round(subtotalTotal * 100) / 100;

  if (total <= 0 || total > MAX_MONTO) {
    throw new AppError('El total de la venta debe ser mayor a cero y no exceder el límite permitido.', 400);
  }

  let monto_pagado = 0;
  if (condiciones_pago === 'contado') {
    // Si es contado se liquida en su totalidad
    monto_pagado = total;
  } else {
    // Crédito: monto_pagado puede ser 0 o un enganche/anticipo
    if (body.monto_pagado !== undefined && body.monto_pagado !== null && body.monto_pagado !== '') {
      const mp = Number(body.monto_pagado);
      if (!Number.isFinite(mp) || mp < 0) {
        throw new AppError('El monto pagado no puede ser negativo.', 400);
      }
      if (mp > total) {
        throw new AppError('El monto pagado no puede superar el total de la venta.', 400);
      }
      monto_pagado = Math.round(mp * 100) / 100;
    } else {
      monto_pagado = 0;
    }
  }

  let estatus = 'pendiente';
  if (monto_pagado >= total) {
    estatus = 'pagada';
  } else if (monto_pagado > 0) {
    estatus = 'parcial';
  } else {
    estatus = 'pendiente';
  }

  return {
    id_cliente,
    forma_pago,
    condiciones_pago,
    fecha_vencimiento,
    subtotal: total,
    total,
    monto_pagado,
    estatus,
    observaciones,
    items: itemsValidados
  };
}

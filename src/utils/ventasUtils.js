import { api } from '../services/api';

/* ---------- Formato ---------- */
export const ESTATUS_LABEL = {
  pendiente_pago: 'Pendiente de pago',
  pago_parcial: 'Pago parcial',
  pagada: 'Pagada',
  cancelada: 'Cancelada'
};
export const etiquetaEstatus = (e) => ESTATUS_LABEL[e] || e || '—';

export const formatMoney = (v) =>
  `$${(Number(v) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Fechas "YYYY-MM-DD" sin desfase de zona horaria. */
export const formatFechaISO = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatFechaHora = (s) =>
  s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Un mes exacto a partir de hoy (RF09), formato AAAA-MM-DD en hora local. */
export const unMesDespues = () => {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const dia = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== dia) d.setDate(0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ---------- Caché de tickets (no toca la base de datos) ---------- */
const MAX_TICKETS = 100;
const cacheKey = () => `contapyme_ventas_ticket_cache_v2_${api.getUser()?.empresa_id || 'default'}`;

const leerCache = () => {
  try {
    const raw = localStorage.getItem(cacheKey());
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
};

const escribirCache = (obj) => {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify(obj));
  } catch (e) {
    console.error('No se pudo guardar el ticket en caché:', e);
  }
};

/** Arma el ticket con los datos requeridos en RF09. */
export function construirTicket(venta) {
  const saldo = Number(venta.saldo_pendiente) || 0;
  const cancelada = venta.estatus === 'cancelada';

  return {
    ticket: venta.codigo,
    id_venta: venta.id_venta,
    fecha: venta.fecha,
    vendedor: venta.nombre_vendedor || venta.vendedor || '—',
    cliente: venta.nombre_cliente || 'Público en general',
    items: (venta.items || []).map((it) => ({
      producto: it.nombre_producto,
      descripcion: `${it.codigo_producto || 'S/C'} · ${it.tipo_producto === 'servicio' ? 'Servicio' : 'Producto'}`,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      subtotal: Number(it.subtotal)
    })),
    subtotal: Number(venta.subtotal ?? venta.total) || 0,
    total: Number(venta.total) || 0,
    monto_pagado: Number(venta.monto_pagado) || 0,
    saldo_pendiente: saldo,
    condiciones_pago: venta.condiciones_pago,
    fecha_vencimiento: venta.fecha_vencimiento || null,
    estatus: cancelada ? 'cancelado' : saldo > 0 ? 'pendiente' : 'pagado',
    forma_pago: venta.forma_pago
  };
}

export function guardarTicket(ticket) {
  if (!ticket?.ticket) return;
  const cache = leerCache();
  cache[ticket.ticket] = { ticket, guardadoEn: Date.now() };

  const ordenado = Object.entries(cache).sort((a, b) => b[1].guardadoEn - a[1].guardadoEn).slice(0, MAX_TICKETS);
  escribirCache(Object.fromEntries(ordenado));
}

export const obtenerTicket = (codigo) => leerCache()[codigo]?.ticket || null;

export function eliminarTicket(codigo) {
  const cache = leerCache();
  delete cache[codigo];
  escribirCache(cache);
}

/** Devuelve el ticket desde caché; si no existe, lo reconstruye con la venta y lo vuelve a cachear. */
export async function resolverTicket(idVenta, codigo) {
  const cacheado = codigo ? obtenerTicket(codigo) : null;
  if (cacheado) return cacheado;

  const resp = await api.getVentaById(idVenta);
  if (!resp.success || !resp.data) throw new Error(resp.message || 'No se pudo generar el ticket.');
  const ticket = construirTicket(resp.data);
  guardarTicket(ticket);
  return ticket;
}

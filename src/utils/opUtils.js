/* Utilidades compartidas por Ventas y Compras */
export const pad = (n) => String(n).padStart(2, '0');
export const pad4 = (n) => String(n).padStart(4, '0');
export const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const formatMoney = (v) =>
  `$${(Number(v) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OPC_FECHA = { day: '2-digit', month: 'short', year: 'numeric' };

/** Timestamp -> "26 oct 2026" (convierte a hora local del navegador) */
export const formatFechaCorta = (s) =>
  s ? new Date(s).toLocaleDateString('es-MX', OPC_FECHA).replace(/\./g, '') : '—';

/** "YYYY-MM-DD" -> "26 oct 2026" (sin desfase de zona horaria) */
export const formatFechaISO = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', OPC_FECHA).replace(/\./g, '');
};

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Un mes exacto a partir de hoy */
export const unMesDespues = () => {
  const d = new Date();
  const dia = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== dia) d.setDate(0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const iniciales = (nombre = '') =>
  String(nombre).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

export const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** 'YYYY-MM' -> { desde, hasta } */
export const rangoMes = (mes) => {
  const [y, m] = mes.split('-').map(Number);
  return { desde: `${y}-${pad(m)}-01`, hasta: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` };
};

/** Últimos 12 meses para el filtro de fecha */
export const mesesOpciones = () => {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const nombre = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    out.push({ val: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, lbl: nombre[0].toUpperCase() + nombre.slice(1) });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
};

export const TONO_ESTATUS = {
  pendiente_pago: 'amber', pendiente: 'amber',
  pago_parcial: 'blue', parcial: 'blue',
  pagada: 'green', pagado: 'green', saldada: 'green', saldado: 'green',
  cancelada: 'red', cancelado: 'red'
};

export const ETIQ_ESTATUS = {
  pendiente_pago: 'Pendiente de pago', pendiente: 'Pendiente de pago',
  pago_parcial: 'Pago parcial', parcial: 'Pago parcial',
  pagada: 'Pagada', cancelada: 'Cancelada'
};

/** Normaliza una lista de respuesta del API: { items, total } o arreglo simple */
export const extraerLista = (res) => {
  const d = res?.data;
  const items = Array.isArray(d) ? d : d?.items || d?.pagos || [];
  return { items, total: d?.total ?? items.length };
};
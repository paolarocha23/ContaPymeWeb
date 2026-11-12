import { formatoPrecio, paginasVisibles } from '../ProductosyServicio/productoMapper';

export { formatoPrecio, paginasVisibles };

const pad = (n) => String(n).padStart(2, '0');

export const formatoIdIngreso = (id) => `ING-${String(id || 0).padStart(4, '0')}`;

const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const hoyISO = () => aISO(new Date());

// Acepta 'AAAA-MM-DD' o un timestamp ISO; devuelve la fecha local 'AAAA-MM-DD'
export const fechaISO = (valor) => (valor ? aISO(new Date(valor)) : '');

// '26 oct 2026'
export function fechaCorta(valor) {
  if (!valor) return '—';

  const d = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(Number(valor.slice(0, 4)), Number(valor.slice(5, 7)) - 1, Number(valor.slice(8, 10)))
    : new Date(valor);

  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}

export const nombreOrigen = (o) => ({ venta: 'Venta', cobro: 'Cobro', otro: 'Otro' }[o] || o);
export const nombreFormaPago = (f) => (f === 'tarjeta' ? 'Tarjeta' : 'Efectivo');

export const esManual = (i) => i.origen === 'otro';
export const esActivo = (i) => i.estatus === 'activo';

// RDF1102: solo se modifican los ingresos manuales activos
export const puedeEditar = (i) => esManual(i) && esActivo(i);

export const ESTATUS_VENTA = {
  pendiente_pago: { label: 'Pendiente de pago', clase: 'amber' },
  pago_parcial: { label: 'Pago parcial', clase: 'blue' },
  pagada: { label: 'Pagada', clase: 'green' },
  cancelada: { label: 'Cancelada', clase: 'gray' }
};

// Últimos 12 meses para el filtro de fecha ('' = todo el historial)
export function opcionesMes(cantidad = 12) {
  const hoy = new Date();
  const opciones = [];

  for (let k = 0; k < cantidad; k += 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - k, 1);
    const texto = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(' de ', ' ');

    opciones.push({
      value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
      label: texto.charAt(0).toUpperCase() + texto.slice(1)
    });
  }

  opciones.push({ value: '', label: 'Todo el historial' });

  return opciones;
}

function mesARango(mes) {
  if (!mes) return {};

  const [y, m] = mes.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();

  return { desde: `${y}-${pad(m)}-01`, hasta: `${y}-${pad(m)}-${pad(ultimo)}` };
}

export function filtrosToApi(f) {
  return {
    q: f.q,
    ...mesARango(f.mes),
    id_categoria: f.id_categoria,
    origen: f.origen,
    forma_pago: f.forma_pago
  };
}

export function ingresoFromApi(ingreso) {
  return {
    ...ingreso,
    id_ingreso: Number(ingreso.id_ingreso),
    id_categoria: Number(ingreso.id_categoria),
    monto: Number(ingreso.monto)
  };
}

export function ingresoToApi(form) {
  return {
    concepto: form.concepto.trim(),
    id_categoria: Number(form.id_categoria),
    fecha: form.fecha || hoyISO(),
    monto: Number(form.monto),
    forma_pago: form.forma_pago,
    origen: 'otro'
  };
}
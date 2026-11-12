export const POR_PAGINA = 8;

const pad = (n) => String(n).padStart(2, '0');

// 'AAAA-MM' del mes en curso (filtro de fecha por defecto)
export const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

// Selector del formulario: solo "otro" es seleccionable (venta y cobro se generan solos)
export const ORIGENES = [
  { value: 'venta', label: 'Venta' },
  { value: 'cobro', label: 'Cobro' },
  { value: 'otro', label: 'Otro (manual)' }
];

export const ORIGENES_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'venta', label: 'Venta' },
  { value: 'cobro', label: 'Cobro' },
  { value: 'otro', label: 'Otro' }
];

export const FORMAS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' }
];

export const FORMAS_PAGO_FILTRO = [
  { value: '', label: 'Todas' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' }
];

export const FILTROS_INICIALES = {
  q: '',
  mes: mesActual(),
  id_categoria: '',
  origen: '',
  forma_pago: ''
};
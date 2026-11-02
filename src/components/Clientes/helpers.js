export const nombreCompleto = (c = {}) =>
  [c.nombre || c.nombre_cliente, c.apellidoPaterno || c.apellido_paterno, c.apellidoMaterno || c.apellido_materno]
    .filter(Boolean)
    .join(' ');

// Iniciales del cliente para el avatar
export const iniciales = (c = {}) => {
  const n = (c.nombre || c.nombre_cliente || '')[0] || '';
  const a = (c.apellidoPaterno || c.apellido_paterno || '')[0] || '';
  return ((n + a) || 'CL').toUpperCase();
};

// Da formato al teléfono estilo: 477 214 55 30
export const formatoTelefono = (t = '') => {
  const limpio = String(t || '').replace(/\D/g, '');
  if (limpio.length === 10) {
    return `${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6, 8)} ${limpio.slice(8)}`;
  }
  return t || '—';
};

// Formato de moneda mexicana: $73,350.00
export const dinero = (n) =>
  Number(n || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

// Prepara las fechas para su conversión
const fechaDe = (valor) => {
  if (!valor) return new Date();
  const str = String(valor).slice(0, 10);
  return new Date(str + 'T00:00:00');
};

// Muestra fechas completas: 14 de febrero de 2026
export const fechaLarga = (valor) =>
  fechaDe(valor).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

// Muestra fechas abreviadas: 12 oct 2026
export const fechaCorta = (valor) =>
  fechaDe(valor).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');

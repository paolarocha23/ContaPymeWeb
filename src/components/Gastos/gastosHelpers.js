export const moneda = (valor) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(valor || 0));

export const fechaFormato = (fecha) => {
  if (!fecha) return '—';
  try {
    const clean = String(fecha).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');
    }
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? fecha : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '');
  } catch {
    return String(fecha);
  }
};

export const hoyISO = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const codigoGasto = (id) => `GAS-${String(id || '').padStart(4, '0')}`;

export const afectaCaja = (gasto) =>
  String(gasto?.forma_pago || '').toLowerCase() === 'efectivo';

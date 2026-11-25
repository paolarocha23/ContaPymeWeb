export const formatoMoneda = (cantidad) =>
  Number(cantidad || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export const fechaActual = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export const fechaCorta = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const mesActual = () => fechaActual().slice(0, 7); // "2026-11"

// "2026-10" -> { fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31' }
export const rangoDeMes = (mes) => {
  if (!mes) return {};
  const [anio, m] = mes.split('-').map(Number);
  const ultimo = new Date(anio, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return { fecha_inicio: `${anio}-${mm}-01`, fecha_fin: `${anio}-${mm}-${String(ultimo).padStart(2, '0')}` };
};

export const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

// Nombre del usuario que se muestra en el aviso del modal.
// Ajusta la clave de localStorage a la que use tu login, o pásalo como prop a CajaView.
export const nombreUsuarioActual = () => {
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || localStorage.getItem('user') || 'null');
    if (!u) return '';
    return [u.nombre ?? u.nombre_usuario, u.apellido_paterno].filter(Boolean).join(' ');
  } catch {
    return '';
  }
};
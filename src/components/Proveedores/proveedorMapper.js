const pad = (n, len = 4) => String(n).padStart(len, '0');

export const codigoProveedor = (id) => `P-${pad(id)}`;

// Iniciales de la empresa para el avatar
export const inicialesEmpresa = (p = {}) => {
  const palabras = String(p.nombreEmpresa || '').trim().split(/\s+/).filter(Boolean);
  return ((palabras[0]?.[0] || '') + (palabras[1]?.[0] || '')).toUpperCase() || 'PR';
};

export const proveedorFromApi = (r) => ({
  id: r.id_proveedor,
  codigo: codigoProveedor(r.id_proveedor),
  nombreEmpresa: r.nombre_empresa,
  nombreContacto: r.nombre_contacto,
  telefono: r.telefono,
  correo: r.correo,
  calle: r.calle,
  colonia: r.colonia,
  ciudad: r.ciudad,
  estado: r.estado,
  activo: Number(r.estatus) === 1
});

export const proveedorToApi = (f) => ({
  nombre_empresa: f.nombreEmpresa,
  nombre_contacto: f.nombreContacto,
  telefono: f.telefono,
  correo: f.correo,
  calle: f.calle,
  colonia: f.colonia,
  ciudad: f.ciudad,
  estado: f.estado
});
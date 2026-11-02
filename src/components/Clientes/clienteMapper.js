import { fechaCorta } from './helpers';

const pad = (n, len = 4) => String(n).padStart(len, '0');

export const codigoCliente = (id) => `C-${pad(id)}`;

export const clienteFromApi = (r) => ({
  id: r.id_cliente,
  codigo: codigoCliente(r.id_cliente),
  nombre: r.nombre_cliente,
  apellidoPaterno: r.apellido_paterno,
  apellidoMaterno: r.apellido_materno || '',
  calle: r.calle,
  numExterior: r.num_exterior,
  colonia: r.colonia,
  cp: r.codigo_postal,
  ciudad: r.ciudad,
  estado: r.estado,
  telefono: r.telefono,
  correo: r.correo,
  fechaRegistro: String(r.fecha_registro).slice(0, 10),
  activo: Number(r.estatus) === 1,
  saldo: Number(r.saldo_pendiente || 0)
});

export const clienteToApi = (f) => ({
  nombre_cliente: f.nombre,
  apellido_paterno: f.apellidoPaterno,
  apellido_materno: f.apellidoMaterno,
  calle: f.calle,
  num_exterior: f.numExterior,
  colonia: f.colonia,
  codigo_postal: f.cp,
  ciudad: f.ciudad,
  estado: f.estado,
  telefono: f.telefono,
  correo: f.correo
});

export const historialFromApi = (h = {}) => ({
  ventas: (h.ventas || []).map((v) => {
    const total = Number(v.total);
    const cobrado = Number(v.monto_pagado || 0);
    return {
      folio: v.codigo || `V-${pad(v.id_venta)}`,
      fecha: fechaCorta(v.fecha),
      producto: v.productos || '—',
      total,
      cobrado,
      estatus: v.estatus || (cobrado >= total ? 'Pagada' : cobrado > 0 ? 'Parcial' : 'Pendiente')
    };
  }),
  cobros: (h.cobros || []).map((c) => ({
    folio: `C-${pad(c.id_cobro)}`,
    fecha: fechaCorta(c.fecha),
    monto: Number(c.monto),
    metodo: c.forma_pago,
    venta: c.venta_codigo || (c.id_venta ? `V-${pad(c.id_venta)}` : '—')
  })),
  resumen: {
    totalVentas: Number(h.resumen?.total_ventas || 0),
    totalCobrado: Number(h.resumen?.total_cobrado || 0),
    saldoPendiente: Number(h.resumen?.saldo_pendiente || 0)
  }
});

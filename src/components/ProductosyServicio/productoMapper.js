export function inicialesProducto(producto) {
  const nombre = producto?.nombre?.trim() || '';

  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('');
}

export function formatoPrecio(valor) {
  return Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN'
  });
}

export function nombreTipo(tipo) {
  return tipo === 'producto' ? 'Producto' : 'Servicio';
}

// En la tabla los servicios muestran "—" (no llevan inventario)
export function formatoStock(producto) {
  return producto.tipo === 'servicio'
    ? '—'
    : Number(producto.stock ?? 0).toLocaleString('es-MX');
}

export const formatoIdProducto = (id) => `PRD-${String(id || 0).padStart(4, '0')}`;

export function esStockBajo(p) {
  return p.tipo === 'producto'
    && p.stock !== null && p.stock_minimo !== null
    && Number(p.stock) <= Number(p.stock_minimo);
}

// Margen sobre el costo: (venta - compra) / compra
export function margenGanancia(p) {
  const compra = Number(p.precio_compra);
  if (!compra) return null;
  return Math.round(((Number(p.precio_venta) - compra) / compra) * 100);
}

export function paginasVisibles(total, actual) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, actual - 1, actual, actual + 1, total]);
  const orden = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1] > 1) salida.push('…');
    salida.push(n);
  });
  return salida;
}

export function productoFromApi(producto) {
  return {
    ...producto,
    id_producto: Number(producto.id_producto),
    id_categoria: Number(producto.id_categoria),
    estatus: Number(producto.estatus),
    precio_compra: Number(producto.precio_compra),
    precio_venta: Number(producto.precio_venta),
    stock: producto.stock === null ? null : Number(producto.stock),
    stock_minimo: producto.stock_minimo === null
      ? null
      : Number(producto.stock_minimo)
  };
}

export function productoToApi(producto) {
  return {
    codigo: producto.codigo.trim(),
    nombre: producto.nombre.trim(),
    descripcion: producto.descripcion?.trim() || null,
    tipo: producto.tipo,
    id_categoria: Number(producto.id_categoria),
    unidad_medida: producto.unidad_medida.trim(),
    precio_compra: Number(producto.precio_compra),
    precio_venta: Number(producto.precio_venta),
    stock: producto.tipo === 'producto'
      ? Number(producto.stock)
      : null,
    stock_minimo: producto.tipo === 'producto'
      ? Number(producto.stock_minimo)
      : null
  };
}

export const numero = (valor) => {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const existenciaFromApi = (p = {}) => ({
  ...p,
  id_producto: numero(p.id_producto),
  stock: numero(p.stock),
  stock_minimo: numero(p.stock_minimo),
  valor_inventario: numero(p.valor_inventario),
  precio_compra: numero(p.precio_compra),
  precio_venta: numero(p.precio_venta)
});

export const movimientoFromApi = (m = {}) => ({
  ...m,
  id_movimiento: numero(m.id_movimiento),
  id_producto: numero(m.id_producto),
  cantidad: numero(m.cantidad),
  existencia_antes: numero(m.existencia_antes),
  existencia_despues: numero(m.existencia_despues)
});

// En ajustes, el backend guarda la diferencia absoluta en cantidad.
// El signo se obtiene comparando la existencia anterior y la resultante.
export const diferenciaMovimiento = (m = {}) => {
  if (m.tipo_movimiento === 'entrada') return Math.abs(numero(m.cantidad));
  if (m.tipo_movimiento === 'salida') return -Math.abs(numero(m.cantidad));
  return numero(m.existencia_despues) - numero(m.existencia_antes);
};

export const estadoExistencia = (p = {}) => {
  if (p.estado_stock) return p.estado_stock;
  const stock = numero(p.stock);
  const minimo = numero(p.stock_minimo);
  if (stock <= 0) return 'sin_stock';
  if (p.stock_minimo !== null && p.stock_minimo !== undefined && stock <= minimo) return 'bajo';
  return 'disponible';
};

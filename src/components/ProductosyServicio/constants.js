export const POR_PAGINA = 8;

export const UNIDADES = [
  'Pieza', 'Servicio', 'Hora', 'Kilogramo', 'Litro', 'Metro', 'Caja', 'Paquete'
];

export const TIPOS_PRODUCTO = [
  { value: 'producto', label: 'Producto' },
  { value: 'servicio', label: 'Servicio' }
];

export const ESTADOS_PRODUCTO = [
  { value: '1', label: 'Activos' },
  { value: '0', label: 'Inactivos' }
];

export const FILTROS_INICIALES = {
  q: '',
  estatus: '',
  id_categoria: '',
  tipo: ''
};
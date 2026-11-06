
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

import {
  productoFromApi,
  productoToApi
} from '../components/ProductosyServicio/productoMapper';

import { FILTROS_INICIALES } from '../components/ProductosyServicio/constants';

/** Lógica de datos del catálogo de productos y servicios. */
export function useProductos() {

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    productos: 0,
    servicios: 0
  });

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const ultimaPeticion = useRef(0);

  // Cargar productos aplicando los filtros
  const cargarLista = useCallback(async (f) => {
    const id = ++ultimaPeticion.current;

    setLoading(true);

    try {
      const res = await api.getProducts(f);

      if (id === ultimaPeticion.current) {
        setProductos((res.data || []).map(productoFromApi));
      }

    } catch (err) {
      if (id === ultimaPeticion.current) {
        setFeedback({
          type: 'error',
          message: err.message
        });
      }

    } finally {
      if (id === ultimaPeticion.current) {
        setLoading(false);
      }
    }
  }, []);

  // Cargar estadísticas
  const cargarResumen = useCallback(async () => {
    try {
      const res = await api.getProductStats();

      setStats(res.data);

    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message
      });
    }
  }, []);

  // Cargar categorías activas para los filtros y el formulario
  const cargarCategorias = useCallback(async () => {
    try {
      const res = await api.getProductCategories();

      setCategorias(res.data || []);

    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message
      });
    }
  }, []);

  // Búsqueda con retraso para evitar consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(
      () => cargarLista(filtros),
      filtros.q ? 300 : 0
    );

    return () => clearTimeout(t);
  }, [filtros, cargarLista]);

  // Cargar estadísticas y categorías al iniciar
  useEffect(() => {
    cargarResumen();
    cargarCategorias();
  }, [cargarResumen, cargarCategorias]);

  // Actualizar los datos después de una operación
  const refrescar = () => {
    return Promise.all([
      cargarLista(filtros),
      cargarResumen(),
      cargarCategorias()
    ]);
  };

  // Registrar producto o servicio
  const crear = async (form) => {
    const res = await api.createProduct(productoToApi(form));

    setFeedback({
      type: 'success',
      message: res.message
    });

    await refrescar();
  };

  // Modificar producto o servicio
  const actualizar = async (id, form) => {
    const res = await api.updateProduct(
      id,
      productoToApi(form)
    );

    setFeedback({
      type: 'success',
      message: res.message
    });

    await refrescar();
  };

  // Activar o desactivar producto o servicio
  const cambiarEstatus = async (producto) => {
    const nuevoEstatus = Number(producto.estatus) === 1 ? 0 : 1;

    const res = await api.toggleProductStatus(
      producto.id_producto,
      nuevoEstatus
    );

    setFeedback({
      type: 'success',
      message: res.message
    });

    await refrescar();
  };

  // Eliminar producto o servicio
  const eliminar = async (id) => {
    const res = await api.deleteProduct(id);

    setFeedback({
      type: 'success',
      message: res.message
    });

    await refrescar();
  };

  // Actualizar filtros
  const actualizarFiltro = (campo, valor) => {
    setFiltros((f) => ({
      ...f,
      [campo]: valor
    }));
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES);
  };

  return {
    productos,
    categorias,
    stats,
    filtros,
    loading,
    feedback,
    setFeedback,
    actualizarFiltro,
    limpiarFiltros,
    crear,
    actualizar,
    cambiarEstatus,
    eliminar
  };
}

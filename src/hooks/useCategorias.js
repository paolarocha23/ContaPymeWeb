import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { categoriaFromApi, categoriaToApi } from '../components/Categorias/categoriaMapper';
import { FILTROS_INICIALES } from '../components/Categorias/constants';

const STATS_VACIAS = { total: 0, activos: 0, inactivos: 0 };

export function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats] = useState(STATS_VACIAS);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  const mostrarError = (err, porDefecto) =>
    setFeedback({ type: 'error', message: err?.message || porDefecto });

  const cargarCategorias = useCallback(async (f) => {
    setLoading(true);
    try {
      const res = await api.getCategories(f);
      setCategorias((res.data || []).map(categoriaFromApi));
    } catch (err) {
      mostrarError(err, 'Error al cargar las categorías.');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarStats = useCallback(async () => {
    try {
      const res = await api.getCategoryStats();
      setStats({ ...STATS_VACIAS, ...res.data });
    } catch {
      /* Las tarjetas quedan en 0 */
    }
  }, []);

  // Retraso al escribir en el buscador para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => cargarCategorias(filtros), filtros.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filtros, cargarCategorias]);

  useEffect(() => {
    cargarStats();
  }, [cargarStats]);

  const refrescar = () => Promise.all([cargarCategorias(filtros), cargarStats()]);

  const actualizarFiltro = (campo, valor) =>
    setFiltros((f) => ({ ...f, [campo]: valor }));
  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  // crear / actualizar relanza el error para que el modal lo capture
  const crear = async (form) => {
    const res = await api.createCategory(categoriaToApi(form));
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
  };

  const actualizar = async (id, form) => {
    const res = await api.updateCategory(id, categoriaToApi(form));
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
  };

  const cambiarEstatus = async (categoria) => {
    const nuevoEstatus = categoria.activo ? 0 : 1;
    const res = await api.toggleCategoryStatus(categoria.id, nuevoEstatus);
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
  };

  return {
    categorias, stats, filtros, loading, feedback,
    setFeedback, actualizarFiltro, limpiarFiltros,
    crear, actualizar, cambiarEstatus,
  };
}

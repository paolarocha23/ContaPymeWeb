import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useCompras() {
  const [compras, setCompras] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    q: '',
    estatus: 'todas',
    condiciones_pago: 'todas',
    desde: '',
    hasta: ''
  });

  const cargarCompras = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [respCompras, respStats] = await Promise.all([
        api.getCompras(filtros),
        api.getComprasStats()
      ]);

      setCompras(respCompras.data?.items || respCompras.data || []);
      setStats(respStats.data || null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las compras.');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarCompras();
  }, [cargarCompras]);

  const actualizarFiltros = (nuevosFiltros) => {
    setFiltros((actuales) => ({
      ...actuales,
      ...nuevosFiltros
    }));
  };

  return {
    compras,
    stats,
    loading,
    error,
    filtros,
    actualizarFiltros,
    recargar: cargarCompras
  };
}

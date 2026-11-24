import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useVentas() {
  const [ventas, setVentas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    q: '',
    estatus: 'todas',
    condiciones_pago: 'todas',
    forma_pago: 'todas',
    desde: '',
    hasta: ''
  });

  const cargarVentas = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [respVentas, respStats] = await Promise.all([
        api.getVentas(filtros),
        api.getVentasStats()
      ]);

      setVentas(respVentas.data?.items || respVentas.data || []);
      setStats(respStats.data || null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las ventas.');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const actualizarFiltros = (nuevosFiltros) => {
    setFiltros((actuales) => ({
      ...actuales,
      ...nuevosFiltros
    }));
  };

  return {
    ventas,
    stats,
    loading,
    error,
    filtros,
    actualizarFiltros,
    recargar: cargarVentas
  };
}

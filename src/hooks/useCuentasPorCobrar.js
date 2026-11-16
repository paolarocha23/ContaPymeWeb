import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useCuentasPorCobrar() {
  const [cuentas, setCuentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    estatus: 'todas',
    busqueda: ''
  });

  const cargarCuentas = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [respuestaCuentas, respuestaResumen] = await Promise.all([
        api.getCuentasPorCobrar(filtros),
        api.getResumenCxc()
      ]);

      setCuentas(respuestaCuentas.data || []);
      setResumen(respuestaResumen.data || null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las cuentas por cobrar.');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  const actualizarFiltros = (nuevosFiltros) => {
    setFiltros((actuales) => ({
      ...actuales,
      ...nuevosFiltros
    }));
  };

  return {
    cuentas,
    resumen,
    loading,
    error,
    filtros,
    actualizarFiltros,
    recargar: cargarCuentas
  };
}

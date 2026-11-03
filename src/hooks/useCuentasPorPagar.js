
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useCuentasPorPagar(filtrosIniciales = {}) {
  const [cuentas, setCuentas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState(filtrosIniciales);

  const cargarCuentas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [respuestaCuentas, respuestaResumen] = await Promise.all([
        api.getCuentasPorPagar(filtros),
        api.getResumenCxp()
      ]);

      setCuentas(respuestaCuentas.data || []);
      setResumen(respuestaResumen.data || null);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las cuentas por pagar.');
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';

export const FILTROS_INICIALES = {
  q: '',
  estatus: 'todas',
  condiciones_pago: 'todas',
  forma_pago: 'todas',
  desde: '',
  hasta: ''
};

const limpiar = (f) => {
  const r = {};
  Object.entries(f).forEach(([k, v]) => {
    if (v !== '' && v !== 'todas' && v !== null && v !== undefined) r[k] = v;
  });
  return r;
};

export function useVentas() {
  const [ventas, setVentas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);
  const [tick, setTick] = useState(0);
  const reqId = useRef(0);

  // Debounce para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setFiltrosAplicados(filtros), 300);
    return () => clearTimeout(t);
  }, [filtros]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');

    Promise.all([api.getVentas(limpiar(filtrosAplicados)), api.getVentasStats()])
      .then(([resVentas, resStats]) => {
        if (id !== reqId.current) return;
        setVentas(resVentas.data?.items || []);
        setStats(resStats.data || null);
      })
      .catch((err) => {
        if (id !== reqId.current) return;
        setError(err.message || 'No se pudieron cargar las ventas.');
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [filtrosAplicados, tick]);

  const actualizarFiltros = useCallback((parcial) => setFiltros((prev) => ({ ...prev, ...parcial })), []);
  const recargar = useCallback(() => setTick((t) => t + 1), []);

  return { ventas, stats, loading, error, filtros, actualizarFiltros, recargar };
}
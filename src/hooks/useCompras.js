import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { rangoMes, mesActual, extraerLista } from '../utils/opUtils';

export const POR_PAGINA = 8;
export const FILTROS_INICIALES = { q: '', id_proveedor: '', estatus: '', mes: '' };

export function useCompras() {
  const [compras, setCompras] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [comprasMes, setComprasMes] = useState(0);
  const [canceladas, setCanceladas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);
  const [tick, setTick] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setAplicados(filtros), 300);
    return () => clearTimeout(t);
  }, [filtros]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');

    const params = { limite: POR_PAGINA, pagina };
    if (aplicados.q) params.q = aplicados.q;
    if (aplicados.id_proveedor) params.id_proveedor = aplicados.id_proveedor;
    if (aplicados.estatus) params.estatus = aplicados.estatus;
    if (aplicados.mes) Object.assign(params, rangoMes(aplicados.mes));

    api.getCompras(params)
      .then((res) => {
        if (id !== reqId.current) return;
        let { items, total: t } = extraerLista(res);
        // Si el servicio devolvió todo el listado, se pagina aquí
        if (items.length > POR_PAGINA) {
          t = items.length;
          items = items.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
        }
        setCompras(items);
        setTotal(t);
      })
      .catch((err) => id === reqId.current && setError(err.message || 'No se pudieron cargar las compras.'))
      .finally(() => id === reqId.current && setLoading(false));
  }, [aplicados, pagina, tick]);

  // Tarjetas superiores
  useEffect(() => {
    const rango = rangoMes(mesActual());
    Promise.all([
      api.getComprasStats(),
      api.getCompras({ ...rango, limite: 1 }),
      api.getCompras({ ...rango, estatus: 'cancelada', limite: 1 }),
      api.getCompras({ estatus: 'cancelada', limite: 1 })
    ])
      .then(([s, mes, canMes, can]) => {
        setStats(s.data || null);
        setComprasMes(Math.max(0, extraerLista(mes).total - extraerLista(canMes).total));
        setCanceladas(extraerLista(can).total);
      })
      .catch(() => { /* no bloquea la vista */ });
  }, [tick]);

  const actualizarFiltros = useCallback((p) => { setFiltros((prev) => ({ ...prev, ...p })); setPagina(1); }, []);
  const limpiarFiltros = useCallback(() => { setFiltros(FILTROS_INICIALES); setPagina(1); }, []);
  const recargar = useCallback(() => setTick((t) => t + 1), []);

  return {
    compras, total, stats, comprasMes, canceladas, loading, error,
    filtros, actualizarFiltros, limpiarFiltros, pagina, setPagina, recargar
  };
}
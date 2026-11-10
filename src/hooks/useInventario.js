import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

import {
  FILTROS_INICIALES,
  MOVIMIENTOS_INICIALES,
  STATS_INICIALES
} from '../components/Inventario/constants';

import {
  existenciaFromApi,
  movimientoFromApi
} from '../components/Inventario/inventarioMapper';

const fechaISO = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function useInventario() {
  const [vista, setVista] = useState('existencias');
  const [existencias, setExistencias] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats] = useState(STATS_INICIALES);
  const [statsMovimientos, setStatsMovimientos] = useState(MOVIMIENTOS_INICIALES);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Peticiones independientes: existencias y movimientos no se cancelan entre sí.
  const requestExistencias = useRef(0);
  const requestMovimientos = useRef(0);

  const cargarExistencias = useCallback(async (f = FILTROS_INICIALES) => {
    const id = ++requestExistencias.current;
    setLoading(true);

    try {
      const res = f.estado === 'bajo'
        ? await api.getInventoryLowStock()
        : await api.getInventory({
            q: f.q,
            id_categoria: f.id_categoria,
            estado: f.estado
          });

      if (id === requestExistencias.current) {
        setExistencias((res.data || []).map(existenciaFromApi));
      }
    } catch (err) {
      if (id === requestExistencias.current) {
        setFeedback({ type: 'error', message: err.message || 'No fue posible cargar las existencias.' });
      }
    } finally {
      if (id === requestExistencias.current) setLoading(false);
    }
  }, []);

  const cargarMovimientos = useCallback(async (f = FILTROS_INICIALES) => {
    const id = ++requestMovimientos.current;
    setLoading(true);

    try {
      const res = await api.getInventoryMovements({
        q: f.q,
        tipo_movimiento: f.tipo_movimiento,
        desde: f.desde,
        hasta: f.hasta,
        pagina: f.pagina,
        limite: f.limite
      });

      if (id === requestMovimientos.current) {
        setMovimientos((res.data?.items || []).map(movimientoFromApi));
        setTotalMovimientos(Number(res.data?.total || 0));
      }
    } catch (err) {
      if (id === requestMovimientos.current) {
        setFeedback({ type: 'error', message: err.message || 'No fue posible cargar los movimientos.' });
      }
    } finally {
      if (id === requestMovimientos.current) setLoading(false);
    }
  }, []);

  const cargarResumen = useCallback(async () => {
    try {
      const res = await api.getInventoryStats();
      setStats({ ...STATS_INICIALES, ...(res.data || {}) });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'No fue posible cargar las estadísticas.' });
    }
  }, []);

  const cargarCategorias = useCallback(async () => {
    try {
      const res = await api.getInventoryCategories();
      setCategorias(res.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'No fue posible cargar las categorías.' });
    }
  }, []);

  const cargarStockBajo = useCallback(async () => {
    try {
      const res = await api.getInventoryLowStock();
      setStockBajo((res.data || []).map(existenciaFromApi));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'No fue posible cargar el stock bajo.' });
    }
  }, []);

  // El backend no tiene endpoint de agregados de movimientos.
  // Se recorren las páginas del periodo de 30 días para mostrar cifras reales.
  const cargarResumenMovimientos = useCallback(async () => {
    try {
      const hoy = new Date();
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() - 29);

      const desde = fechaISO(inicio);
      const hasta = fechaISO(hoy);
      const primera = await api.getInventoryMovements({ desde, hasta, pagina: 1, limite: 200 });
      const total = Number(primera.data?.total || 0);
      const items = [...(primera.data?.items || [])];

      const paginas = Math.ceil(total / 200);
      for (let pagina = 2; pagina <= paginas; pagina += 1) {
        const res = await api.getInventoryMovements({ desde, hasta, pagina, limite: 200 });
        items.push(...(res.data?.items || []));
      }

      setStatsMovimientos({
        entradas: items.filter((m) => m.tipo_movimiento === 'entrada')
          .reduce((suma, m) => suma + Number(m.cantidad || 0), 0),
        salidas: items.filter((m) => m.tipo_movimiento === 'salida')
          .reduce((suma, m) => suma + Number(m.cantidad || 0), 0),
        ajustes: items.filter((m) => m.tipo_movimiento === 'ajuste').length,
        total
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'No fue posible calcular el resumen de movimientos.' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (vista === 'movimientos') cargarMovimientos(filtros);
      else cargarExistencias(filtros);
    }, filtros.q ? 300 : 0);

    return () => clearTimeout(timer);
  }, [vista, filtros, cargarExistencias, cargarMovimientos]);

  useEffect(() => {
    cargarResumen();
    cargarCategorias();
    cargarStockBajo();
    cargarResumenMovimientos();
  }, [cargarResumen, cargarCategorias, cargarStockBajo, cargarResumenMovimientos]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros((actual) => ({
      ...actual,
      [campo]: valor,
      pagina: campo === 'pagina' ? valor : 1
    }));
  };

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista);
    setFiltros(FILTROS_INICIALES);
    setFeedback(null);
  };

  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  const refrescar = async () => {
    await Promise.all([
      cargarExistencias(filtros),
      cargarMovimientos(filtros),
      cargarResumen(),
      cargarStockBajo(),
      cargarResumenMovimientos()
    ]);
  };

  const registrar = async (tipo, datos) => {
    setSaving(true);

    try {
      let res;

      if (tipo === 'entrada') res = await api.createInventoryEntry(datos);
      else if (tipo === 'salida') res = await api.createInventoryExit(datos);
      else res = await api.createInventoryAdjustment(datos);

      setFeedback({
        type: 'success',
        message: res.message || 'Movimiento registrado correctamente.'
      });

      await refrescar();
      return true;
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'No fue posible registrar el movimiento.'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    vista,
    cambiarVista,
    existencias,
    movimientos,
    stockBajo,
    categorias,
    stats,
    statsMovimientos,
    totalMovimientos,
    filtros,
    loading,
    saving,
    feedback,
    setFeedback,
    actualizarFiltro,
    limpiarFiltros,
    registrar,
    refrescar
  };
}

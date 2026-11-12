import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

import {
  ingresoFromApi,
  ingresoToApi,
  filtrosToApi
} from '../components/Ingresos/ingresoMapper';

import { FILTROS_INICIALES } from '../components/Ingresos/constants';

/** Lógica de datos del módulo de ingresos. */
export function useIngresos() {

  const [ingresos, setIngresos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [stats, setStats] = useState({
    total_mes: 0,
    efectivo_mes: 0,
    tarjeta_mes: 0,
    cancelados: 0
  });

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const ultimaPeticion = useRef(0);

  // Cargar ingresos aplicando los filtros
  const cargarLista = useCallback(async (f) => {
    const id = ++ultimaPeticion.current;

    setLoading(true);

    try {
      const res = await api.getIncomes(filtrosToApi(f));

      if (id === ultimaPeticion.current) {
        setIngresos((res.data || []).map(ingresoFromApi));
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
      const res = await api.getIncomeStats();

      setStats(res.data);

    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message
      });
    }
  }, []);

  // Cargar categorías para los filtros y el formulario
  const cargarCategorias = useCallback(async () => {
    try {
      const res = await api.getIncomeCategories();

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

  // Registrar ingreso manual
  const crear = async (form) => {
    const res = await api.createIncome(ingresoToApi(form));

    setFeedback({
      type: 'success',
      message: res.message
    });

    await refrescar();
  };

  // Modificar ingreso manual
  const actualizar = async (id, form) => {
    const res = await api.updateIncome(
      id,
      ingresoToApi(form)
    );

    setFeedback({
      type: 'success',
      message: res.message
    });

    await refrescar();
  };

  // Cancelar ingreso (se conserva el registro y se revierte la caja)
  const cancelar = async (id, motivo = '') => {
    const res = await api.cancelIncome(id, motivo);

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
    ingresos,
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
    cancelar
  };
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { clienteFromApi, clienteToApi } from '../components/Clientes/clienteMapper';
import { FILTROS_INICIALES } from '../components/Clientes/constants';

/**
 * Toda la lógica de datos del catálogo (consulta, filtros, alta, edición, estatus).
 */
export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0, con_adeudo: 0 });
  const [opciones, setOpciones] = useState({ ciudades: [], estados: [], colonias: [] });
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }
  const ultimaPeticion = useRef(0);

  const cargarLista = useCallback(async (f) => {
    const id = ++ultimaPeticion.current;
    setLoading(true);
    try {
      const res = await api.getClients(f);
      if (id === ultimaPeticion.current) setClientes((res.data || []).map(clienteFromApi));
    } catch (err) {
      if (id === ultimaPeticion.current) setFeedback({ type: 'error', message: err.message });
    } finally {
      if (id === ultimaPeticion.current) setLoading(false);
    }
  }, []);

  const cargarResumen = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([api.getClientStats(), api.getClientOptions()]);
      setStats(s.data);
      setOpciones(o.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  }, []);

  // Búsqueda con pequeño retraso para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => cargarLista(filtros), filtros.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filtros, cargarLista]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const refrescar = () => Promise.all([cargarLista(filtros), cargarResumen()]);

  // Las acciones lanzan el error para que el modal lo muestre; el éxito se informa aquí.
  const crear = async (form) => {
    const res = await api.createClient(clienteToApi(form));
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
    return clienteFromApi(res.data);
  };

  const actualizar = async (id, form, activoNuevo, activoActual) => {
    const res = await api.updateClient(id, clienteToApi(form));
    if (activoNuevo !== undefined && activoNuevo !== activoActual) {
      await api.toggleClientStatus(id, activoNuevo ? 1 : 0);
    }
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
    return { ...clienteFromApi(res.data), activo: activoNuevo ?? activoActual };
  };

  const cambiarEstatus = async (cliente) => {
    const res = await api.toggleClientStatus(cliente.id, cliente.activo ? 0 : 1);
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
    return { ...cliente, activo: !cliente.activo };
  };

  const actualizarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  return {
    clientes, stats, opciones, filtros, loading, feedback,
    setFeedback, actualizarFiltro, limpiarFiltros, crear, actualizar, cambiarEstatus
  };
}
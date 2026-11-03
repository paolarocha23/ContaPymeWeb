import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { proveedorFromApi, proveedorToApi } from '../components/Proveedores/proveedorMapper';
import { FILTROS_INICIALES } from '../components/Proveedores/constants';

/** Lógica de datos del catálogo de proveedores (consulta, filtros, alta, edición, estatus). */
export function useProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, inactivos: 0 });
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }
  const ultimaPeticion = useRef(0);

  const cargarLista = useCallback(async (f) => {
    const id = ++ultimaPeticion.current;
    setLoading(true);
    try {
      const res = await api.getSuppliers(f);
      if (id === ultimaPeticion.current) setProveedores((res.data || []).map(proveedorFromApi));
    } catch (err) {
      if (id === ultimaPeticion.current) setFeedback({ type: 'error', message: err.message });
    } finally {
      if (id === ultimaPeticion.current) setLoading(false);
    }
  }, []);

  const cargarResumen = useCallback(async () => {
    try {
      const s = await api.getSupplierStats();
      setStats(s.data);
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
    const res = await api.createSupplier(proveedorToApi(form));
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
    return proveedorFromApi(res.data);
  };

  const actualizar = async (id, form, activoNuevo, activoActual) => {
    const res = await api.updateSupplier(id, proveedorToApi(form));
    if (activoNuevo !== undefined && activoNuevo !== activoActual) {
      await api.toggleSupplierStatus(id, activoNuevo ? 1 : 0);
    }
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
  };

  const cambiarEstatus = async (proveedor) => {
    const res = await api.toggleSupplierStatus(proveedor.id, proveedor.activo ? 0 : 1);
    setFeedback({ type: 'success', message: res.message });
    await refrescar();
  };

  const actualizarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const limpiarFiltros = () => setFiltros(FILTROS_INICIALES);

  return {
    proveedores, stats, filtros, loading, feedback,
    setFeedback, actualizarFiltro, limpiarFiltros, crear, actualizar, cambiarEstatus
  };
}
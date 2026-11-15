import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const useReportes = () => {
    const [reportes, setReportes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filtros, setFiltros] = useState({
        fecha_inicio: '',
        fecha_fin: ''
    });

    // Actualizar filtros de fecha.
    const actualizarFiltros = useCallback((nuevosFiltros) => {
        setFiltros((anteriores) => ({
            ...anteriores,
            ...nuevosFiltros
        }));
    }, []);

    // Consultar el resumen general del backend.
    const cargarReportes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const respuesta = await api.getReportesResumen(filtros);

            if (!respuesta.success) {
                throw new Error(
                    respuesta.message || 'No se pudieron cargar los reportes.'
                );
            }

            setReportes(respuesta.data);
        } catch (err) {
            setError(err.message || 'Error al consultar los reportes.');
            setReportes(null);
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    // Cargar al abrir el módulo y al cambiar los filtros.
    useEffect(() => {
        cargarReportes();
    }, [cargarReportes]);

    // Restablecer filtros.
    const limpiarFiltros = useCallback(() => {
        setFiltros({
            fecha_inicio: '',
            fecha_fin: ''
        });
    }, []);

    return {
        reportes,
        loading,
        error,
        filtros,
        actualizarFiltros,
        limpiarFiltros,
        recargar: cargarReportes
    };
};

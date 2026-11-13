
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export function useCuentasPorPagar(filtrosIniciales = {}) {
    const [cuentas, setCuentas] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState(filtrosIniciales);

    const solicitudActual = useRef(0);

    const cargarCuentas = useCallback(async () => {
        const numeroSolicitud = ++solicitudActual.current;

        setLoading(true);
        setError(null);

        try {
            const [respuestaCuentas, respuestaResumen] =
                await Promise.all([
                    api.getCuentasPorPagar({
                        estatus: filtros.estatus || ''
                    }),
                    api.getResumenCxp()
                ]);

            if (numeroSolicitud !== solicitudActual.current) {
                return;
            }

            setCuentas(respuestaCuentas.data || []);
            setResumen(respuestaResumen.data || null);
        } catch (err) {
            if (numeroSolicitud === solicitudActual.current) {
                setError(
                    err.message ||
                    'No se pudieron cargar las cuentas por pagar.'
                );
                setCuentas([]);
            }
        } finally {
            if (numeroSolicitud === solicitudActual.current) {
                setLoading(false);
            }
        }
    }, [filtros.estatus]);

    useEffect(() => {
        cargarCuentas();

        return () => {
            solicitudActual.current++;
        };
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

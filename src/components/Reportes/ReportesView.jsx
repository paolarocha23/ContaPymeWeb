import React, { useEffect, useMemo, useState } from 'react';
import {
    ShoppingCart,
    ClipboardList,
    Package,
    Wallet,
    FileText,
    BarChart3,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Download,
    RotateCw,
    CalendarDays,
    ChevronDown
} from 'lucide-react';

import { api } from '../../services/api';
import { useReportes } from '../../hooks/useReportes';
import { exportarResumenGeneralExcel } from '../../utils/exportExcel';
import ReportesGraficas from './ReportesGraficas';
import ReportesTablas from './ReportesTablas';
import {
    aISO,
    rangoPeriodo,
    periodoAnterior,
    textoPeriodo,
    construirAnalisis,
    suma,
    CAMPO_FECHADO
} from './reportesAnalisis';
import './reportes.css';

const SECCIONES = [
    { id: 'ventas', nombre: 'Ventas', icono: ShoppingCart, tipos: ['ventas'] },
    { id: 'compras', nombre: 'Compras', icono: ClipboardList, tipos: ['compras'] },
    { id: 'inventario', nombre: 'Inventario', icono: Package, tipos: ['inventario', 'movimientos_inventario'] },
    { id: 'finanzas', nombre: 'Ingresos y gastos', icono: Wallet, tipos: ['ingresos', 'gastos'] },
    { id: 'cuentas', nombre: 'Cuentas por cobrar y pagar', icono: FileText, tipos: ['cuentas_por_cobrar', 'cuentas_por_pagar'] }
];

const NOMBRE_TIPO = {
    inventario: 'Existencias',
    movimientos_inventario: 'Movimientos',
    ingresos: 'Ingresos',
    gastos: 'Gastos',
    cuentas_por_cobrar: 'Por cobrar',
    cuentas_por_pagar: 'Por pagar'
};

const OBTENER_PREVIO = {
    ventas: (f) => api.getReportesDetalleVentas(f),
    compras: (f) => api.getReportesDetalleCompras(f),
    ingresos: (f) => api.getReportesDetalleIngresos(f),
    gastos: (f) => api.getReportesDetalleGastos(f)
};

const ICONOS_KPI = {
    barras: BarChart3,
    lista: ClipboardList,
    cartera: Wallet,
    tendencia: TrendingUp,
    baja: TrendingDown,
    alerta: AlertTriangle
};

const MODOS = [
    { id: 'dia', nombre: 'Día' },
    { id: 'semana', nombre: 'Semana' },
    { id: 'mes', nombre: 'Mes' }
];

export default function ReportesView() {
    const {
        reportes,
        loading,
        error,
        filtros,
        actualizarFiltros,
        limpiarFiltros,
        recargar
    } = useReportes();

    const [seccion, setSeccion] = useState('ventas');
    const [tipo, setTipo] = useState('ventas');
    const [modo, setModo] = useState('mes');
    const [fechaRef, setFechaRef] = useState(aISO(new Date()));
    const [datos, setDatos] = useState({ tipo: null, registros: [], loading: true });
    const [previo, setPrevio] = useState(null);
    const [actualizado, setActualizado] = useState(null);

    const seccionActual = SECCIONES.find((s) => s.id === seccion) || SECCIONES[0];

    const aplicarPeriodo = (nuevoModo, ref) => {
        setModo(nuevoModo);
        setFechaRef(ref);
        actualizarFiltros(rangoPeriodo(nuevoModo, ref));
    };

    // Al entrar, arranca en el mes actual (si no había un filtro ya aplicado)
    useEffect(() => {
        if (!filtros.fecha_inicio && !filtros.fecha_fin) {
            aplicarPeriodo('mes', fechaRef);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!loading && reportes) setActualizado(new Date());
    }, [loading, reportes]);

    // Total del periodo anterior (usa los mismos endpoints de detalle ya existentes)
    useEffect(() => {
        setPrevio(null);
        const obtener = OBTENER_PREVIO[tipo];
        if (!obtener || !filtros.fecha_inicio || !filtros.fecha_fin) return undefined;

        let activo = true;
        const rango = periodoAnterior(modo, filtros.fecha_inicio, filtros.fecha_fin);

        obtener(rango)
            .then((res) => {
                if (!activo || !res || !res.success) return;
                const lista = res.data?.[tipo];
                if (Array.isArray(lista)) setPrevio(suma(lista, CAMPO_FECHADO[tipo]));
            })
            .catch(() => {});

        return () => {
            activo = false;
        };
    }, [tipo, modo, filtros.fecha_inicio, filtros.fecha_fin]);

    const analisis = useMemo(() => {
        const registros = datos.tipo === tipo && !datos.loading ? datos.registros : [];
        return construirAnalisis({
            tipo,
            registros,
            filtros: { fecha_inicio: filtros.fecha_inicio, fecha_fin: filtros.fecha_fin },
            modo,
            previoTotal: previo
        });
    }, [datos, tipo, modo, previo, filtros.fecha_inicio, filtros.fecha_fin]);

    const handleSeccion = (s) => {
        setSeccion(s.id);
        setTipo(s.tipos[0]);
    };

    const handleExportarExcel = () => {
        if (!reportes) return;
        exportarResumenGeneralExcel({
            reportes,
            nombreArchivo: 'Reporte_General_ContaPyme'
        });
    };

    const abrirSelector = (e) => {
        try {
            if (e.target.showPicker) e.target.showPicker();
        } catch {
            /* algunos navegadores no soportan showPicker */
        }
    };

    const alCambiarPeriodo = (e) => {
        const valor = e.target.value;
        if (!valor) return;
        if (modo === 'dia' || modo === 'semana') {
            aplicarPeriodo(modo, valor);
        } else {
            aplicarPeriodo('mes', `${valor}-01`);
        }
    };

    const textoActualizado = actualizado
        ? `Actualizado hoy, ${actualizado.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
        : 'Actualizando...';

    return (
        <div className="rep">
            {/* Título y acciones */}
            <div className="rep-title">
                <div>
                    <h2>Reportes</h2>
                    <p>Consulta ventas, compras, inventario, finanzas y saldos pendientes por día, semana o mes.</p>
                </div>

                <div className="rep-title-actions">
                    <button
                        type="button"
                        className="rep-btn-primary"
                        onClick={handleExportarExcel}
                        disabled={loading || !reportes}
                        title="Exportar resumen a Excel (RDF1606)"
                    >
                        <Download size={17} />
                        Exportar a Excel
                    </button>

                    <span className="rep-updated">
                        <i className="rep-dot green" />
                        {textoActualizado}
                        <button
                            type="button"
                            className="rep-icon-btn"
                            onClick={recargar}
                            disabled={loading}
                            title="Actualizar"
                            aria-label="Actualizar"
                        >
                            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </span>
                </div>
            </div>

            {/* Periodo */}
            <div className="rep-controls">
                <div className="rep-seg">
                    {MODOS.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className={modo === m.id ? 'on' : ''}
                            onClick={() => aplicarPeriodo(m.id, fechaRef)}
                        >
                            {m.nombre}
                        </button>
                    ))}
                </div>

                <label className="rep-periodo">
                    <CalendarDays size={17} />
                    <span className="rep-periodo-label">Periodo:</span>
                    <b>{textoPeriodo(modo, filtros.fecha_inicio, filtros.fecha_fin)}</b>
                    <ChevronDown size={16} />

                    <input
                        type={modo === 'dia' || modo === 'semana' ? 'date' : 'month'}
                        value={modo === 'dia' || modo === 'semana' ? fechaRef : fechaRef.slice(0, 7)}
                        onChange={alCambiarPeriodo}
                        onClick={abrirSelector}
                        aria-label="Seleccionar periodo"
                    />
                </label>

                {(filtros.fecha_inicio || filtros.fecha_fin) && (
                    <button
                        type="button"
                        className="rep-link"
                        onClick={() => {
                            limpiarFiltros();
                            setModo(null);
                        }}
                    >
                        Ver todo el historial
                    </button>
                )}
            </div>

            {/* Tipo de reporte */}
            <div className="rep-tabs">
                {SECCIONES.map((s) => {
                    const Icono = s.icono;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            className={`rep-tab ${seccion === s.id ? 'on' : ''}`}
                            onClick={() => handleSeccion(s)}
                        >
                            <Icono size={16} />
                            {s.nombre}
                        </button>
                    );
                })}
            </div>

            {seccionActual.tipos.length > 1 && (
                <div className="rep-seg sm">
                    {seccionActual.tipos.map((t) => (
                        <button key={t} type="button" className={tipo === t ? 'on' : ''} onClick={() => setTipo(t)}>
                            {NOMBRE_TIPO[t]}
                        </button>
                    ))}
                </div>
            )}

            <p className="rep-note">
                Las fechas se aplican a ventas, compras, ingresos, gastos y movimientos. El inventario y los saldos
                pendientes muestran su estado actual.
            </p>

            {/* Error */}
            {error && (
                <div className="alert alert-error" role="alert">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* Carga inicial */}
            {loading && !reportes && !error && (
                <div className="rep-card rep-loading">
                    <RotateCw size={28} className="animate-spin" />
                    <p>Cargando reportes...</p>
                </div>
            )}

            {/* Contenido */}
            {reportes && !error && (
                <div className={`rep-body ${loading ? 'is-loading' : ''}`}>
                    <div className="rep-kpis">
                        {analisis.kpis.map((k) => {
                            const Icono = ICONOS_KPI[k.icono] || BarChart3;
                            return (
                                <div className="rep-kpi" key={k.titulo}>
                                    <div className={`rep-kpi-ic ${k.tono}`}>
                                        <Icono size={20} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <small>{k.titulo}</small>
                                        <b className={k.tono}>{k.valor}</b>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <ReportesGraficas grafica={analisis.grafica} ranking={analisis.ranking} />

                    <ReportesTablas tipo={tipo} filtros={filtros} onDatos={setDatos} />
                </div>
            )}
        </div>
    );
}

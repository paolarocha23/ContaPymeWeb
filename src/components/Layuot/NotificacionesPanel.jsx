import React, { useState } from 'react';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    Clock3,
    Package,
    RefreshCw,
    Wallet,
    ArrowRight
} from 'lucide-react';

export default function NotificacionesPanel({
    notificaciones = [],
    cargando = false,
    error = '',
    onActualizar,
    onNavigate
}) {
    const [filtro, setFiltro] = useState('todas'); // 'todas' | 'inventario' | 'cxc' | 'cxp'
    const total = notificaciones.length;

    const conteoInventario = notificaciones.filter((n) => n.categoria === 'inventario').length;
    const conteoCxc = notificaciones.filter((n) => n.categoria === 'cxc').length;
    const conteoCxp = notificaciones.filter((n) => n.categoria === 'cxp').length;

    const notificacionesFiltradas = notificaciones.filter((n) => {
        if (filtro === 'todas') return true;
        return n.categoria === filtro;
    });

    const obtenerIcono = (categoria) => {
        if (categoria === 'inventario') return <Package size={18} />;
        if (categoria === 'cxc') return <Clock3 size={18} />;
        if (categoria === 'cxp') return <Wallet size={18} />;
        return <Bell size={18} />;
    };

    const obtenerCategoriaTexto = (categoria) => {
        const nombres = {
            inventario: 'Inventario',
            cxc: 'Cuentas por Cobrar',
            cxp: 'Cuentas por Pagar'
        };
        return nombres[categoria] || 'General';
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return null;
        const fechaTexto = String(fecha).slice(0, 10);
        const partes = fechaTexto.split('-');
        if (partes.length !== 3) return fechaTexto;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const formatearMoneda = (cantidad) => {
        if (cantidad === null || cantidad === undefined) return null;
        return Number(cantidad).toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
    };

    const handleItemClick = (alerta) => {
        if (!onNavigate) return;
        if (alerta.categoria === 'inventario') {
            onNavigate('inventario');
        } else if (alerta.categoria === 'cxc') {
            onNavigate('cxc');
        } else if (alerta.categoria === 'cxp') {
            onNavigate('cxp');
        }
    };

    return (
        <section className="cpy-notificaciones-panel" aria-label="Panel de notificaciones">
            {/* Header */}
            <div className="cpy-notificaciones-header">
                <div>
                    <h3>Notificaciones y Alertas</h3>
                    <p>
                        {total === 1 ? '1 alerta requiere atención' : `${total} alertas requieren atención`}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onActualizar}
                    disabled={cargando}
                    aria-label="Actualizar notificaciones"
                    title="Actualizar notificaciones"
                >
                    <RefreshCw size={17} className={cargando ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Pestañas de filtrado (RDF1704) */}
            <div
                style={{
                    display: 'flex',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e4e8f5',
                    padding: '6px 12px',
                    gap: 6,
                    overflowX: 'auto'
                }}
            >
                <button
                    type="button"
                    onClick={() => setFiltro('todas')}
                    style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: filtro === 'todas' ? '#142a95' : 'transparent',
                        color: filtro === 'todas' ? '#fff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Todas ({total})
                </button>
                <button
                    type="button"
                    onClick={() => setFiltro('inventario')}
                    style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: filtro === 'inventario' ? '#142a95' : 'transparent',
                        color: filtro === 'inventario' ? '#fff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Inventario ({conteoInventario})
                </button>
                <button
                    type="button"
                    onClick={() => setFiltro('cxc')}
                    style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: filtro === 'cxc' ? '#142a95' : 'transparent',
                        color: filtro === 'cxc' ? '#fff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Cobros ({conteoCxc})
                </button>
                <button
                    type="button"
                    onClick={() => setFiltro('cxp')}
                    style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: filtro === 'cxp' ? '#142a95' : 'transparent',
                        color: filtro === 'cxp' ? '#fff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Pagos ({conteoCxp})
                </button>
            </div>

            {/* Lista de alertas */}
            <div className="cpy-notificaciones-lista">
                {cargando && (
                    <div className="cpy-notificaciones-estado">
                        <RefreshCw size={20} className="animate-spin" />
                        <p>Consultando notificaciones...</p>
                    </div>
                )}

                {!cargando && error && (
                    <div className="cpy-notificaciones-estado">
                        <AlertTriangle size={22} style={{ color: '#dc2626' }} />
                        <p>{error}</p>
                    </div>
                )}

                {!cargando && !error && notificacionesFiltradas.length === 0 && (
                    <div className="cpy-notificaciones-estado">
                        <CheckCircle2 size={26} style={{ color: '#16a34a' }} />
                        <p>No tienes alertas en esta categoría.</p>
                    </div>
                )}

                {!cargando &&
                    !error &&
                    notificacionesFiltradas.map((alerta) => (
                        <div
                            key={alerta.id || alerta.id_notificacion}
                            className={`cpy-notificacion-item prioridad-${alerta.prioridad}`}
                            onClick={() => handleItemClick(alerta)}
                            style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                            title={onNavigate ? `Ir al módulo de ${obtenerCategoriaTexto(alerta.categoria)}` : ''}
                        >
                            <div className="cpy-notificacion-icono">
                                {obtenerIcono(alerta.categoria)}
                            </div>

                            <div className="cpy-notificacion-contenido">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="cpy-notificacion-categoria">
                                        {obtenerCategoriaTexto(alerta.categoria)}
                                    </span>
                                    {alerta.fecha && (
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                            {formatearFecha(alerta.fecha)}
                                        </span>
                                    )}
                                </div>

                                <strong>{alerta.titulo}</strong>
                                <p>{alerta.mensaje}</p>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                                    {alerta.referencia && (
                                        <small style={{ color: '#3349b4', fontWeight: 600 }}>
                                            Ref: {alerta.referencia}
                                        </small>
                                    )}

                                    {alerta.fecha_vencimiento && (
                                        <small>
                                            Vence: {formatearFecha(alerta.fecha_vencimiento)}
                                        </small>
                                    )}

                                    {alerta.saldo_pendiente !== null && alerta.saldo_pendiente !== undefined && (
                                        <small style={{ color: '#0f1b4d', fontWeight: 600 }}>
                                            Saldo: {formatearMoneda(alerta.saldo_pendiente)}
                                        </small>
                                    )}
                                </div>
                            </div>

                            {onNavigate && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleItemClick(alerta);
                                    }}
                                    style={{
                                        border: 'none',
                                        background: '#e8ecfb',
                                        color: '#142a95',
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        alignSelf: 'center',
                                        marginLeft: 6,
                                        flexShrink: 0,
                                        transition: 'all 0.15s ease'
                                    }}
                                    title={`Ir al módulo de ${obtenerCategoriaTexto(alerta.categoria)}`}
                                    aria-label={`Ir al módulo de ${obtenerCategoriaTexto(alerta.categoria)}`}
                                >
                                    <ArrowRight size={15} />
                                </button>
                            )}
                        </div>
                    ))}
            </div>
        </section>
    );
}

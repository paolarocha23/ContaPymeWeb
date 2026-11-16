import React from 'react';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    Clock3,
    Package,
    RefreshCw,
    Wallet
} from 'lucide-react';

export default function NotificacionesPanel({
    notificaciones = [],
    cargando = false,
    error = '',
    onActualizar
}) {
    const total = notificaciones.length;

    const obtenerIcono = (categoria) => {
        if (categoria === 'inventario') {
            return <Package size={18} />;
        }

        if (categoria === 'cxc') {
            return <Clock3 size={18} />;
        }

        if (categoria === 'cxp') {
            return <Wallet size={18} />;
        }

        return <Bell size={18} />;
    };

    const obtenerCategoria = (categoria) => {
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
        if (cantidad === null || cantidad === undefined) {
            return null;
        }

        return Number(cantidad).toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN'
        });
    };

    return (
        <section
            className="cpy-notificaciones-panel"
            aria-label="Panel de notificaciones"
        >
            <div className="cpy-notificaciones-header">
                <div>
                    <h3>Notificaciones</h3>
                    <p>
                        {total === 1
                            ? '1 alerta disponible'
                            : `${total} alertas disponibles`}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onActualizar}
                    disabled={cargando}
                    aria-label="Actualizar notificaciones"
                    title="Actualizar notificaciones"
                >
                    <RefreshCw size={17} />
                </button>
            </div>

            <div className="cpy-notificaciones-lista">
                {cargando && (
                    <div className="cpy-notificaciones-estado">
                        <RefreshCw size={20} />
                        <p>Cargando notificaciones...</p>
                    </div>
                )}

                {!cargando && error && (
                    <div className="cpy-notificaciones-estado">
                        <AlertTriangle size={22} />
                        <p>{error}</p>
                    </div>
                )}

                {!cargando && !error && total === 0 && (
                    <div className="cpy-notificaciones-estado">
                        <CheckCircle2 size={25} />
                        <p>No tienes alertas pendientes.</p>
                    </div>
                )}

                {!cargando && !error && notificaciones.map((alerta) => (
                    <div
                        key={alerta.id}
                        className={`cpy-notificacion-item prioridad-${alerta.prioridad}`}
                    >
                        <div className="cpy-notificacion-icono">
                            {obtenerIcono(alerta.categoria)}
                        </div>

                        <div className="cpy-notificacion-contenido">
                            <span className="cpy-notificacion-categoria">
                                {obtenerCategoria(alerta.categoria)}
                            </span>

                            <strong>{alerta.titulo}</strong>

                            <p>{alerta.mensaje}</p>

                            {alerta.fecha_vencimiento && (
                                <small>
                                    Vencimiento: {formatearFecha(alerta.fecha_vencimiento)}
                                </small>
                            )}

                            {alerta.saldo_pendiente !== null &&
                                alerta.saldo_pendiente !== undefined && (
                                    <small>
                                        Saldo pendiente: {formatearMoneda(alerta.saldo_pendiente)}
                                    </small>
                                )}
                        </div>

                        {alerta.prioridad === 'alta' && (
                            <span
                                className="cpy-notificacion-prioridad"
                                title="Prioridad alta"
                            >
                                <AlertTriangle size={15} />
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

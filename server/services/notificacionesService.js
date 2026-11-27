import { stockBajo } from '../repositories/inventarioRepository.js';
import {
    obtenerAlertasCxc,
    obtenerAlertasCxp,
    obtenerRiesgoInventarioPreventivo,
    obtenerAlertasLiquidezPreventiva
} from '../repositories/notificacionesRepository.js';

const tienePermiso = (usuario, permiso) => {
    if (!usuario) return false;

    if (usuario.rol_nombre === 'Administrador') {
        return true;
    }

    const permisos = Array.isArray(usuario.permisos)
        ? usuario.permisos
        : [];

    return permisos.includes(permiso);
};

export async function obtenerNotificaciones(usuario, diasAnticipacion = 30) {
    if (!usuario) {
        throw new Error('Usuario no autenticado');
    }

    const nDias = diasAnticipacion ? parseInt(diasAnticipacion, 10) : 30;
    const puedeInventario = tienePermiso(usuario, 'inventario');
    const puedeCxc = tienePermiso(usuario, 'cxc');
    const puedeCxp = tienePermiso(usuario, 'cxp');
    const puedeCaja = tienePermiso(usuario, 'caja');

    const [productos, productosRiesgo, cobros, pagos, alertasLiquidez] = await Promise.all([
        puedeInventario ? stockBajo(usuario.empresa_id) : Promise.resolve([]),
        puedeInventario ? obtenerRiesgoInventarioPreventivo(usuario.empresa_id) : Promise.resolve([]),
        puedeCxc ? obtenerAlertasCxc(nDias, usuario.empresa_id) : Promise.resolve([]),
        puedeCxp ? obtenerAlertasCxp(nDias, usuario.empresa_id) : Promise.resolve([]),
        puedeCaja ? obtenerAlertasLiquidezPreventiva(usuario.empresa_id) : Promise.resolve([])
    ]);

    const hoy = new Date().toISOString().slice(0, 10);

    // 1. Alertas de Inventario: Críticas y Preventivas
    const notificacionesInventario = [
        ...productos.map((producto) => {
            const agotado = Number(producto.stock) <= 0;
            return {
                id: `inventario-${producto.id_producto}`,
                id_notificacion: `inventario-${producto.id_producto}`,
                categoria: 'inventario',
                tipo: 'inventario',
                subtipo: agotado ? 'agotado' : 'stock_bajo',
                prioridad: 'alta',
                es_preventiva: false,
                titulo: agotado
                    ? 'Producto agotado sin existencias'
                    : 'Stock mínimo alcanzado (Crítico)',
                mensaje: `${producto.nombre}: existencia actual ${producto.stock}, mínimo requerido ${producto.stock_minimo}. Requiere reabastecimiento inmediato.`,
                fecha: hoy,
                referencia: producto.codigo || `PROD-${producto.id_producto}`,
                id_referencia: producto.id_producto,
                fecha_vencimiento: null,
                saldo_pendiente: null
            };
        }),
        // Preventivas: Productos cercanos al stock mínimo
        ...productosRiesgo.map((p) => ({
            id: `inventario-prev-${p.id_producto}`,
            id_notificacion: `inventario-prev-${p.id_producto}`,
            categoria: 'inventario',
            tipo: 'preventiva',
            subtipo: 'riesgo_desabasto',
            prioridad: 'media',
            es_preventiva: true,
            titulo: 'Alerta preventiva: Riesgo de desabasto',
            mensaje: `${p.nombre}: existencia actual ${p.stock} unidades (margen de solo ${p.margen_unidades} sobre el mínimo de ${p.stock_minimo}). Planifica tu orden de compra antes de entrar en desabasto.`,
            fecha: hoy,
            referencia: p.codigo || `PROD-${p.id_producto}`,
            id_referencia: p.id_producto,
            fecha_vencimiento: null,
            saldo_pendiente: null
        }))
    ];

    // 2. Alertas de Cuentas por Cobrar (CxC): Vencidas y Preventivas
    const notificacionesCxc = cobros.map((cuenta) => {
        const saldoFmt = Number(cuenta.saldo_pendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        const dias = Number(cuenta.dias_restantes);
        const vencida = cuenta.tipo_alerta === 'vencida';
        const venceHoy = cuenta.tipo_alerta === 'vence_hoy';
        const esPreventiva = cuenta.tipo_alerta === 'preventiva';

        let titulo = 'Cobro próximo a vencer';
        let mensaje = `Cliente: ${cuenta.nombre_cliente}. Saldo: $${saldoFmt}. Vence en ${dias} días.`;
        let prioridad = 'baja';

        if (vencida) {
            titulo = 'Cobro de cliente vencido';
            prioridad = 'alta';
            mensaje = `Cliente: ${cuenta.nombre_cliente}. Saldo pendiente: $${saldoFmt} con fecha de vencimiento superada. Gestionar cobro de inmediato.`;
        } else if (venceHoy) {
            titulo = 'Cobro de cliente vence hoy';
            prioridad = 'alta';
            mensaje = `Cliente: ${cuenta.nombre_cliente}. Saldo pendiente: $${saldoFmt} vence hoy. Confirmar recepción del pago.`;
        } else if (esPreventiva) {
            titulo = 'Aviso preventivo de cobranza';
            prioridad = 'media';
            mensaje = `Cliente: ${cuenta.nombre_cliente}. Saldo: $${saldoFmt}. Vence en ${dias} días. Se recomienda enviar recordatorio preventivo de pago para evitar mora.`;
        }

        return {
            id: `cxc-${cuenta.id_cxc}`,
            id_notificacion: `cxc-${cuenta.id_cxc}`,
            categoria: 'cxc',
            tipo: esPreventiva ? 'preventiva' : 'cuentas por vencer',
            subtipo: cuenta.tipo_alerta,
            prioridad,
            es_preventiva: esPreventiva || venceHoy,
            titulo,
            mensaje,
            fecha: cuenta.fecha_vencimiento ? String(cuenta.fecha_vencimiento).slice(0, 10) : hoy,
            referencia: cuenta.codigo_venta || `CxC #${cuenta.id_cxc}`,
            id_referencia: cuenta.id_cxc,
            fecha_vencimiento: cuenta.fecha_vencimiento,
            saldo_pendiente: Number(cuenta.saldo_pendiente)
        };
    });

    // 3. Alertas de Cuentas por Pagar (CxP): Vencidas y Preventivas
    const notificacionesCxp = pagos.map((cuenta) => {
        const saldoFmt = Number(cuenta.saldo_pendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        const dias = Number(cuenta.dias_restantes);
        const vencida = cuenta.tipo_alerta === 'vencida';
        const venceHoy = cuenta.tipo_alerta === 'vence_hoy';
        const esPreventiva = cuenta.tipo_alerta === 'preventiva';

        let titulo = 'Pago a proveedor próximo';
        let mensaje = `Proveedor: ${cuenta.nombre_proveedor}. Saldo: $${saldoFmt}. Vence en ${dias} días.`;
        let prioridad = 'baja';

        if (vencida) {
            titulo = 'Pago a proveedor vencido';
            prioridad = 'alta';
            mensaje = `Proveedor: ${cuenta.nombre_proveedor}. Saldo pendiente: $${saldoFmt} vencido. Liquidar a la brevedad para conservar historial crediticio.`;
        } else if (venceHoy) {
            titulo = 'Pago a proveedor vence hoy';
            prioridad = 'alta';
            mensaje = `Proveedor: ${cuenta.nombre_proveedor}. Saldo: $${saldoFmt} vence hoy. Procesar pago para evitar penalizaciones.`;
        } else if (esPreventiva) {
            titulo = 'Programación preventiva de pago';
            prioridad = 'media';
            mensaje = `Proveedor: ${cuenta.nombre_proveedor}. Saldo: $${saldoFmt}. Vence en ${dias} días. Asegurar fondos o programar transferencia para evitar recargos.`;
        }

        return {
            id: `cxp-${cuenta.id_cxp}`,
            id_notificacion: `cxp-${cuenta.id_cxp}`,
            categoria: 'cxp',
            tipo: esPreventiva ? 'preventiva' : 'cuentas por vencer',
            subtipo: cuenta.tipo_alerta,
            prioridad,
            es_preventiva: esPreventiva || venceHoy,
            titulo,
            mensaje,
            fecha: cuenta.fecha_vencimiento ? String(cuenta.fecha_vencimiento).slice(0, 10) : hoy,
            referencia: cuenta.codigo_compra || `CxP #${cuenta.id_cxp}`,
            id_referencia: cuenta.id_cxp,
            fecha_vencimiento: cuenta.fecha_vencimiento,
            saldo_pendiente: Number(cuenta.saldo_pendiente)
        };
    });

    const notificaciones = [
        ...alertasLiquidez,
        ...notificacionesInventario,
        ...notificacionesCxc,
        ...notificacionesCxp
    ];

    const prioridadOrden = {
        alta: 0,
        media: 1,
        baja: 2
    };

    notificaciones.sort((a, b) => {
        const diffPrio = (prioridadOrden[a.prioridad] ?? 3) - (prioridadOrden[b.prioridad] ?? 3);
        if (diffPrio !== 0) return diffPrio;
        return (b.es_preventiva ? 1 : 0) - (a.es_preventiva ? 1 : 0);
    });

    const totalPreventivas = notificaciones.filter((n) => n.es_preventiva).length;

    return {
        total: notificaciones.length,
        dias_anticipacion: nDias,
        resumen: {
            total: notificaciones.length,
            preventivas: totalPreventivas,
            inventario: notificacionesInventario.length,
            cxc: notificacionesCxc.length,
            cxp: notificacionesCxp.length,
            caja: alertasLiquidez.length,
            alta: notificaciones.filter((n) => n.prioridad === 'alta').length,
            media: notificaciones.filter((n) => n.prioridad === 'media').length,
            baja: notificaciones.filter((n) => n.prioridad === 'baja').length
        },
        notificaciones
    };
}

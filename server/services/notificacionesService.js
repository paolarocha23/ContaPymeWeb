import { stockBajo } from '../repositories/inventarioRepository.js';
import {
    obtenerAlertasCxc,
    obtenerAlertasCxp
} from '../repositories/notificacionesRepository.js';

const DIAS_ANTICIPACION = 7;
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

    const [productos, cobros, pagos] = await Promise.all([
        puedeInventario ? stockBajo(usuario.empresa_id) : Promise.resolve([]),
        puedeCxc
            ? obtenerAlertasCxc(nDias, usuario.empresa_id)
            : Promise.resolve([]),
        puedeCxp
            ? obtenerAlertasCxp(nDias, usuario.empresa_id)
            : Promise.resolve([])
    ]);

    const hoy = new Date().toISOString().slice(0, 10);

    // RDF1701: Alerta de Bajo Inventario
    const notificacionesInventario = productos.map((producto) => ({
        id: `inventario-${producto.id_producto}`,
        id_notificacion: `inventario-${producto.id_producto}`,
        categoria: 'inventario',
        tipo: 'inventario',
        subtipo: Number(producto.stock) <= 0 ? 'agotado' : 'stock_bajo',
        prioridad: Number(producto.stock) <= 0 ? 'alta' : 'media',
        titulo: Number(producto.stock) <= 0
            ? 'Producto agotado sin existencias'
            : 'Existencia en stock bajo',
        mensaje: `${producto.nombre}: existencia actual ${producto.stock}, mínimo requerido ${producto.stock_minimo}.`,
        fecha: hoy,
        referencia: producto.codigo || `PROD-${producto.id_producto}`,
        id_referencia: producto.id_producto,
        fecha_vencimiento: null,
        saldo_pendiente: null
    }));

    // RDF1702: Alerta de Cuentas por Cobrar
    const notificacionesCxc = cobros.map((cuenta) => ({
        id: `cxc-${cuenta.id_cxc}`,
        id_notificacion: `cxc-${cuenta.id_cxc}`,
        categoria: 'cxc',
        tipo: 'cuentas por vencer',
        subtipo: cuenta.tipo_alerta,
        prioridad: cuenta.tipo_alerta === 'vencida' ? 'alta' : 'media',
        titulo: cuenta.tipo_alerta === 'vencida'
            ? 'Cobro de cliente vencido'
            : 'Cobro de cliente próximo a vencer',
        mensaje: `Cliente: ${cuenta.nombre_cliente}. Saldo pendiente: $${Number(cuenta.saldo_pendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
        fecha: cuenta.fecha_vencimiento ? String(cuenta.fecha_vencimiento).slice(0, 10) : hoy,
        referencia: cuenta.codigo_venta || `CxC #${cuenta.id_cxc}`,
        id_referencia: cuenta.id_cxc,
        fecha_vencimiento: cuenta.fecha_vencimiento,
        saldo_pendiente: Number(cuenta.saldo_pendiente)
    }));

    // RDF1703: Alerta de Cuentas por Pagar
    const notificacionesCxp = pagos.map((cuenta) => ({
        id: `cxp-${cuenta.id_cxp}`,
        id_notificacion: `cxp-${cuenta.id_cxp}`,
        categoria: 'cxp',
        tipo: 'cuentas por vencer',
        subtipo: cuenta.tipo_alerta,
        prioridad: cuenta.tipo_alerta === 'vencida' ? 'alta' : 'media',
        titulo: cuenta.tipo_alerta === 'vencida'
            ? 'Pago a proveedor vencido'
            : 'Pago a proveedor próximo a vencer',
        mensaje: `Proveedor: ${cuenta.nombre_proveedor}. Saldo pendiente: $${Number(cuenta.saldo_pendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
        fecha: cuenta.fecha_vencimiento ? String(cuenta.fecha_vencimiento).slice(0, 10) : hoy,
        referencia: cuenta.codigo_compra || `CxP #${cuenta.id_cxp}`,
        id_referencia: cuenta.id_cxp,
        fecha_vencimiento: cuenta.fecha_vencimiento,
        saldo_pendiente: Number(cuenta.saldo_pendiente)
    }));

    const notificaciones = [
        ...notificacionesInventario,
        ...notificacionesCxc,
        ...notificacionesCxp
    ];

    const prioridadOrden = {
        alta: 0,
        media: 1
    };

    notificaciones.sort((a, b) => {
        return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];
    });

    return {
        total: notificaciones.length,
        dias_anticipacion: nDias,
        resumen: {
            inventario: notificacionesInventario.length,
            cxc: notificacionesCxc.length,
            cxp: notificacionesCxp.length,
            alta: notificaciones.filter((n) => n.prioridad === 'alta').length,
            media: notificaciones.filter((n) => n.prioridad === 'media').length
        },
        notificaciones
    };
}

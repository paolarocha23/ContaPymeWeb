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

export async function obtenerNotificaciones(usuario) {
    if (!usuario) {
        throw new Error('Usuario no autenticado');
    }

    const puedeInventario = tienePermiso(usuario, 'inventario');
    const puedeCxc = tienePermiso(usuario, 'cxc');
    const puedeCxp = tienePermiso(usuario, 'cxp');

    const [productos, cobros, pagos] = await Promise.all([
        puedeInventario ? stockBajo(usuario.empresa_id) : Promise.resolve([]),
        puedeCxc
            ? obtenerAlertasCxc(DIAS_ANTICIPACION, usuario.empresa_id)
            : Promise.resolve([]),
        puedeCxp
            ? obtenerAlertasCxp(DIAS_ANTICIPACION, usuario.empresa_id)
            : Promise.resolve([])
    ]);

    const notificacionesInventario = productos.map((producto) => ({
        id: `inventario-${producto.id_producto}`,
        categoria: 'inventario',
        tipo: 'stock_bajo',
        prioridad: Number(producto.stock) <= 0 ? 'alta' : 'media',
        titulo: Number(producto.stock) <= 0
            ? 'Producto sin existencias'
            : 'Stock bajo',
        mensaje: `${producto.nombre}: stock actual ${producto.stock}, mínimo ${producto.stock_minimo}.`,
        referencia: producto.codigo,
        id_referencia: producto.id_producto,
        fecha_vencimiento: null,
        saldo_pendiente: null
    }));

    const notificacionesCxc = cobros.map((cuenta) => ({
        id: `cxc-${cuenta.id_cxc}`,
        categoria: 'cxc',
        tipo: cuenta.tipo_alerta,
        prioridad: cuenta.tipo_alerta === 'vencida' ? 'alta' : 'media',
        titulo: cuenta.tipo_alerta === 'vencida'
            ? 'Cobro vencido'
            : 'Cobro próximo a vencer',
        mensaje: `Cliente: ${cuenta.nombre_cliente}.`,
        referencia: cuenta.codigo_venta,
        id_referencia: cuenta.id_cxc,
        fecha_vencimiento: cuenta.fecha_vencimiento,
        saldo_pendiente: Number(cuenta.saldo_pendiente)
    }));

    const notificacionesCxp = pagos.map((cuenta) => ({
        id: `cxp-${cuenta.id_cxp}`,
        categoria: 'cxp',
        tipo: cuenta.tipo_alerta,
        prioridad: cuenta.tipo_alerta === 'vencida' ? 'alta' : 'media',
        titulo: cuenta.tipo_alerta === 'vencida'
            ? 'Pago vencido'
            : 'Pago próximo a vencer',
        mensaje: `Proveedor: ${cuenta.nombre_proveedor}.`,
        referencia: cuenta.codigo_compra,
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

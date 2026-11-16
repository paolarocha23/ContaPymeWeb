import {
    obtenerNotificaciones
} from '../services/notificacionesService.js';

export async function obtenerNotificacionesController(req, res) {
    const resultado = await obtenerNotificaciones(req.user);

    return res.status(200).json({
        success: true,
        message: 'Notificaciones obtenidas correctamente',
        data: resultado
    });
}

import {
    obtenerNotificaciones
} from '../services/notificacionesService.js';

export async function obtenerNotificacionesController(req, res) {
    const dias = req.query.dias ? parseInt(req.query.dias, 10) : 30;
    const resultado = await obtenerNotificaciones(req.user, dias);

    return res.status(200).json({
        success: true,
        message: 'Notificaciones obtenidas correctamente',
        data: resultado
    });
}

import * as clienteService from '../services/clienteService.js';
import { asyncHandler } from '../utils/http.js';
import { registrarBitacora } from '../utils/bitacora.js';

//Esta función registra las acciones realizadas por el usuario que inició sesión.
const auditar = (req, accion, detalle) =>
  registrarBitacora(req, {
    id_usuario: req.user.id_usuario,
    nombre_usuario: req.user.nombre_usuario,
    accion,
    detalle
  });

//Obtiene la lista de clientes.
export const getClientes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await clienteService.listar(req.query) });
});

//Obtiene las estadísticas(aparecen en las cards) generales del catálogo de clientes.
export const getStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await clienteService.estadisticas() });
});

//Obtiene las opciones disponibles para los filtros del catálogo.
export const getOpciones = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await clienteService.opciones() });
});

//Obtiene la información de un cliente específico.
export const getClienteById = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await clienteService.obtener(req.params.id) });
});

//Obtiene el historial de operaciones de un cliente.
export const getHistorial = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await clienteService.historial(req.params.id) });
});

//Registra un nuevo cliente.
export const createCliente = asyncHandler(async (req, res) => {
  const cliente = await clienteService.crear(req.body);
  await auditar(req, 'CREACION_CLIENTE',
    `Se registró al cliente "${cliente.nombre_completo}" (ID: ${cliente.id_cliente})`);
  res.status(201).json({
    success: true,
    message: 'Cliente registrado exitosamente con estatus activo.',
    data: cliente
  });
});

//Modifica la información de un cliente existente.
export const updateCliente = asyncHandler(async (req, res) => {
  const { cliente } = await clienteService.actualizar(req.params.id, req.body);
  await auditar(req, 'MODIFICACION_CLIENTE',
    `Se modificaron los datos del cliente "${cliente.nombre_completo}" (ID: ${cliente.id_cliente})`);
  res.json({ success: true, message: 'Cliente actualizado correctamente.', data: cliente });
});

//Esta función permite activar o desactivar un cliente.
export const toggleClienteStatus = asyncHandler(async (req, res) => {
  const { cliente, cambio } = await clienteService.cambiarEstatus(req.params.id, req.body);
  const activo = Number(cliente.estatus) === 1;

  if (cambio) {
    await auditar(
      req,
      activo ? 'ACTIVACION_CLIENTE' : 'DESACTIVACION_CLIENTE',
      activo
        ? `Se reactivó al cliente "${cliente.nombre_completo}" (ID: ${cliente.id_cliente})`
        : `Se desactivó al cliente "${cliente.nombre_completo}" (ID: ${cliente.id_cliente}). Ya no podrá seleccionarse en nuevas ventas.`
    );
  }

  res.json({
    success: true,
    message: !cambio
      ? `El cliente ya estaba ${activo ? 'activo' : 'inactivo'}.`
      : activo ? 'Cliente activado exitosamente.' : 'Cliente desactivado. Se conserva su historial.',
    estatus: Number(cliente.estatus)
  });
});

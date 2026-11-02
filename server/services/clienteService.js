import * as repo from '../repositories/clienteRepository.js';
import { AppError } from '../utils/http.js';
import {
  validarCliente, validarEstatus, parseId, normalizarFiltros
} from '../validators/clienteValidator.js';

async function obtenerOFallar(idParam) {
  const id = parseId(idParam);
  const cliente = await repo.findById(id);
  if (!cliente) throw new AppError('Cliente no encontrado.', 404);
  return cliente;
}

export const listar = (query) => repo.list(normalizarFiltros(query));
export const obtener = (id) => obtenerOFallar(id);
export const estadisticas = () => repo.stats();
export const opciones = () => repo.opciones();

export async function historial(idParam) {
  const cliente = await obtenerOFallar(idParam);
  const { ventas, cobros } = await repo.historial(cliente.id_cliente);

  const totalVentas = ventas
    .filter((v) => v.estatus !== 'cancelada')
    .reduce((s, v) => s + Number(v.total), 0);
  const totalCobrado = cobros.reduce((s, c) => s + Number(c.monto), 0);

  return {
    ventas,
    cobros,
    resumen: {
      total_ventas: totalVentas,
      total_cobrado: totalCobrado,
      saldo_pendiente: totalVentas - totalCobrado
    }
  };
}

/** RDF0401: el estatus inicial siempre es activo. */
export async function crear(body) {
  return repo.insert(validarCliente(body));
}

/** RDF0403: se actualizan los datos, nunca el identificador. */
export async function actualizar(idParam, body) {
  const actual = await obtenerOFallar(idParam);
  const datos = validarCliente(body);
  const cliente = await repo.update(actual.id_cliente, datos);
  return { anterior: actual, cliente };
}

/** RDF0402: activar/desactivar conserva todo el historial. */
export async function cambiarEstatus(idParam, body) {
  const actual = await obtenerOFallar(idParam);
  const estatus = validarEstatus(body);
  if (Number(actual.estatus) === estatus) return { cliente: actual, cambio: false };
  await repo.updateStatus(actual.id_cliente, estatus);
  return { cliente: { ...actual, estatus }, cambio: true };
}

/**
 * Para el módulo de Ventas: un cliente inactivo no puede seleccionarse en nuevas ventas.
 * Uso:  const cliente = await obtenerClienteActivo(id_cliente);
 */
export async function obtenerClienteActivo(idParam) {
  const cliente = await obtenerOFallar(idParam);
  if (Number(cliente.estatus) !== 1) {
    throw new AppError(`El cliente "${cliente.nombre_completo}" está inactivo y no puede usarse en nuevas ventas.`, 400);
  }
  return cliente;
}
import {
  obtenerMovimientosCaja,
  obtenerMovimientoCajaPorId,
  registrarMovimientoManual,
  obtenerResumenCaja
} from '../repositories/cajaRepository.js';

// Validar filtros de consulta
function validarFiltros(filtros) {
  const { fecha_inicio, fecha_fin, tipo } = filtros;

  if (fecha_inicio && Number.isNaN(Date.parse(fecha_inicio))) {
    throw new Error('La fecha inicial no es válida');
  }

  if (fecha_fin && Number.isNaN(Date.parse(fecha_fin))) {
    throw new Error('La fecha final no es válida');
  }

  if (
    fecha_inicio &&
    fecha_fin &&
    new Date(fecha_inicio) > new Date(fecha_fin)
  ) {
    throw new Error('La fecha inicial no puede ser posterior a la final');
  }

  if (tipo && !['entrada', 'salida'].includes(tipo)) {
    throw new Error('El tipo de movimiento no es válido');
  }
}

// Validar los datos de un movimiento manual
function validarMovimiento(datos) {
  const { concepto, tipo, monto, fecha } = datos;

  if (!concepto || !concepto.trim()) {
    throw new Error('El concepto es obligatorio');
  }

  if (concepto.trim().length > 255) {
    throw new Error('El concepto no puede superar los 255 caracteres');
  }

  if (!['entrada', 'salida'].includes(tipo)) {
    throw new Error('Selecciona entrada o salida');
  }

  if (
    monto === undefined ||
    monto === null ||
    monto === '' ||
    !Number.isFinite(Number(monto)) ||
    Number(monto) <= 0
  ) {
    throw new Error('El monto debe ser mayor que cero');
  }

  if (fecha && Number.isNaN(Date.parse(fecha))) {
    throw new Error('La fecha del movimiento no es válida');
  }
}

// Consultar movimientos
export async function listarMovimientosCaja(filtros = {}) {
  validarFiltros(filtros);
  return await obtenerMovimientosCaja(filtros);
}

// Consultar un movimiento
export async function consultarMovimientoCaja(id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new Error('El identificador del movimiento no es válido');
  }

  const movimiento = await obtenerMovimientoCajaPorId(id);

  if (!movimiento) {
    throw new Error('El movimiento solicitado no existe');
  }

  return movimiento;
}

// Registrar entrada o salida manual
export async function crearMovimientoCaja(datos, id_usuario) {
  validarMovimiento(datos);

  if (!id_usuario) {
    throw new Error('No se pudo identificar al usuario');
  }

  return await registrarMovimientoManual({
    ...datos,
    concepto: datos.concepto.trim(),
    monto: Number(datos.monto),
    id_usuario
  });
}

// Consultar resumen
export async function consultarResumenCaja(filtros = {}) {
  validarFiltros(filtros);
  return await obtenerResumenCaja(filtros);
}

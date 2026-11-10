import {
  obtenerGastos,
  obtenerGastoPorId,
  obtenerCategoriasGastos,
  registrarGasto,
  actualizarGasto,
  cancelarGasto,
  obtenerResumenGastos
} from '../repositories/gastosRepository.js';

function validarGasto(datos) {
  const {
    concepto,
    id_categoria,
    monto,
    forma_pago,
    fecha
  } = datos;

  if (!concepto || !concepto.trim()) {
    throw new Error('El concepto del gasto es obligatorio');
  }

  if (concepto.trim().length > 255) {
    throw new Error('El concepto no puede superar los 255 caracteres');
  }

  if (!id_categoria || !Number.isInteger(Number(id_categoria))) {
    throw new Error('Selecciona una categoría válida');
  }

  if (monto === undefined || monto === null || monto === '' ||
      !Number.isFinite(Number(monto)) || Number(monto) <= 0) {
    throw new Error('El monto debe ser mayor que cero');
  }

  const formasPermitidas = ['efectivo', 'tarjeta', 'transfer'];

  if (!formasPermitidas.includes(forma_pago)) {
    throw new Error('La forma de pago no es válida');
  }

  if (fecha && Number.isNaN(Date.parse(fecha))) {
    throw new Error('La fecha del gasto no es válida');
  }
}

export async function listarGastos(filtros) {
  return await obtenerGastos(filtros);
}

export async function consultarGasto(id) {
  const gasto = await obtenerGastoPorId(id);

  if (!gasto) {
    throw new Error('El gasto solicitado no existe');
  }

  return gasto;
}

export async function listarCategoriasGastos() {
  return await obtenerCategoriasGastos();
}

export async function crearGasto(datos, id_usuario) {
  validarGasto(datos);

  return await registrarGasto({
    ...datos,
    concepto: datos.concepto.trim(),
    id_usuario
  });
}

export async function modificarGasto(id, datos) {
  validarGasto(datos);

  const gasto = await actualizarGasto(id, {
    ...datos,
    concepto: datos.concepto.trim()
  });

  if (!gasto) {
    throw new Error('No se encontró el gasto o ya está cancelado');
  }

  return gasto;
}

export async function darDeBajaGasto(id) {
  const gasto = await cancelarGasto(id);

  if (!gasto) {
    throw new Error('No se encontró el gasto o ya está cancelado');
  }

  return gasto;
}

export async function consultarResumenGastos() {
  return await obtenerResumenGastos();
}
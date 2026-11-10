import {
  listarGastos,
  consultarGasto,
  listarCategoriasGastos,
  crearGasto,
  modificarGasto,
  darDeBajaGasto,
  consultarResumenGastos
} from '../services/gastosService.js';

export async function obtenerGastos(req, res) {
  const gastos = await listarGastos(req.query);

  res.json({
    success: true,
    message: 'Gastos consultados correctamente',
    data: gastos
  });
}

export async function obtenerGasto(req, res) {
  const gasto = await consultarGasto(Number(req.params.id));

  res.json({
    success: true,
    message: 'Gasto consultado correctamente',
    data: gasto
  });
}

export async function obtenerCategorias(req, res) {
  const categorias = await listarCategoriasGastos();

  res.json({
    success: true,
    message: 'Categorías consultadas correctamente',
    data: categorias
  });
}

export async function registrarGastoController(req, res) {
  const gasto = await crearGasto(req.body, req.user.id_usuario);

  res.status(201).json({
    success: true,
    message: 'Gasto registrado correctamente',
    data: gasto
  });
}

export async function actualizarGastoController(req, res) {
  const gasto = await modificarGasto(
    Number(req.params.id),
    req.body
  );

  res.json({
    success: true,
    message: 'Gasto actualizado correctamente',
    data: gasto
  });
}

export async function cancelarGastoController(req, res) {
  const gasto = await darDeBajaGasto(Number(req.params.id));

  res.json({
    success: true,
    message: 'Gasto cancelado correctamente',
    data: gasto
  });
}

export async function obtenerResumen(req, res) {
  const resumen = await consultarResumenGastos();

  res.json({
    success: true,
    message: 'Resumen de gastos consultado correctamente',
    data: resumen
  });
}
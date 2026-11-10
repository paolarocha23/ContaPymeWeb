import * as repo from '../repositories/inventarioRepository.js';
import * as productoRepo from '../repositories/productoRepository.js';
import { AppError } from '../utils/http.js';

import {
  validarMovimiento,
  normalizarFiltrosExistencias,
  normalizarFiltrosMovimientos
} from '../validators/inventarioValidator.js';

import { parseId } from '../validators/productoValidator.js';

// Valores de movimientos_inventario.origen para movimientos hechos desde esta pantalla.
// Compras, ventas y devoluciones usarán sus propios orígenes desde sus módulos.
const ORIGEN_MANUAL = 'manual';
const ORIGEN_AJUSTE = 'ajuste';

const MAX_EXISTENCIA = 999999999;

async function obtenerExistenciaOFallar(idParam) {
  const id = parseId(idParam);
  const producto = await repo.findExistencia(id);

  if (!producto) throw new AppError('Producto no encontrado.', 404);

  if (String(producto.tipo).toLowerCase() !== 'producto') {
    throw new AppError('Este registro es un servicio y no maneja inventario.', 400);
  }

  return producto;
}

export const listar = (query) => repo.listarExistencias(normalizarFiltrosExistencias(query));

export const estadisticas = () => repo.stats();

export const productosStockBajo = () => repo.stockBajo();

export const listarCategorias = () => productoRepo.categoriasActivas();

export async function movimientos(query) {
  const filtros = normalizarFiltrosMovimientos(query);
  const { total, items } = await repo.listarMovimientos(filtros);

  return { total, pagina: filtros.pagina, limite: filtros.limite, items };
}

// Detalle de existencia + últimos movimientos del producto
export async function obtener(idParam) {
  const producto = await obtenerExistenciaOFallar(idParam);
  const { items } = await repo.listarMovimientos({
    id_producto: producto.id_producto, limite: 20, pagina: 1
  });

  return { ...producto, movimientos: items };
}

/**
 * Núcleo de RDF0801 / RDF0802 / RDF0803.
 * Bloquea el producto, calcula la nueva existencia, valida (RDF0805),
 * actualiza el stock y deja el movimiento, todo en una sola transacción.
 */
async function registrarMovimiento(tipo, body, id_usuario) {
  const datos = validarMovimiento(body, tipo);

  const { anterior, movimiento } = await repo.conTransaccion(async (client) => {
    const producto = await repo.bloquearProducto(client, datos.id_producto);

    if (!producto) throw new AppError('Producto no encontrado.', 404);

    if (String(producto.tipo).toLowerCase() !== 'producto') {
      throw new AppError('Este registro es un servicio y no maneja inventario.', 400);
    }

    if (Number(producto.estatus) !== 1) {
      throw new AppError('El producto está inactivo. Actívalo para registrar movimientos.', 409);
    }

    const antes = Number(producto.stock ?? 0);
    let despues;
    let cantidadMovimiento = datos.cantidad;

    if (tipo === 'entrada') {
      despues = antes + datos.cantidad;
    } else if (tipo === 'salida') {
      // RDF0805: nunca dejar la existencia en negativo
      if (datos.cantidad > antes) {
        throw new AppError(
          `Existencia insuficiente. Disponible: ${antes} ${String(producto.unidad_medida ?? '').toLowerCase()}`.trim(),
          409,
          { code: 'STOCK_INSUFICIENTE', disponible: antes }
        );
      }
      despues = antes - datos.cantidad;
    } else {
      // ajuste: se captura la existencia real; el movimiento guarda la diferencia absoluta
      despues = datos.cantidad;
      cantidadMovimiento = Math.abs(despues - antes);

      if (cantidadMovimiento === 0) {
        throw new AppError('La existencia indicada es igual a la actual; no hay nada que ajustar.', 400);
      }
    }

    if (despues > MAX_EXISTENCIA) {
      throw new AppError('La existencia resultante excede el máximo permitido.', 400);
    }

    await repo.actualizarStock(client, producto.id_producto, despues);

    const mov = await repo.insertarMovimiento(client, {
      id_producto: producto.id_producto,
      tipo_movimiento: tipo,
      cantidad: cantidadMovimiento,
      existencia_antes: antes,
      existencia_despues: despues,
      motivo: datos.motivo,
      origen: tipo === 'ajuste' ? ORIGEN_AJUSTE : ORIGEN_MANUAL,
      id_usuario
    });

    return {
      anterior: { ...producto, stock: antes },
      movimiento: {
        id_movimiento: mov.id_movimiento,
        fecha: mov.fecha,
        tipo_movimiento: tipo,
        cantidad: cantidadMovimiento,
        existencia_antes: antes,
        existencia_despues: despues,
        motivo: datos.motivo
      }
    };
  });

  const producto = await repo.findExistencia(anterior.id_producto);

  return { anterior, producto, movimiento };
}

export const registrarEntrada = (body, idUsuario) => registrarMovimiento('entrada', body, idUsuario);
export const registrarSalida = (body, idUsuario) => registrarMovimiento('salida', body, idUsuario);
export const registrarAjuste = (body, idUsuario) => registrarMovimiento('ajuste', body, idUsuario);
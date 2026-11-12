import * as repo from '../repositories/ingresoRepository.js';
import * as categoriaService from './categoriaService.js';
import { AppError } from '../utils/http.js';

import {
  validarIngreso,
  normalizarFiltros,
  validarMotivo,
  parseId
} from '../validators/ingresoValidator.js';

const corto = (t) => String(t).slice(0, 255);

// Solo el efectivo afecta caja (RF13)
const afectaCaja = (forma) => forma === 'efectivo';

export const moneda = (n) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

async function obtenerOFallar(idParam) {
  const id = parseId(idParam);
  const ingreso = await repo.findById(id);

  if (!ingreso) throw new AppError('Ingreso no encontrado.', 404);

  return ingreso;
}

function movimientoCaja(client, { tipo, prefijo, concepto, monto, id_ingreso, id_usuario, fecha = null }) {
  return repo.insertarMovimientoCaja(client, {
    tipo,
    concepto: corto(`${prefijo}: ${concepto}`),
    monto,
    id_referencia: id_ingreso,
    id_usuario,
    fecha
  });
}

/**
 * Inserta el ingreso y, si es en efectivo, su entrada de caja (RDF1304).
 * Recibe el client para ejecutarse dentro de la transacción de quien lo llame.
 */
async function insertarConCaja(client, d) {
  const ingreso = await repo.insert(client, d);

  if (afectaCaja(d.forma_pago)) {
    await movimientoCaja(client, {
      tipo: 'entrada',
      prefijo: 'Ingreso',
      concepto: d.concepto,
      monto: d.monto,
      id_ingreso: ingreso.id_ingreso,
      id_usuario: d.id_usuario,
      fecha: ingreso.fecha
    });
  }

  return ingreso.id_ingreso;
}

/**
 * Marca como cancelado y revierte su entrada de caja si aplica (RDF1105).
 */
async function cancelarConCaja(client, ingreso, id_usuario) {
  await repo.marcarCancelado(client, ingreso.id_ingreso);

  if (afectaCaja(ingreso.forma_pago)) {
    await movimientoCaja(client, {
      tipo: 'salida',
      prefijo: 'Cancelación de ingreso',
      concepto: ingreso.concepto,
      monto: ingreso.monto,
      id_ingreso: ingreso.id_ingreso,
      id_usuario
    });
  }
}

export const listar = (query) => repo.list(normalizarFiltros(query));

export const estadisticas = () => repo.stats();

export const listarCategorias = () => repo.categorias();

// RDF1103 + RDF1104: detalle con la venta relacionada y su historial de caja
export async function obtener(idParam) {
  const ingreso = await obtenerOFallar(idParam);

  const [venta, movimientos_caja] = await Promise.all([
    repo.ventaRelacionada(ingreso),
    repo.movimientosCaja(ingreso.id_ingreso)
  ]);

  const ingresos_venta = venta ? await repo.ingresosDeVenta(venta.id_venta) : [];

  return { ...ingreso, venta, ingresos_venta, movimientos_caja };
}

// RDF1101 – ingreso manual (origen "otro"), nace activo
export async function crear(body, idUsuario) {
  const datos = validarIngreso(body);

  await categoriaService.obtenerCategoriaActiva(datos.id_categoria);

  const id = await repo.conTransaccion((client) =>
    insertarConCaja(client, { ...datos, id_usuario: idUsuario })
  );

  return repo.findById(id);
}

// RDF1102 – solo ingresos manuales y activos; el origen, el usuario y el estatus no se modifican
export async function actualizar(idParam, body, idUsuario) {
  const id = parseId(idParam);
  const datos = validarIngreso(body);

  const anterior = await repo.conTransaccion(async (client) => {
    const actual = await repo.bloquear(client, id);

    if (!actual) throw new AppError('Ingreso no encontrado.', 404);

    if (actual.origen !== 'otro') {
      throw new AppError(
        'Los ingresos generados por ventas o cobros no se modifican. Cancela la operación de origen para corregirlos.',
        409,
        { code: 'INGRESO_AUTOMATICO' }
      );
    }

    if (actual.estatus !== 'activo') {
      throw new AppError('Un ingreso cancelado no puede modificarse.', 409, { code: 'INGRESO_CANCELADO' });
    }

    // Solo se exige categoría activa si la están cambiando.
    if (datos.id_categoria !== Number(actual.id_categoria)) {
      await categoriaService.obtenerCategoriaActiva(datos.id_categoria);
    }

    await repo.update(client, id, datos);

    // Si cambió el monto o la forma de pago se corrige la caja sin borrar historial:
    // reversa del efecto anterior + nueva entrada si el nuevo pago es en efectivo.
    const cambioCaja = Number(actual.monto) !== datos.monto || actual.forma_pago !== datos.forma_pago;

    if (cambioCaja) {
      if (afectaCaja(actual.forma_pago)) {
        await movimientoCaja(client, {
          tipo: 'salida',
          prefijo: 'Corrección de ingreso (reversa)',
          concepto: actual.concepto,
          monto: actual.monto,
          id_ingreso: id,
          id_usuario: idUsuario
        });
      }

      if (afectaCaja(datos.forma_pago)) {
        await movimientoCaja(client, {
          tipo: 'entrada',
          prefijo: 'Corrección de ingreso',
          concepto: datos.concepto,
          monto: datos.monto,
          id_ingreso: id,
          id_usuario: idUsuario
        });
      }
    }

    return actual;
  });

  const ingreso = await repo.findById(id);

  return { anterior, ingreso };
}

// RDF1105 – cancelar conserva el registro y revierte la caja.
// Los de venta o cobro se cancelan al cancelar la operación de origen.
export async function cancelar(idParam, body, idUsuario) {
  const id = parseId(idParam);
  const motivo = validarMotivo(body);

  await repo.conTransaccion(async (client) => {
    const actual = await repo.bloquear(client, id);

    if (!actual) throw new AppError('Ingreso no encontrado.', 404);

    if (actual.estatus === 'cancelado') {
      throw new AppError('El ingreso ya está cancelado.', 409, { code: 'INGRESO_CANCELADO' });
    }

    if (actual.origen !== 'otro') {
      throw new AppError(
        'Este ingreso proviene de una venta o cobro. Para corregirlo cancela la operación de origen.',
        409,
        { code: 'INGRESO_AUTOMATICO' }
      );
    }

    await cancelarConCaja(client, actual, idUsuario);
  });

  return { ingreso: await repo.findById(id), motivo };
}

/* ------------------------------------------------------------------
 * Integración con otros módulos (no tienen ruta propia).
 * Se llaman desde Ventas y Cobros DENTRO de su transacción (NF05),
 * pasando el mismo client, para que todo se guarde o se revierta junto.
 * ------------------------------------------------------------------ */

// RDF0905 / RDF1402 / RDF1104 – ingreso generado por una venta o por un cobro
export async function registrarAutomatico(client, d) {
  if (!['venta', 'cobro'].includes(d.origen)) {
    throw new AppError('El origen automático debe ser venta o cobro.', 400);
  }
  if (d.origen === 'venta' && !d.id_venta) throw new AppError('El ingreso por venta requiere id_venta.', 400);
  if (d.origen === 'cobro' && !d.id_cobro) throw new AppError('El ingreso por cobro requiere id_cobro.', 400);

  const base = validarIngreso({
    concepto: d.concepto,
    id_categoria: d.id_categoria,
    monto: d.monto,
    forma_pago: d.forma_pago,
    fecha: d.fecha
  });

  await categoriaService.obtenerCategoriaActiva(base.id_categoria);

  return insertarConCaja(client, {
    ...base,
    origen: d.origen,
    id_venta: d.id_venta ?? null,
    id_cobro: d.id_cobro ?? null,
    id_usuario: d.id_usuario
  });
}

// RDF0902 – al cancelar una venta se cancelan sus ingresos (y los de sus cobros) y se revierte la caja
export async function cancelarPorOrigen(client, { id_venta = null, ids_cobro = [], id_usuario }) {
  const ingresos = await repo.activosPorOrigen(client, id_venta, ids_cobro);

  for (const ingreso of ingresos) {
    await cancelarConCaja(client, ingreso, id_usuario);
  }

  return ingresos.length;
}